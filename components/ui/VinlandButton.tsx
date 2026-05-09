import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle, View } from 'react-native';

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
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View
        style={[
          styles.outer,
          variant === 'primary'
            ? styles.primaryOuter
            : variant === 'secondary'
              ? styles.secondaryOuter
              : variant === 'destructive'
                ? styles.destructiveOuter
                : styles.ghostOuter,
        ]}
      >
        <View
          style={[
            styles.inner,
            variant === 'primary'
              ? styles.primaryInner
              : variant === 'secondary'
                ? styles.secondaryInner
                : variant === 'destructive'
                  ? styles.destructiveInner
                  : styles.ghostInner,
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
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  outer: {
    alignSelf: 'stretch',
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.pixelOuterBorder,
    backgroundColor: V.pixelShadow,
    padding: 2,
  },
  inner: {
    minHeight: 52,
    paddingHorizontal: V.space.xl,
    paddingVertical: 14,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.pixelInnerBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryOuter: {},
  primaryInner: { backgroundColor: V.runeGlow },
  secondaryOuter: {},
  secondaryInner: { backgroundColor: V.bgElevated2 },
  ghostOuter: {},
  ghostInner: { backgroundColor: 'transparent' },
  destructiveOuter: {},
  destructiveInner: { backgroundColor: 'rgba(255, 126, 138, 0.18)' },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.55 },
  text: {
    fontSize: 12,
    fontFamily: V.fontPixel,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  textPrimary: { color: V.bg },
  textDefault: { color: V.text },
  textDestructive: { color: V.destructive },
});

