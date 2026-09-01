import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'futurist';

const STORAGE_KEY = 'medicore-theme';
const EVENT_NAME = 'medicore-theme-change';

const THEME_ORDER: ThemeMode[] = ['light', 'dark', 'futurist'];

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'futurist') return stored;
  return 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme);

  useEffect(() => {
    const handler = () => setTheme(readStoredTheme());
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    setTheme(mode);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  const cycle = useCallback(() => {
    const idx = THEME_ORDER.indexOf(theme);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    setThemeMode(next);
  }, [theme, setThemeMode]);

  return {
    theme,
    setTheme: setThemeMode,
    cycle,
    isDark: theme === 'dark',
    isFuturist: theme === 'futurist',
  };
}

export default useTheme;