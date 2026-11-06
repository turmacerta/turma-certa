"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useMediaQuery, useStoredValue, writeStorage } from "./client-store";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "./theme-script";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (value: ThemePreference) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const stored = useStoredValue(STORAGE_KEY);
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const preference: ThemePreference = stored === "dark" || stored === "system" ? stored : "light";
  const theme: ResolvedTheme = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    if (stored !== null || document.documentElement.dataset.theme !== "dark") {
      document.documentElement.dataset.theme = theme;
    }
  }, [stored, theme]);

  const setPreference = useCallback((value: ThemePreference) => writeStorage(STORAGE_KEY, value), []);
  const toggle = useCallback(() => setPreference(theme === "dark" ? "light" : "dark"), [setPreference, theme]);

  const value = useMemo(() => ({ preference, theme, setPreference, toggle }), [preference, theme, setPreference, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return value;
}
