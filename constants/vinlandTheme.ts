/**
 * Vinland UI — dark steel, rune glow accents, pixel-etched outlines.
 */
export const V = {
  /**
   * Palette
   * - bg: near-black ink
   * - surfaces: steel-tinted elevations
   * - runeGlow: teal accent used sparingly for focus/primary actions
   */
  bg: '#070A0F',
  bgElevated: '#0D111A',
  bgElevated2: '#121827',
  bgInput: '#070A0F',

  /** Spacing scale (use instead of ad-hoc numbers when possible) */
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  /** Slight rounding for touch targets while keeping crisp borders */
  boxRadius: 12,

  /** Prominent stroke on boxes, inputs, and list rows */
  outlineWidth: 1.5,
  /** Selected / emphasized outline (e.g. active picker row) */
  outlineWidthActive: 2.5,

  /** Primary field / card outline (high-contrast on black) */
  border: 'rgba(228, 236, 255, 0.36)',
  borderMuted: 'rgba(228, 236, 255, 0.22)',
  borderHairline: 'rgba(228, 236, 255, 0.12)',
  divider: 'rgba(228, 236, 255, 0.14)',

  text: '#EAF0FF',
  textSecondary: 'rgba(234, 240, 255, 0.72)',
  textTertiary: 'rgba(234, 240, 255, 0.52)',
  textDim: 'rgba(234, 240, 255, 0.34)',

  /** Brand accent */
  runeGlow: '#28C7D9',
  runeGlowMuted: 'rgba(40, 199, 217, 0.55)',

  accent: '#EAF0FF',
  accentMuted: 'rgba(234, 240, 255, 0.72)',
  focusRing: 'rgba(40, 199, 217, 0.55)',

  /** Completed / filled states (no hue) */
  onComplete: 'rgba(234, 240, 255, 0.9)',
  surfaceComplete: '#101827',

  destructive: 'rgba(255, 126, 138, 0.95)',
  destructiveMuted: 'rgba(255, 126, 138, 0.55)',
  link: '#9FF3FF',

  tabBarBg: '#070A0F',
  tabBarBorder: 'rgba(228, 236, 255, 0.18)',

  placeholder: 'rgba(234, 240, 255, 0.32)',

  /** Progress track */
  trackBg: 'rgba(228, 236, 255, 0.10)',
  trackFill: 'rgba(40, 199, 217, 0.85)',

  /** Home streak number — fiery orange on dark */
  streakFlame: '#FF6B1A',

  modalBg: '#070A0F',
} as const;

export const switchTrack = {
  false: 'rgba(228, 236, 255, 0.18)',
  true: 'rgba(40, 199, 217, 0.35)',
} as const;

export const switchThumb = {
  off: '#2A3244',
  on: V.runeGlow,
} as const;
