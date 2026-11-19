import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useNotes } from '@/context/notes-context';
import { useAppTheme } from '@/hooks/use-theme';
import { getNotePreview, getNoteTitle, type Note } from '@/services/notes-storage';
import { formatNoteDate } from '@/utils/date';

export default function NotesScreen() {
  const router = useRouter();
  const { notes, status, error, createNote, dismissError } = useNotes();

  const openNewNote = () => {
    const note = createNote();
    router.push({ pathname: '/note/[id]', params: { id: note.id } });
  };

  return (
    <Screen
      title="Notas"
      subtitle={notes.length === 1 ? '1 nota guardada' : `${notes.length} notas guardadas`}
      testID="notes-screen">
      {error ? <Banner tone="error" message={error} onDismiss={dismissError} /> : null}

      <Button label="Nueva nota" icon="add" onPress={openNewNote} testID="new-note" />

      {status === 'loading' ? (
        <LoadingState message="Cargando notas…" />
      ) : notes.length === 0 ? (
        <EmptyNotes />
      ) : (
        <View style={styles.list}>
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function NoteCard({ note, onPress }: { note: Note; onPress: () => void }) {
  const title = getNoteTitle(note.text);
  const preview = getNotePreview(note.text);
  return (
    <Card onPress={onPress} style={styles.card} accessibilityLabel={title} testID={`note-${note.id}`}>
      <ThemedText variant="heading" numberOfLines={1}>
        {title}
      </ThemedText>
      {preview ? (
        <ThemedText color="textSecondary" numberOfLines={2}>
          {preview}
        </ThemedText>
      ) : null}
      <ThemedText variant="caption" color="textSecondary">
        {formatNoteDate(note.updatedAt)}
      </ThemedText>
    </Card>
  );
}

function EmptyNotes() {
  const { colors } = useAppTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primaryMuted }]}>
        <Icon name="sticky_note_2" size={32} color="primary" />
      </View>
      <ThemedText variant="heading">Aún no tienes notas</ThemedText>
      <ThemedText color="textSecondary" style={styles.emptyText}>
        Toca «Nueva nota» y escribe lo que quieras. Se guarda solo en tu teléfono, aunque cierres la app.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  card: { gap: Spacing.xs },
  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyText: { textAlign: 'center' },
});
