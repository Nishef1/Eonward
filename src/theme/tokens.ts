// Shared Studio foundation. See docs/DESIGN_SYSTEM.md.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const colors = {
  light: {
    background: '#F6F6F8',
    surface: '#FFFFFF',
    foreground: '#24262B',
    muted: '#696D77',
    accent: '#35634D',
    onAccent: '#FFFFFF',
    border: '#E2E4E9',
    inset: '#EDEEF1',
    accentSoft: '#EAF1EC',
  },
  dark: {
    background: '#141517',
    surface: '#202226',
    foreground: '#F2F3F5',
    muted: '#ADB1BB',
    accent: '#A3CEB5',
    onAccent: '#15251C',
    border: '#34373E',
    inset: '#292C31',
    accentSoft: '#26392F',
  },
} as const;

// Small layered shadows define surfaces; dark mode uses borders for separation.
export const depth = {
  light: {
    card: '0 1px 2px rgba(24, 28, 38, 0.025), 0 5px 14px rgba(24, 28, 38, 0.025)',
    control: '0 1px 3px rgba(24, 28, 38, 0.08), 0 0 0 1px rgba(24, 28, 38, 0.025)',
  },
  dark: { card: '0 1px 2px rgba(0, 0, 0, 0.12)', control: '0 1px 3px rgba(0, 0, 0, 0.25)' },
} as const;

// One semantic palette for schedule/status surfaces shared by all Calendar views.
// Text labels always accompany these tones; colors alone never communicate status.
export const semantic = {
  timeline: {
    planned: '#3F6C65',
    timebox: '#956C3F',
    completed: '#66716E',
    now: '#9B5F30',
    timeboxEdge: '#E6B579',
  },
  light: { warning: '#865A29', danger: '#A33C3C' },
  dark: { warning: '#E6B579', danger: '#FF9B99' },
} as const;

export type Palette = (typeof colors)[keyof typeof colors];
