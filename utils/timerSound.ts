/**
 * Short WAV chimes for the interval timer (expo-av on native; HTMLAudio on web).
 * Android must use a valid `InterruptionModeAndroid` (there is no MixWithOthers on Android).
 */
import { Asset } from 'expo-asset';
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';
import { Platform } from 'react-native';

const CHIME_ASSET = require('../assets/sounds/timer-segment-done.wav');

let chime: Audio.Sound | null = null;
let audioModeReady = false;

/** Resolved file URL for web playback (expo-av + autoplay timing is flaky in browsers). */
let webChimeUri: string | null = null;
let webChimeUriPromise: Promise<string> | null = null;

async function ensureWebChimeUri(): Promise<string> {
  if (webChimeUri) {
    return webChimeUri;
  }
  if (webChimeUriPromise) {
    return webChimeUriPromise;
  }
  webChimeUriPromise = (async () => {
    const asset = Asset.fromModule(CHIME_ASSET);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (!uri) {
      throw new Error('Timer chime asset has no URI');
    }
    webChimeUri = uri;
    return uri;
  })();
  return webChimeUriPromise;
}

function playWebChime(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }
  const uri = webChimeUri;
  if (!uri) {
    return;
  }
  try {
    const el = new Audio(uri);
    el.volume = 1;
    void el.play().catch(() => {
      /* autoplay / decode */
    });
  } catch {
    /* ignore */
  }
}

async function ensureTimerAudioMode(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  if (audioModeReady) {
    return;
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    // Android only supports DoNotMix | DuckOthers — invalid values throw and block all playback.
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
  });
  audioModeReady = true;
}

export async function loadTimerChime(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      await ensureWebChimeUri();
    } catch {
      webChimeUriPromise = null;
    }
    return;
  }

  if (chime) {
    return;
  }
  try {
    await ensureTimerAudioMode();
  } catch {
    // Still attempt load; some devices recover after playback starts.
  }
  const { sound } = await Audio.Sound.createAsync(CHIME_ASSET, { shouldPlay: false });
  chime = sound;
}

export async function playTimerChime(): Promise<void> {
  if (Platform.OS === 'web') {
    await loadTimerChime();
    playWebChime();
    return;
  }
  try {
    await loadTimerChime();
    if (!chime) {
      return;
    }
    await chime.replayAsync();
  } catch {
    /* ignore */
  }
}

export async function playTimerStartChime(): Promise<void> {
  if (Platform.OS === 'web') {
    await loadTimerChime();
    playWebChime();
    return;
  }
  try {
    await loadTimerChime();
    if (!chime) {
      return;
    }
    await chime.replayAsync();
  } catch {
    /* ignore */
  }
}

export async function playTimerEndChime(): Promise<void> {
  if (Platform.OS === 'web') {
    await loadTimerChime();
    playWebChime();
    return;
  }
  try {
    await loadTimerChime();
    if (!chime) {
      return;
    }
    await chime.replayAsync();
  } catch {
    /* ignore */
  }
}

export async function unloadTimerChime(): Promise<void> {
  webChimeUri = null;
  webChimeUriPromise = null;
  if (chime) {
    try {
      chime.setOnPlaybackStatusUpdate(null);
      await chime.unloadAsync();
    } catch {
      /* ignore */
    }
    chime = null;
  }
  audioModeReady = false;
}
