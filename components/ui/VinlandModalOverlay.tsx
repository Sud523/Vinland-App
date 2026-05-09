import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import { V } from '../../constants/vinlandTheme';
import { DitherOverlay } from './DitherOverlay';

export function VinlandModalOverlay({
  visible,
  title,
  subtitle = 'This can take a moment.',
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <DitherOverlay opacity={0.16} />
          <ActivityIndicator size="large" color={V.runeGlow} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{subtitle}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  title: {
    fontSize: 12,
    fontFamily: V.fontPixel,
    fontWeight: '800',
    color: V.text,
  },
  sub: {
    fontSize: 14,
    color: V.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

