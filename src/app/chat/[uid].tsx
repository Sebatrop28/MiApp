import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/feedback/banner';
import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/ui/themed-text';
import { MaxContentWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useChat, type ConnectionState } from '@/context/chat-context';
import { useFriends } from '@/context/friends-context';
import { useAppTheme } from '@/hooks/use-theme';
import { MAX_MESSAGE_LENGTH } from '@/services/chat-protocol';
import type { ChatMessage } from '@/services/chat-storage';
import { toFriendsErrorMessage, type Friend } from '@/services/friends';
import { formatNoteDate } from '@/utils/date';

/** Mientras la pantalla está abierta se reintenta conectar cada cierto tiempo. */
const RECONNECT_INTERVAL_MS = 15_000;

export default function ChatScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { colors } = useAppTheme();
  const { friends, status } = useFriends();
  const friend = friends.find((f) => f.profile.uid === uid);

  if (!friend) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Chat' }} />
        <ThemedText color="textSecondary">
          {status === 'loading' ? 'Cargando…' : 'Esta persona ya no está en tu lista de amigos.'}
        </ThemedText>
      </View>
    );
  }

  return <Conversation friend={friend} />;
}

const STATUS_TEXT: Record<ConnectionState, string> = {
  open: 'Conectado: los mensajes van directo a su teléfono',
  connecting: 'Conectando… tu amigo debe tener la app abierta',
  idle: 'Sin conexión: los mensajes se enviarán al conectar',
};

function Conversation({ friend }: { friend: Friend }) {
  const uid = friend.profile.uid;
  const router = useRouter();
  const { colors } = useAppTheme();
  const headerHeight = useHeaderHeight();
  const { user } = useAuth();
  const { removeFriend } = useFriends();
  const {
    supported,
    imagesSupported,
    conversations,
    connections,
    error,
    openConversation,
    connect,
    sendMessage,
    sendImage,
    dismissError,
  } = useChat();
  const [text, setText] = useState('');
  const [preparingImage, setPreparingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const messages = conversations[uid] ?? [];
  const connection = connections[uid] ?? 'idle';

  useEffect(() => {
    openConversation(uid);
  }, [openConversation, uid]);

  useEffect(() => {
    if (!supported || connection === 'open') return;
    if (connection === 'idle') connect(uid);
    const timer = setInterval(() => connect(uid), RECONNECT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [supported, connection, connect, uid]);

  const pickImage = async () => {
    setImageError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setPreparingImage(true);
    try {
      await sendImage(uid, { uri: asset.uri, width: asset.width, height: asset.height });
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'No se pudo preparar la imagen.');
    } finally {
      setPreparingImage(false);
    }
  };

  const send = () => {
    if (!text.trim()) return;
    sendMessage(uid, text);
    setText('');
  };

  const confirmRemove = () => {
    Alert.alert('Eliminar amigo', `@${friend.profile.username} dejará de estar en tu lista. El historial se queda en tu teléfono.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          removeFriend(friend)
            .then(() => router.back())
            .catch((e: unknown) => Alert.alert('No se pudo eliminar', toFriendsErrorMessage(e)));
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: friend.profile.displayName,
          headerRight: () => (
            <Pressable onPress={confirmRemove} accessibilityRole="button" accessibilityLabel="Eliminar amigo" hitSlop={12}>
              <Icon name="person_remove" color="textSecondary" />
            </Pressable>
          ),
        }}
      />
      {/* Android es edge-to-edge: la ventana ya no se redimensiona con el teclado, así que hace falta `padding` también ahí. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
        <View style={styles.content}>
          {!supported ? (
            <Banner message="El chat directo necesita el APK de MiApp; no funciona en Expo Go." />
          ) : (
            <View style={styles.status} testID="chat-status">
              <View
                style={[
                  styles.dot,
                  { backgroundColor: connection === 'open' ? colors.success : connection === 'connecting' ? colors.info : colors.border },
                ]}
              />
              <ThemedText variant="caption" color="textSecondary">
                {STATUS_TEXT[connection]}
              </ThemedText>
            </View>
          )}
          {error ? <Banner tone="error" message={error} onDismiss={dismissError} /> : null}
          {imageError ? <Banner tone="error" message={imageError} onDismiss={() => setImageError(null)} /> : null}

          <FlatList
            style={styles.flex}
            data={[...messages].reverse()}
            inverted
            keyExtractor={(m) => `${m.from}:${m.id}`}
            renderItem={({ item }) => <Bubble message={item} own={item.from === user?.uid} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <ThemedText color="textSecondary" style={styles.empty}>
                Los mensajes solo se guardan en tu teléfono y en el de @{friend.profile.username}. Ningún servidor los guarda.
              </ThemedText>
            }
            testID="chat-messages"
          />

          <View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            {imagesSupported ? (
              <Pressable
                onPress={pickImage}
                disabled={preparingImage}
                accessibilityRole="button"
                accessibilityLabel="Enviar imagen"
                hitSlop={8}
                style={styles.attach}
                testID="chat-attach-image">
                {preparingImage ? <ActivityIndicator color={colors.primary} /> : <Icon name="image" color="primary" />}
              </Pressable>
            ) : null}
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Escribe un mensaje"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={MAX_MESSAGE_LENGTH}
              style={[styles.input, { color: colors.text }]}
              accessibilityLabel="Mensaje"
              testID="chat-input"
            />
            <Pressable
              onPress={send}
              disabled={!text.trim()}
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              hitSlop={8}
              style={[styles.send, { backgroundColor: colors.primary, opacity: text.trim() ? 1 : 0.5 }]}
              testID="chat-send">
              <Icon name="send" size={20} color="onPrimary" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message, own }: { message: ChatMessage; own: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[styles.bubble, own ? styles.own : styles.theirs, { backgroundColor: own ? colors.primary : colors.surface }]}
      testID={`message-${message.id}`}>
      {message.image ? (
        <Image
          source={{ uri: message.image.uri }}
          style={[styles.image, { aspectRatio: message.image.width / message.image.height || 1 }]}
          contentFit="cover"
          accessibilityLabel="Imagen"
          testID={`image-${message.id}`}
        />
      ) : null}
      {message.text ? <ThemedText color={own ? 'onPrimary' : 'text'}>{message.text}</ThemedText> : null}
      <View style={styles.meta}>
        <ThemedText variant="caption" color={own ? 'onPrimary' : 'textSecondary'}>
          {formatNoteDate(message.sentAt)}
        </ThemedText>
        {own ? (
          <View accessible accessibilityLabel={message.status === 'delivered' ? 'Entregado' : 'Pendiente'}>
            <Icon name={message.status === 'delivered' ? 'done_all' : 'schedule'} size={14} color="onPrimary" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  content: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.md, gap: Spacing.sm },
  status: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  list: { gap: Spacing.sm, paddingVertical: Spacing.sm, flexGrow: 1, justifyContent: 'flex-end' },
  empty: { textAlign: 'center', padding: Spacing.xl },
  bubble: { maxWidth: '80%', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xxs },
  own: { alignSelf: 'flex-end', borderBottomRightRadius: Radius.sm },
  theirs: { alignSelf: 'flex-start', borderBottomLeftRadius: Radius.sm },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.xxs },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
  },
  input: { ...Typography.body, flex: 1, maxHeight: 120, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  attach: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  image: { width: 220, maxHeight: 320, borderRadius: Radius.md },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
