import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { V } from '../../constants/vinlandTheme';
import { DitherOverlay } from './DitherOverlay';
import { VinlandButton } from './VinlandButton';

type VinlandConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** When true, confirm uses destructive styling (e.g. delete). */
  destructive?: boolean;
};

/**
 * In-app confirmation with the same shell as saving overlays (reliable on web vs Alert).
 */
export function VinlandConfirmDialog({
  visible,
  title,
  message,
  cancelLabel = 'Cancel',
  confirmLabel,
  onCancel,
  onConfirm,
  destructive = true,
}: VinlandConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <DitherOverlay opacity={0.16} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <VinlandButton title={cancelLabel} onPress={onCancel} variant="secondary" />
            <View style={styles.btnSpacer} />
            <VinlandButton
              title={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? 'destructive' : 'primary'}
            />
          </View>
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
    overflow: 'hidden',
    gap: 12,
  },
  title: {
    fontSize: 12,
    fontFamily: V.fontPixel,
    fontWeight: '400',
    color: V.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: V.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    marginTop: 4,
  },
  btnSpacer: {
    height: 10,
  },
});
