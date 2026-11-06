export type ThemeName = "light" | "dark";

export const lightColors = {
  bg: "#f6f6f9",
  bgGlow: "#f1edfa",
  surface: "#ffffff",
  surface2: "#f4f4f8",
  ink: "#1d1b2b",
  muted: "#6a6780",
  line: "#e6e5ee",
  primary: "#7b3fd0",
  primaryHover: "#6a31bc",
  primarySoft: "#f2ecfc",
  onPrimary: "#ffffff",
  accent: "#9bd63f",
  accentSoft: "#eef8de",
  onAccent: "#1d1b2b",
  success: "#17804a",
  successSoft: "#e5f5ec",
  warning: "#b45309",
  warningSoft: "#fef3c7",
  danger: "#c22f3c",
  dangerSoft: "#fdecee",
} as const;

export const darkColors = {
  bg: "#17142a",
  bgGlow: "#221b40",
  surface: "#1f1b36",
  surface2: "#262142",
  ink: "#f2f0fa",
  muted: "#a9a3c2",
  line: "#322c52",
  primary: "#b8f25e",
  primaryHover: "#a8e64a",
  primarySoft: "#2c2650",
  onPrimary: "#17142a",
  accent: "#c37ef0",
  accentSoft: "#2e2752",
  onAccent: "#ffffff",
  success: "#5fd496",
  successSoft: "#1a3a2e",
  warning: "#f0c06a",
  warningSoft: "#3a3020",
  danger: "#f2848b",
  dangerSoft: "#3f1f2c",
} as const;

export type ColorTokens = {
  bg: string;
  bgGlow: string;
  surface: string;
  surface2: string;
  ink: string;
  muted: string;
  line: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  fg: string;
  card: string;
  border: string;
  mutedFg: string;
  primaryFg: string;
};

export function colorsFor(theme: ThemeName): ColorTokens {
  const base = theme === "dark" ? darkColors : lightColors;
  return {
    ...base,
    fg: base.ink,
    card: base.surface,
    border: base.line,
    mutedFg: base.muted,
    primaryFg: base.onPrimary,
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 28,
  full: 999,
} as const;

export const fonts = {
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansBold: "Inter_700Bold",
  display: "Sora_600SemiBold",
  displayBold: "Sora_700Bold",
} as const;

export const typography = {
  fontBody: fonts.sans,
  fontBodyMedium: fonts.sansMedium,
  fontBodyBold: fonts.sansBold,
  fontDisplay: fonts.display,
  fontDisplayBold: fonts.displayBold,
  sizeSm: 13,
  sizeMd: 16,
  sizeLg: 18,
  sizeXl: 24,
  sizeHero: 32,
} as const;
