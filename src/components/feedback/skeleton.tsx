import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

function SkeletonBlock({ width, height }: { width: DimensionValue; height: number }) {
  const { colors } = useAppTheme();
  return <View style={{ width, height, borderRadius: Radius.sm, backgroundColor: colors.skeleton }} />;
}

/** Marcadores animados que imitan la forma de una lista mientras se cargan los datos. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  const { colors } = useAppTheme();
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.list, { opacity }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando contenido"
      testID="skeleton-list">
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SkeletonBlock width={40} height={40} />
          <View style={styles.texts}>
            <SkeletonBlock width="70%" height={14} />
            <SkeletonBlock width="95%" height={12} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  texts: { flex: 1, gap: Spacing.sm },
});
