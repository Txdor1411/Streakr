import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { Themes, type Scheme } from './tokens';

type ThemePref = Scheme | 'auto';

const STORAGE_KEY = 'streakr:themePref:v1';

type ThemeContextValue = {
  theme: (typeof Themes)['light'];
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('auto');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'auto') setPrefState(v);
      })
      .catch(() => {});
  }, []);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: Scheme = pref === 'auto' ? (system === 'dark' ? 'dark' : 'light') : pref;
    return { theme: Themes[scheme], pref, setPref };
  }, [pref, system, setPref]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx.theme;
}

export function useThemePref() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePref must be used within ThemeProvider');
  return ctx;
}
