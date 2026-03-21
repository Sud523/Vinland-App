/**
 * Vinland UI — dark grayscale, white-outlined fields, iOS-oriented.
 */
export const V = {
  bg: '#000000',
  bgElevated: '#1C1C1E',
  bgInput: '#000000',

  /** Square cards/fields — no rounding */
  boxRadius: 0,

  /** Prominent stroke on boxes, inputs, and list rows */
  outlineWidth: 2,
  /** Selected / emphasized outline (e.g. active picker row) */
  outlineWidthActive: 3,

  /** Primary field / card outline (high-contrast on black) */
  border: 'rgba(255, 255, 255, 0.82)',
  borderMuted: 'rgba(255, 255, 255, 0.48)',
  borderHairline: 'rgba(255, 255, 255, 0.22)',

  text: '#F2F2F7',
  textSecondary: '#AEAEB2',
  textTertiary: '#8E8E93',
  textDim: '#636366',

  accent: '#FFFFFF',
  accentMuted: 'rgba(255, 255, 255, 0.72)',

  /** Completed / filled states (no hue) */
  onComplete: '#E5E5EA',
  surfaceComplete: '#2C2C2E',

  destructive: '#C7C7CC',
  link: '#EBEBF5',

  tabBarBg: '#000000',
  tabBarBorder: 'rgba(255, 255, 255, 0.38)',

  placeholder: '#636366',

  /** Progress track */
  trackBg: 'rgba(255, 255, 255, 0.12)',
  trackFill: 'rgba(255, 255, 255, 0.85)',

  /** Home streak number — fiery orange on dark */
  streakFlame: '#FF6B1A',

  modalBg: '#000000',
} as const;

export const switchTrack = {
  false: 'rgba(255, 255, 255, 0.22)',
  true: 'rgba(255, 255, 255, 0.35)',
} as const;

export const switchThumb = {
  off: '#48484A',
  on: V.accent,
} as const;
