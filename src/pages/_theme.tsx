import getSystem from '@/utils/get-system'
const OS = getSystem()

// default theme setting
export const defaultTheme = {
  primary_color: '#2563EB',
  secondary_color: '#FC9B76',
  primary_text: '#0F172A',
  secondary_text: '#475569',
  info_color: '#2563EB',
  error_color: '#DC2626',
  warning_color: '#D97706',
  success_color: '#16A34A',
  background_color: '#EEF2F8',
  font_family: `-apple-system, BlinkMacSystemFont,"Microsoft YaHei UI", "Microsoft YaHei", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji"${
    OS === 'windows' ? ', twemoji mozilla' : ''
  }`,
}

// dark mode
export const defaultDarkTheme = {
  ...defaultTheme,
  primary_color: '#6096FF',
  secondary_color: '#FF9F0A',
  primary_text: '#F1F5F9',
  background_color: '#141821',
  secondary_text: '#94A3B8',
  info_color: '#6096FF',
  error_color: '#F87171',
  warning_color: '#FBBF24',
  success_color: '#34D399',
}

// glass surface tokens, see docs/design/glass-ui.md
export const glassTokens = {
  light: {
    windowSurface: 'rgba(246, 248, 252, 0.52)',
    glass: 'rgba(255, 255, 255, 0.52)',
    glassStrong: 'rgba(255, 255, 255, 0.78)',
    edge: 'rgba(255, 255, 255, 0.70)',
    hairline: 'rgba(15, 23, 42, 0.08)',
    muted: 'rgba(15, 23, 42, 0.05)',
    highlight: 'rgba(255, 255, 255, 0.85)',
  },
  dark: {
    windowSurface: 'rgba(14, 17, 24, 0.55)',
    glass: 'rgba(30, 34, 44, 0.45)',
    glassStrong: 'rgba(44, 50, 64, 0.70)',
    edge: 'rgba(255, 255, 255, 0.10)',
    hairline: 'rgba(255, 255, 255, 0.07)',
    muted: 'rgba(255, 255, 255, 0.05)',
    highlight: 'rgba(255, 255, 255, 0.12)',
  },
} as const

export const glassRadius = {
  window: 16,
  card: 14,
  control: 10,
} as const

export const glassBlur = {
  window: 'blur(36px) saturate(170%)',
  card: 'blur(20px) saturate(150%)',
  overlay: 'blur(24px) saturate(160%)',
} as const
