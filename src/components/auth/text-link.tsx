import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';

export interface TextLinkProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

export function TextLink({ label, onPress, testID }: TextLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      hitSlop={8}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
      testID={testID}>
      <ThemedText variant="bodyStrong" color="primary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'center', paddingVertical: Spacing.xs },
  pressed: { opacity: 0.6 },
});
