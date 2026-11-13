/**
 * Calmway design tokens: "still water".
 *
 * Warm paper surfaces, deep ink text and a sea-glass teal for anything calm.
 * Alerts use soft apricot and clay instead of alarm red, because the app
 * should never shout at someone who is already nervous.
 */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  inkInverse: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  /** Text and icons on accentSoft surfaces. */
  accentInk: string;
  /** Stress scale, calm to intense. */
  stress: [string, string, string, string, string];
  routeCalm: string;
  routeFast: string;
  routeAlt: string;
  routeCasing: string;
  scrim: string;
  shadow: string;
  location: string;
  locationHalo: string;
}

const light: Palette = {
  background: '#F4F1EA',
  surface: '#FFFDF9',
  surfaceRaised: '#FFFFFF',
  surfaceSunken: '#ECE7DD',
  border: '#E2DCD0',
  ink: '#18292B',
  inkMuted: '#56676A',
  inkFaint: '#8F9C9C',
  inkInverse: '#F7F5EF',
  primary: '#2C7A6B',
  primaryPressed: '#22635A',
  primarySoft: '#DCEDE7',
  onPrimary: '#FFFFFF',
  accent: '#E39A55',
  accentSoft: '#FBEBD9',
  onAccent: '#3B2410',
  accentInk: '#7A4A1C',
  stress: ['#4FA286', '#8DB173', '#D3B45E', '#DE9259', '#C96E5D'],
  routeCalm: '#2F9079',
  routeFast: '#6E8296',
  routeAlt: '#A9B6B4',
  routeCasing: '#FFFFFF',
  scrim: 'rgba(24, 41, 43, 0.35)',
  shadow: '#1B2A2C',
  location: '#2C7A6B',
  locationHalo: 'rgba(44, 122, 107, 0.18)',
};

const dark: Palette = {
  background: '#0D1819',
  surface: '#132224',
  surfaceRaised: '#1A2C2F',
  surfaceSunken: '#0A1314',
  border: '#24393C',
  ink: '#E7EFEC',
  inkMuted: '#A2B5B1',
  inkFaint: '#6D8582',
  inkInverse: '#132224',
  primary: '#5DC3A9',
  primaryPressed: '#4AAE95',
  primarySoft: '#173A35',
  onPrimary: '#06201B',
  accent: '#F0B37A',
  accentSoft: '#3A2A1C',
  onAccent: '#2A1808',
  accentInk: '#F5CFA6',
  stress: ['#5DC3A9', '#9CC27F', '#E0C46C', '#EBA36D', '#DE8574'],
  routeCalm: '#5DC3A9',
  routeFast: '#8FA6BC',
  routeAlt: '#4A6164',
  routeCasing: '#0D1819',
  scrim: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000000',
  location: '#5DC3A9',
  locationHalo: 'rgba(93, 195, 169, 0.22)',
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_500Medium_Italic',
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
} as const;

export type TextVariant =
  'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'label' | 'caption' | 'overline' | 'metric';

export const type: Record<
  TextVariant,
  { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number }
> = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17 },
  overline: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8 },
  metric: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
};

export function stressColor(p: Palette, score: number): string {
  if (score >= 80) return p.stress[0];
  if (score >= 65) return p.stress[1];
  if (score >= 50) return p.stress[2];
  if (score >= 35) return p.stress[3];
  return p.stress[4];
}
