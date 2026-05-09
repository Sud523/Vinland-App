import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle, View } from 'react-native';

import { V } from '../../constants/vinlandTheme';
import { DitherOverlay } from './DitherOverlay';

export type VinlandCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  variant?: 'surface' | 'input';
  textured?: boolean;
};

export function VinlandCard({
  children,
  style,
  padded = true,
  variant = 'surface',
  textured = true,
}: VinlandCardProps) {
  return (
    <View style={[styles.shell, style]}>
      <View
        style={[
          styles.outer,
          variant === 'input' ? styles.outerInput : styles.outerSurface,
        ]}
      >
        <View
          style={[
            styles.inner,
            variant === 'input' ? styles.innerInput : styles.innerSurface,
            padded && styles.padded,
          ]}
        >
          {textured && variant === 'surface' ? <DitherOverlay /> : null}
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { alignSelf: 'stretch' },
  outer: {
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.pixelOuterBorder,
    backgroundColor: V.pixelShadow,
    padding: 2,
  },
  inner: {
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.pixelInnerBorder,
    overflow: 'hidden',
  },
  padded: {
    padding: V.space.lg,
  },
  outerSurface: {},
  innerSurface: {
    backgroundColor: V.bgElevated,
  },
  outerInput: {},
  innerInput: {
    backgroundColor: V.bgInput,
    borderColor: V.borderHairline,
  },
});

