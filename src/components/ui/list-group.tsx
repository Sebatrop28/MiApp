import { Children, Fragment, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

/** Tarjeta que agrupa varias `ListRow` separadas por una línea fina. */
export function ListGroup({ children }: PropsWithChildren) {
  const { colors } = useAppTheme();
  const items = Children.toArray(children);

  return (
    <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
});
