import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';

export interface ListRowProps {
  title: string;
  description?: string;
  icon?: IconName;
  /** Elemento a la derecha (p. ej. un `Switch` o un valor). */
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  testID?: string;
}

/** Fila de lista para ajustes o información, con icono, textos y accesorio. */
export function ListRow({ title, description, icon, trailing, onPress, showChevron, testID }: ListRowProps) {
  const { colors } = useAppTheme();

  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
          <Icon name={icon} size={20} color="primary" />
        </View>
      ) : null}
      <View style={styles.texts}>
        <ThemedText variant="bodyStrong">{title}</ThemedText>
        {description ? (
          <ThemedText variant="caption" color="textSecondary">
            {description}
          </ThemedText>
        ) : null}
      </View>
      {trailing}
      {showChevron ? <Icon name="chevron_right" size={22} color="textSecondary" /> : null}
    </View>
  );

  if (!onPress) {
    return <View testID={testID}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      android_ripple={{ color: colors.surfaceAlt }}
      testID={testID}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 56,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: Spacing.xxs },
});
