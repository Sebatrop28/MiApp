import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';

export type ListRowTone = 'primary' | 'accent' | 'success' | 'warning' | 'info' | 'danger';

const TONES: Record<ListRowTone, { background: ThemeColor; foreground: ThemeColor }> = {
  primary: { background: 'primaryMuted', foreground: 'primary' },
  accent: { background: 'accentSurface', foreground: 'accent' },
  success: { background: 'successSurface', foreground: 'success' },
  warning: { background: 'warningSurface', foreground: 'warning' },
  info: { background: 'infoSurface', foreground: 'info' },
  danger: { background: 'dangerSurface', foreground: 'danger' },
};

export interface ListRowProps {
  title: string;
  description?: string;
  icon?: IconName;
  /** Color del icono. */
  tone?: ListRowTone;
  /** Elemento a la izquierda en lugar del icono (p. ej. un `Avatar`). */
  leading?: ReactNode;
  /** Elemento a la derecha (p. ej. un `Switch` o un valor). */
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  testID?: string;
}

/** Fila de lista para ajustes o información, con icono, textos y accesorio. */
export function ListRow({ title, description, icon, tone = 'primary', leading, trailing, onPress, showChevron, testID }: ListRowProps) {
  const { colors } = useAppTheme();
  const palette = TONES[tone];

  const content = (
    <View style={styles.row}>
      {leading ??
        (icon ? (
          <View style={[styles.iconWrap, { backgroundColor: colors[palette.background] }]}>
            <Icon name={icon} size={20} color={palette.foreground} />
          </View>
        ) : null)}
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
    minHeight: 60,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: Spacing.xxs },
});
