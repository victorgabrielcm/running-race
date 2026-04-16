export const Colors = {
  // Core backgrounds
  background: '#0A0A0F',
  surface: '#141418',
  card: '#1C1C24',
  cardElevated: '#222230',
  border: '#2A2A3A',

  // Brand
  primary: '#FF6B35',
  primaryDark: '#CC4E1F',
  primaryLight: '#FF8C5A',
  primaryGlow: 'rgba(255, 107, 53, 0.15)',

  // Secondary accent (gold for achievements)
  gold: '#FFD700',
  goldDark: '#CC9C00',
  goldGlow: 'rgba(255, 215, 0, 0.12)',

  // Semantic
  success: '#00E676',
  successGlow: 'rgba(0, 230, 118, 0.12)',
  warning: '#FFB020',
  error: '#FF4D6D',
  info: '#3D9BFF',
  infoGlow: 'rgba(61, 155, 255, 0.12)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8891A4',
  textTertiary: '#4A5568',
  textInverse: '#0A0A0F',

  // Zones (heart rate / effort)
  zone1: '#4FC3F7', // Easy - blue
  zone2: '#81C784', // Aerobic - green
  zone3: '#FFD54F', // Tempo - yellow
  zone4: '#FF8A65', // Threshold - orange
  zone5: '#EF5350', // Max - red

  // Strava
  strava: '#FC4C02',

  // Transparent
  overlay: 'rgba(0, 0, 0, 0.6)',
  cardOverlay: 'rgba(28, 28, 36, 0.95)',
};

export const Gradients = {
  primary: ['#FF6B35', '#FF3D00'] as const,
  primarySoft: ['rgba(255, 107, 53, 0.3)', 'rgba(255, 61, 0, 0.0)'] as const,
  card: ['#1C1C24', '#141418'] as const,
  hero: ['#0A0A0F', '#1C1C24', '#0A0A0F'] as const,
  gold: ['#FFD700', '#FF8C00'] as const,
  success: ['#00E676', '#00BFA5'] as const,
  dark: ['rgba(10, 10, 15, 0)', 'rgba(10, 10, 15, 1)'] as const,
  info: ['#3D9BFF', '#0061FF'] as const,
};

export const Typography = {
  // Font families (using system fonts for now; can add custom fonts)
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    mono: 'Courier',
  },

  // Sizes
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    hero: 48,
  },

  // Weights
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
    black: '900' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    loose: 1.8,
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
  screen: 20, // horizontal screen padding
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  primary: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};

// Pace / Distance goals
export const GoalTypes = {
  FIVE_K: '5k',
  TEN_K: '10k',
  HALF_MARATHON: '21k',
  MARATHON: '42k',
  ULTRA: 'Ultra',
  PACE: 'Pace',
  MOBILITY: 'Mobility',
  WEIGHT: 'Weight',
} as const;

export const GoalColors: Record<string, string> = {
  '5k': Colors.info,
  '10k': Colors.success,
  '21k': Colors.warning,
  '42k': Colors.primary,
  Ultra: Colors.error,
  Pace: Colors.primaryLight,
  Mobility: Colors.zone1,
  Weight: Colors.gold,
};

export const ZoneLabels: Record<string, string> = {
  z1: 'Recuperação',
  z2: 'Aeróbico Base',
  z3: 'Tempo',
  z4: 'Limiar',
  z5: 'VO2 Max',
};

export type GoalType = (typeof GoalTypes)[keyof typeof GoalTypes];
