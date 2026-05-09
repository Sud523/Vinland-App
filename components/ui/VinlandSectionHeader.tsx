import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { V } from '../../constants/vinlandTheme';

export function VinlandSectionHeader({
  title,
  style,
}: {
  title: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.rule} />
      <Text style={styles.text}>{title}</Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginBottom: 12,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: V.divider,
  },
  text: {
    fontSize: 10,
    fontFamily: V.fontPixel,
    fontWeight: '400',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
});

