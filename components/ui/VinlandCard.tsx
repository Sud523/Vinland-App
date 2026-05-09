import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle, View } from 'react-native';

import { V } from '../../constants/vinlandTheme';

export type VinlandCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  variant?: 'surface' | 'input';
};

export function VinlandCard({
  children,
  style,
  padded = true,
  variant = 'surface',
}: VinlandCardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'input' ? styles.input : styles.surface,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    overflow: 'hidden',
  },
  padded: {
    padding: V.space.lg,
  },
  surface: {
    backgroundColor: V.bgElevated,
  },
  input: {
    backgroundColor: V.bgInput,
    borderColor: V.borderMuted,
  },
});

