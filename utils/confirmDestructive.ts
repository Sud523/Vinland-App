/**
 * React Native Web's Alert.alert often does not run button onPress reliably.
 * Use window.confirm on web for sign-out / delete-account flows.
 */
import { Alert, Platform } from 'react-native';

export function confirmDestructive(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void | Promise<void>,
): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      void Promise.resolve(onConfirm());
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: confirmLabel,
      style: 'destructive',
      onPress: () => {
        void Promise.resolve(onConfirm());
      },
    },
  ]);
}

/** Confirm dialog for neutral actions (e.g. import); uses window.confirm on web like confirmDestructive. */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void | Promise<void>,
): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      void Promise.resolve(onConfirm());
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: confirmLabel,
      onPress: () => {
        void Promise.resolve(onConfirm());
      },
    },
  ]);
}
