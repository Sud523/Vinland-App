/**
 * SVG ring used on Stats for goal progress visualization.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { V } from '../constants/vinlandTheme';

type Props = {
  /** 0–100 */
  percentage: number;
  size?: number;
  strokeWidth?: number;
};

export function CompletionRing({
  percentage,
  size = 184,
  strokeWidth = 12,
}: Props) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - clamped / 100);

  return (
    <View
      style={styles.column}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      accessibilityLabel={`All-time completion ${clamped} percent`}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={V.trackBg}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={V.runeGlow}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </Svg>
        <View style={[styles.center, { width: size, height: size }]} pointerEvents="none">
          <Text style={styles.pct}>{clamped}</Text>
          <Text style={styles.pctSuffix}>%</Text>
        </View>
      </View>
      <Text style={styles.caption}>How often you finish planned exercises</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  center: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  pct: {
    fontSize: 44,
    fontWeight: '400',
    color: V.text,
    fontVariant: ['tabular-nums'],
  },
  pctSuffix: {
    fontSize: 22,
    fontWeight: '400',
    color: V.textSecondary,
    marginTop: 10,
    marginLeft: 2,
  },
  caption: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '400',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
