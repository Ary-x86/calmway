import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { usePrefs } from '@/store/prefs';
import { palettes, type ColorScheme, type Palette } from './tokens';

interface Theme {
  scheme: ColorScheme;
  p: Palette;
}

const ThemeContext = createContext<Theme>({ scheme: 'light', p: palettes.light });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const appearance = usePrefs((s) => s.appearance);
  const scheme: ColorScheme = appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;
  const value = useMemo(() => ({ scheme, p: palettes[scheme] }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
