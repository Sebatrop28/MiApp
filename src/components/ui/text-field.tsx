import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
}

/** Campo de texto con etiqueta y mensaje de error, coherente con el tema. */
export function TextField({ label, error, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : 'transparent';

  return (
    <View style={styles.container}>
      <ThemedText variant="label" color="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { borderColor, color: colors.text, backgroundColor: focused ? colors.surface : colors.surfaceAlt }]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <ThemedText variant="caption" color="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  input: {
    ...Typography.body,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
});
