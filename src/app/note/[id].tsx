import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/ui/themed-text';
import { MaxContentWidth, Spacing, Typography } from '@/constants/theme';
import { useNotes } from '@/context/notes-context';
import { useAppTheme } from '@/hooks/use-theme';
import type { Note } from '@/services/notes-storage';
import { formatNoteDate } from '@/utils/date';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const { getNote, status } = useNotes();
  const note = getNote(id);

  if (!note) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Nota' }} />
        <ThemedText color="textSecondary">
          {status === 'loading' ? 'Cargando nota…' : 'Esta nota ya no existe.'}
        </ThemedText>
      </View>
    );
  }

  return <NoteEditor note={note} />;
}

function NoteEditor({ note }: { note: Note }) {
  const { id } = note;
  const router = useRouter();
  const { colors } = useAppTheme();
  const { getNote, updateNote, deleteNote } = useNotes();
  const [text, setText] = useState(note.text);
  const deletedRef = useRef(false);

  // Al salir, una nota que se dejó vacía se elimina para no llenar la lista.
  useEffect(
    () => () => {
      const current = getNote(id);
      if (!deletedRef.current && current && current.text.trim().length === 0) {
        deleteNote(id);
      }
    },
    [id, getNote, deleteNote],
  );

  const onChangeText = (value: string) => {
    setText(value);
    updateNote(id, value);
  };

  const confirmDelete = () => {
    Alert.alert('Eliminar nota', 'Esta nota se borrará de forma permanente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deletedRef.current = true;
          deleteNote(id);
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Nota',
          headerRight: () => (
            <Pressable
              onPress={confirmDelete}
              accessibilityRole="button"
              accessibilityLabel="Eliminar nota"
              hitSlop={12}
              testID="delete-note">
              <Icon name="delete" size={24} color="danger" />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <ThemedText variant="caption" color="textSecondary">
            Guardado automáticamente · {formatNoteDate(note.updatedAt)}
          </ThemedText>
          <TextInput
            value={text}
            onChangeText={onChangeText}
            placeholder="Escribe aquí…"
            placeholderTextColor={colors.textSecondary}
            multiline
            autoFocus={note.text.length === 0}
            textAlignVertical="top"
            accessibilityLabel="Texto de la nota"
            style={[styles.input, { color: colors.text }]}
            testID="note-input"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  input: { flex: 1, ...Typography.body, fontSize: 17, lineHeight: 26 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
});
