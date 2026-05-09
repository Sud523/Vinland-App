/**
 * iOS-style chevron back control used in stack headers (compact + optional label).
 */
import { Ionicons } from '@expo/vector-icons';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { V } from '../constants/vinlandTheme';

type Props = {
  onPress: () => void;
  /** e.g. "Workouts" when returning to the workouts list */
  label?: string;
  /** Extra wrapper style (e.g. header margin) */
  containerStyle?: StyleProp<ViewStyle>;
  /** Smaller control, tuned for iOS nav bar next to a 17pt left title */
  compact?: boolean;
};

/**
 * Square outlined control. On iOS 26+, pair with `unstable_header*Items` + `hidesSharedBackground`
 * (and/or `UIDesignRequiresCompatibility` in app config) so the system does not add a glass pill.
 */
export function OutlinedNavBackButton({ onPress, label, containerStyle, compact }: Props) {
  const iconSize = compact ? 15 : 22;
  const boxStyle = [
    styles.box,
    label == null && styles.boxIconOnly,
    compact && styles.boxFineBorder,
    compact && styles.boxCompact,
    compact && label == null && styles.boxIconOnlyCompact,
  ];
  const labelStyle = [styles.label, compact && styles.labelCompact];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={label != null ? `Back to ${label}` : 'Go back'}
      hitSlop={
        compact
          ? { top: 10, bottom: 10, left: 6, right: 10 }
          : { top: 10, bottom: 10, left: 6, right: 10 }
      }
      style={[styles.touchOuter, compact && styles.touchOuterCompact, containerStyle]}
    >
      <View style={boxStyle}>
        <Ionicons name="chevron-back" size={iconSize} color={V.link} />
        {label != null ? <Text style={labelStyle}>{label}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const fineBorder =
  Platform.OS === 'ios' ? Math.max(StyleSheet.hairlineWidth, 1) : StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  touchOuter: {
    alignSelf: 'flex-start',
  },
  touchOuterCompact: {
    alignSelf: 'center',
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
  },
  boxFineBorder: {
    borderWidth: fineBorder,
    borderColor: V.borderMuted,
    backgroundColor: V.bg,
  },
  boxCompact: {
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    height: 28,
    justifyContent: 'center',
  },
  boxIconOnly: {
    paddingHorizontal: 10,
  },
  boxIconOnlyCompact: {
    paddingHorizontal: 5,
    width: 28,
    justifyContent: 'center',
  },
  label: {
    fontSize: 17,
    fontWeight: '400',
    color: V.link,
  },
  labelCompact: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
    marginTop: Platform.OS === 'ios' ? 1 : 0,
  },
});
