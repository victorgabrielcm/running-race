// VINCERE — Design System
// Inspired by "Vincere Velocity" identity

export const Colors = {
  // Backgrounds
  background: '#0A0A0A',
  surface: '#121212',
  card: '#1A1A1A',
  cardElevated: '#242424',
  border: '#2A2A2A',
  borderSubtle: '#1F1F1F',

  // Primary — Electric Lime (CTAs, energy, progress)
  primary: '#CCFF00',
  primaryDark: '#A3CC00',
  primaryLight: '#E0FF4D',
  primaryGlow: 'rgba(204, 255, 0, 0.18)',
  primaryMuted: 'rgba(204, 255, 0, 0.08)',

  // Secondary — Deep Orange (intensity, heat, urgency)
  secondary: '#FF5722',
  secondaryDark: '#CC3E10',
  secondaryLight: '#FF8A65',
  secondaryGlow: 'rgba(255, 87, 34, 0.18)',
  secondaryMuted: 'rgba(255, 87, 34, 0.08)',

  // Tertiary — Mustard Gold (achievements, PRs)
  tertiary: '#C4AB04',
  tertiaryDark: '#9B8600',
  tertiaryLight: '#E8C830',
  tertiaryGlow: 'rgba(196, 171, 4, 0.18)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A8A8A8',
  textTertiary: '#6B6B6B',
  textMuted: '#4A4A4A',
  textInverse: '#0A0A0A',

  // Semantic (derived from palette)
  success: '#CCFF00',
  warning: '#C4AB04',
  error: '#FF5722',
  info: '#FFFFFF',

  // Heart rate zones
  zone1: '#4A90E2', // Recovery
  zone2: '#7ED321', // Aerobic
  zone3: '#C4AB04', // Tempo
  zone4: '#FF5722', // Threshold
  zone5: '#D0021B', // Max

  // Strava
  strava: '#FC4C02',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  backdrop: 'rgba(10, 10, 10, 0.92)',
};

export const Gradients = {
  primary: ['#CCFF00', '#A3CC00'] as const,
  primarySoft: ['rgba(204, 255, 0, 0.25)', 'rgba(204, 255, 0, 0)'] as const,
  secondary: ['#FF5722', '#CC3E10'] as const,
  secondarySoft: ['rgba(255, 87, 34, 0.25)', 'rgba(255, 87, 34, 0)'] as const,
  tertiary: ['#C4AB04', '#9B8600'] as const,
  card: ['#1A1A1A', '#121212'] as const,
  hero: ['#0A0A0A', '#121212', '#0A0A0A'] as const,
  dark: ['rgba(10, 10, 10, 0)', 'rgba(10, 10, 10, 1)'] as const,
  intensity: ['#CCFF00', '#FF5722'] as const,
};

export const Typography = {
  fontFamily: {
    display: 'SpaceGrotesk_700Bold',
    displayMedium: 'SpaceGrotesk_500Medium',
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    mono: 'Courier',
  },

  size: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 44,
    hero: 56,
    mega: 72,
  },

  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
    black: '900' as const,
  },

  lineHeight: {
    tight: 1.15,
    normal: 1.4,
    loose: 1.6,
  },

  letterSpacing: {
    tighter: -1,
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1.5,
    widest: 3,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
  screen: 20,
};

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  pill: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  glow: {
    shadowColor: '#CCFF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glowOrange: {
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
};

export const GoalTypes = {
  FIVE_K: '5k',
  TEN_K: '10k',
  HALF_MARATHON: '21k',
  MARATHON: '42k',
  ULTRA: 'Ultra',
  PACE: 'Pace',
  MOBILITY: 'Mobility',
} as const;

export const GoalColors: Record<string, string> = {
  '5k': Colors.primary,
  '10k': Colors.primary,
  '21k': Colors.tertiary,
  '42k': Colors.secondary,
  Ultra: Colors.secondary,
  Pace: Colors.primary,
  Mobility: Colors.zone1,
};

export const ZoneLabels: Record<string, string> = {
  z1: 'Recuperação',
  z2: 'Base Aeróbica',
  z3: 'Tempo',
  z4: 'Limiar',
  z5: 'VO2 Max',
};

export type GoalType = (typeof GoalTypes)[keyof typeof GoalTypes];

// Brand constants
export const BRAND = {
  name: 'VINCERE',
  tagline: 'Every kilometer is a conquest.',
  taglinePt: 'Cada quilômetro é uma conquista.',
  version: 'Velocity',
};
