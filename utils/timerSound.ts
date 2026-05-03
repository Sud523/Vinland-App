/**
 * Loads and plays a short WAV when a timer segment completes (expo-av).
 * Configures audio session for mix/duck so other apps recover cleanly after chimes.
 */
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';

let chime: Audio.Sound | null = null;

/** Configures iOS/Android playback modes before creating or replaying sound instances. */
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

/** Lazily creates the shared `Audio.Sound` from bundled asset; no-op if already loaded. */
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

/** Replays the chime from the start; re-asserts audio mode for reliability. */
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

/** Releases native sound resources (call on screen unmount or app background if desired). */
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
