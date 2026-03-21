import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';

let chime: Audio.Sound | null = null;

/** Keep session in mix mode so iOS never leaves other apps ducked after the beep. */
async function ensureTimerAudioMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  });
}

export async function loadTimerChime(): Promise<void> {
  if (chime) {
    return;
  }
  await ensureTimerAudioMode();
  const { sound } = await Audio.Sound.createAsync(
    require('../assets/sounds/timer-segment-done.wav'),
    { shouldPlay: false },
  );
  chime = sound;
}

export async function playTimerChime(): Promise<void> {
  try {
    await loadTimerChime();
    if (!chime) {
      return;
    }

    await ensureTimerAudioMode();

    await chime.replayAsync();
  } catch {
    try {
      await ensureTimerAudioMode();
    } catch {
      // ignore
    }
  }
}

export async function unloadTimerChime(): Promise<void> {
  try {
    await ensureTimerAudioMode();
  } catch {
    // ignore
  }
  if (chime) {
    try {
      chime.setOnPlaybackStatusUpdate(null);
      await chime.unloadAsync();
    } catch {
      // ignore
    }
    chime = null;
  }
}
