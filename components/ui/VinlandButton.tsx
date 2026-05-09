import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { V } from '../../constants/vinlandTheme';

export type VinlandButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export type VinlandButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: VinlandButtonVariant;
  fullWidth?: boolean;
};

export function VinlandButton({
  title,
  onPress,
  disabled = false,
  style,
  variant = 'primary',
  fullWidth = true,
}: VinlandButtonProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        variant === 'primary'
          ? styles.primary
          : variant === 'secondary'
            ? styles.secondary
            : variant === 'destructive'
              ? styles.destructive
              : styles.ghost,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'primary'
            ? styles.textPrimary
            : variant === 'destructive'
              ? styles.textDestructive
              : styles.textDefault,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: V.space.xl,
    paddingVertical: 14,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  primary: {
    backgroundColor: V.runeGlow,
    borderColor: 'rgba(0,0,0,0.55)',
  },
  secondary: {
    backgroundColor: V.bgElevated2,
    borderColor: V.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: V.borderMuted,
  },
  destructive: {
    backgroundColor: 'rgba(255, 126, 138, 0.18)',
    borderColor: V.destructiveMuted,
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.55 },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textPrimary: { color: V.bg },
  textDefault: { color: V.text },
  textDestructive: { color: V.destructive },
});

