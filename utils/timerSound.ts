/**
 * Loads and plays a short WAV when a timer segment completes (expo-av).
 * Configures audio session for mix/duck so other apps recover cleanly after chimes.
 */
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';

let segmentChime: Audio.Sound | null = null;
let startChime: Audio.Sound | null = null;
let endChime: Audio.Sound | null = null;
let audioModeReady = false;

/** Configures iOS/Android playback modes before creating or replaying sound instances. */
async function ensureTimerAudioMode(): Promise<void> {
  if (audioModeReady) {
    return;
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    // Don’t interrupt whatever the user is already listening to.
    interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
    interruptionModeAndroid: InterruptionModeAndroid.MixWithOthers,
  });
  audioModeReady = true;
}

/** Lazily creates the shared `Audio.Sound` from bundled asset; no-op if already loaded. */
export async function loadTimerChime(): Promise<void> {
  if (segmentChime && startChime && endChime) {
    return;
  }
  await ensureTimerAudioMode();
  const asset = require('../assets/sounds/timer-segment-done.wav');

  const [segment, start, end] = await Promise.all([
    segmentChime
      ? Promise.resolve({ sound: segmentChime })
      : Audio.Sound.createAsync(asset, { shouldPlay: false }),
    startChime
      ? Promise.resolve({ sound: startChime })
      : Audio.Sound.createAsync(asset, { shouldPlay: false }),
    endChime
      ? Promise.resolve({ sound: endChime })
      : Audio.Sound.createAsync(asset, { shouldPlay: false }),
  ]);

  segmentChime = segment.sound;
  startChime = start.sound;
  endChime = end.sound;
}

/** Replays the chime from the start; re-asserts audio mode for reliability. */
export async function playTimerChime(): Promise<void> {
  try {
    await loadTimerChime();
    if (!segmentChime) {
      return;
    }
    await segmentChime.replayAsync();
  } catch {
    // ignore
  }
}

/** Short sound when the user starts (or auto-starts) a timer. */
export async function playTimerStartChime(): Promise<void> {
  try {
    await loadTimerChime();
    if (!startChime) {
      return;
    }
    await startChime.replayAsync();
  } catch {
    // ignore
  }
}

/** Short sound when the timer finishes the final segment. */
export async function playTimerEndChime(): Promise<void> {
  try {
    await loadTimerChime();
    if (!endChime) {
      return;
    }
    await endChime.replayAsync();
  } catch {
    // ignore
  }
}

/** Releases native sound resources (call on screen unmount or app background if desired). */
export async function unloadTimerChime(): Promise<void> {
  const sounds: Array<Audio.Sound | null> = [segmentChime, startChime, endChime];
  for (const s of sounds) {
    try {
      s?.setOnPlaybackStatusUpdate(null);
      await s?.unloadAsync();
    } catch {
      // ignore
    }
  }
  segmentChime = null;
  startChime = null;
  endChime = null;
}
