/**
 * Gear icon in tab headers; navigates to root `Settings` stack screen via parent navigator.
 */
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { V } from '../constants/vinlandTheme';
import type { RootStackParamList } from '../navigation/types';

export function SettingsHeaderButton() {
  const nav = useNavigation();
  const parent = nav.getParent<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <TouchableOpacity
      onPress={() => parent?.navigate('Settings')}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.88}
      accessibilityLabel="Open settings"
      accessibilityRole="button"
      style={styles.btn}
    >
      <Ionicons name="settings-outline" size={22} color={V.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 2,
    paddingVertical: 2,
    marginRight: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
