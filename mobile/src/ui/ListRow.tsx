import { Pressable, StyleSheet, Text, View } from "react-native";
import { radii, spacing, typography } from "@turma-certa/tokens";
import { useTheme } from "../lib/theme";

export function ListRow({
  title,
  subtitle,
  meta,
  onPress,
  accent,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  onPress?: () => void;
  accent?: boolean;
}) {
  const { colors } = useTheme();
  const content = (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: accent ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { color: colors.fg }]}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.mutedFg, fontSize: typography.sizeSm }}>{subtitle}</Text> : null}
      </View>
      {meta ? (
        <Text style={{ color: accent ? colors.primary : colors.mutedFg, fontSize: typography.sizeSm, fontWeight: "600" }}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md + 2,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  title: {
    fontFamily: typography.fontBodyMedium,
    fontSize: typography.sizeMd,
    fontWeight: "600",
  },
});
