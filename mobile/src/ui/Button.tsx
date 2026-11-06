import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { radii, spacing, typography } from "@turma-certa/tokens";
import { useTheme } from "../lib/theme";

export function Button({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  loading?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.danger
        : variant === "secondary"
          ? colors.primarySoft
          : variant === "outline"
            ? colors.card
            : "transparent";
  const fg =
    variant === "primary" || variant === "danger"
      ? colors.primaryFg
      : variant === "ghost"
        ? colors.fg
        : colors.fg;
  const border =
    variant === "outline" ? colors.border : variant === "ghost" ? "transparent" : bg;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: pressed || disabled ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.label, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontFamily: typography.fontBodyBold,
    fontSize: typography.sizeSm,
    fontWeight: "700",
  },
});
