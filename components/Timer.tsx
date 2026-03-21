import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type TimerProps = {
  duration: number;
};

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function Timer({ duration }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setSecondsLeft(duration);
    setRunning(false);
  }, [duration]);

  useEffect(() => {
    if (!running) {
      return;
    }
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Timer</Text>
      <Text style={styles.time}>{formatTime(secondsLeft)}</Text>
      <View style={styles.actions}>
        <Pressable
          onPress={() => setRunning(true)}
          disabled={running || secondsLeft === 0}
          style={({ pressed }) => [
            styles.button,
            styles.start,
            (running || secondsLeft === 0) && styles.buttonDisabled,
            pressed && !(running || secondsLeft === 0) && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonLabel}>Start</Text>
        </Pressable>
        <Pressable
          onPress={() => setRunning(false)}
          disabled={!running}
          style={({ pressed }) => [
            styles.button,
            styles.stop,
            !running && styles.buttonDisabled,
            pressed && running && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonLabel, styles.stopLabel]}>Stop</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  time: {
    fontSize: 44,
    fontWeight: '300',
    color: '#1C1C1E',
    fontVariant: ['tabular-nums'],
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  start: {
    backgroundColor: '#007AFF',
  },
  stop: {
    backgroundColor: '#F2F2F7',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stopLabel: {
    color: '#1C1C1E',
  },
});
