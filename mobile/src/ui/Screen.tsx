import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { radii, spacing, typography } from "@turma-certa/tokens";
import { useTheme } from "../lib/theme";
import { useI18n } from "../lib/i18n";
import { BrandMark } from "./Brand";

export function Screen({
  title,
  eyebrow,
  description,
  children,
  scroll = true,
  refreshing,
  onRefresh,
  right,
  style,
  brand = false,
}: {
  title?: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  right?: ReactNode;
  style?: ViewStyle;
  brand?: boolean;
}) {
  const { colors, theme } = useTheme();

  const header = (
    <View style={styles.pageHeader}>
      {brand ? (
        <View style={styles.brandRow}>
          <BrandMark size={36} />
          {right}
        </View>
      ) : null}
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: theme === "dark" ? colors.accent : colors.primary }]}>{eyebrow}</Text>
      ) : null}
      {title ? <Text style={[styles.title, { color: colors.fg }]}>{title}</Text> : null}
      {description ? <Text style={[styles.description, { color: colors.mutedFg }]}>{description}</Text> : null}
      {!brand && right && !title ? <View style={styles.rightOnly}>{right}</View> : null}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, style]}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined
      }
    >
      {header}
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, style, { flex: 1 }]}>
      {header}
      {children}
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={[colors.bgGlow, colors.bg, colors.bg]}
        locations={[0, 0.28, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        {body}
      </SafeAreaView>
    </View>
  );
}

export function LoadingBlock({ label }: { label?: string } = {}) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: colors.mutedFg, marginTop: spacing.sm }}>{label ?? "Carregando..."}</Text>
    </View>
  );
}

export function EmptyState({ message }: { message?: string }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ color: colors.mutedFg, textAlign: "center" }}>{message ?? t.empty}</Text>
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.error, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
      <Text style={{ color: colors.danger, flex: 1 }}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry}>
          <Text style={{ color: colors.danger, fontWeight: "700" }}>{t.retry}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "primary" | "success" | "warning";
}) {
  const { colors } = useTheme();
  const dot =
    tone === "primary"
      ? colors.primary
      : tone === "success"
        ? colors.success
        : tone === "warning"
          ? colors.warning
          : colors.border;
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.statLabelRow}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={{ color: colors.mutedFg, fontSize: typography.sizeSm }}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: colors.fg }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  pageHeader: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  rightOnly: {
    alignItems: "flex-end",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizeXl,
    fontWeight: "600",
  },
  description: {
    fontSize: typography.sizeSm,
    lineHeight: 20,
    maxWidth: 420,
  },
  center: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  error: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  stat: {
    flex: 1,
    minWidth: "45%",
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  statValue: {
    fontFamily: typography.fontDisplay,
    fontSize: typography.sizeXl,
    fontWeight: "600",
  },
});
