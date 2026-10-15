// Provisional design tokens. See docs/DESIGN_SYSTEM.md.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  md: 12,
  lg: 18,
  xl: 24,
  full: 999,
} as const;

export const colors = {
  light: {
    background: '#F7F6F2',
    surface: '#FFFFFF',
    foreground: '#202927',
    muted: '#66736E',
    accent: '#527265',
    onAccent: '#FFFFFF',
    border: '#E6EAE4',
  },
  dark: {
    background: '#151A19',
    surface: '#222A28',
    foreground: '#F0F3F0',
    muted: '#A8B7AF',
    accent: '#92B2A3',
    onAccent: '#151A19',
    border: '#36413B',
  },
} as const;
