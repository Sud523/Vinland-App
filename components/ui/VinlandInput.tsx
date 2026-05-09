import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
  View,
} from 'react-native';

import { V } from '../../constants/vinlandTheme';

export type VinlandInputProps = TextInputProps & {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function VinlandInput({
  label,
  containerStyle,
  style,
  placeholderTextColor,
  ...props
}: VinlandInputProps) {
  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.outer}>
        <View style={styles.inner}>
          <TextInput
            {...props}
            placeholderTextColor={placeholderTextColor ?? V.placeholder}
            style={[styles.input, style]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontFamily: V.fontPixel,
    fontWeight: '700',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
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
    backgroundColor: V.bgInput,
  },
  input: {
    borderRadius: V.boxRadius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: V.text,
    backgroundColor: 'transparent',
  },
});

