import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { colorsFor, type ColorTokens, type ThemeName } from "@turma-certa/tokens";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeContextValue = {
  theme: ThemeName;
  colors: ColorTokens;
  setTheme: (theme: ThemeName | "system") => void;
  preference: ThemeName | "system";
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const KEY = "tc-mobile-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === "dark" ? "dark" : "light";
  const [preference, setPreference] = useState<ThemeName | "system">("system");

  useEffect(() => {
    void AsyncStorage.getItem(KEY).then((value) => {
      if (value === "light" || value === "dark" || value === "system") setPreference(value);
    });
  }, []);

  const theme = preference === "system" ? system : preference;
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      colors: colorsFor(theme),
      preference,
      setTheme: (next) => {
        setPreference(next);
        void AsyncStorage.setItem(KEY, next);
      },
    }),
    [theme, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("ThemeProvider missing");
  return ctx;
}
