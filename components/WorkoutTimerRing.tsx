/**
 * Circular progress for `TimerScreen` work/rest/between segments.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { V } from '../constants/vinlandTheme';

type Props = {
  /** Seconds remaining in this segment (or inter-segment countdown). */
  secondsLeft: number;
  /** Total seconds for the segment (or 5 for between-block countdown). */
  totalSeconds: number;
  centerLabel: string;
  caption?: string;
  variant?: 'work' | 'rest' | 'between' | 'done';
  size?: number;
  strokeWidth?: number;
  /** When true, ring advances smoothly between integer second updates. */
  smoothProgress?: boolean;
  /** Include when segment identity changes so the wall-clock end stays aligned. */
  syncKey?: string;
};

export function WorkoutTimerRing({
  secondsLeft,
  totalSeconds,
  centerLabel,
  caption,
  variant = 'work',
  size = 220,
  strokeWidth = 12,
  smoothProgress = false,
  syncKey = '',
}: Props) {
  const total = Math.max(1, totalSeconds);

  const [elapsedRatio, setElapsedRatio] = useState(() => {
    if (variant === 'done') {
      return 1;
    }
    const clampedLeft = Math.min(total, Math.max(0, secondsLeft));
    return 1 - clampedLeft / total;
  });

  useEffect(() => {
    if (variant === 'done') {
      setElapsedRatio(1);
      return;
    }

    if (!smoothProgress) {
      const clampedLeft = Math.min(total, Math.max(0, secondsLeft));
      setElapsedRatio(1 - clampedLeft / total);
      return;
    }

    const segmentEndMs = Date.now() + Math.max(0, secondsLeft) * 1000;
    const totalMs = total * 1000;
    let raf = 0;

    const loop = () => {
      const remainMs = Math.max(0, segmentEndMs - Date.now());
      const ratio = 1 - remainMs / totalMs;
      setElapsedRatio(Math.min(1, Math.max(0, ratio)));
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [secondsLeft, total, smoothProgress, variant, syncKey]);

  const pct = Math.round(elapsedRatio * 100);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - elapsedRatio);

  const stroke =
    variant === 'done'
      ? V.onComplete
      : variant === 'rest'
        ? V.accentMuted
        : variant === 'between'
          ? V.textDim
          : V.accent;

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      accessibilityLabel={
        caption
          ? `${caption}, ${centerLabel} remaining`
          : `Timer, ${centerLabel} remaining`
      }
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
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </Svg>
        <View style={[styles.center, { width: size, height: size }]} pointerEvents="none">
          <Text
            style={[
              styles.time,
              variant === 'done' && styles.timeDone,
            ]}
          >
            {centerLabel}
          </Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  center: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  time: {
    fontSize: 44,
    fontWeight: '300',
    color: V.text,
    fontVariant: ['tabular-nums'],
  },
  timeDone: {
    color: V.onComplete,
  },
  caption: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: V.textTertiary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
