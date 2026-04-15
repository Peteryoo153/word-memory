import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ColorPalette } from './colors';

export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'theme_pref';

interface Ctx {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  isDark: boolean;
  colors: ColorPalette;
}

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v);
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme));
    return () => sub.remove();
  }, []);

  function setPref(p: ThemePref) {
    setPrefState(p);
    AsyncStorage.setItem(KEY, p);
  }

  const isDark = pref === 'system' ? systemScheme === 'dark' : pref === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo<Ctx>(() => ({ pref, setPref, isDark, colors }), [pref, isDark, colors]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Ctx {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useTheme must be used within ThemeProvider');
  return v;
}

export function useColors(): ColorPalette {
  return useTheme().colors;
}

export type { ColorPalette };
