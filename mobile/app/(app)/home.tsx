import { useMemo } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import type { BillingSummary, ClassRow, SessionRow } from "@turma-certa/types";
import { spacing } from "@turma-certa/tokens";
import { useAuth } from "../../src/lib/auth";
import { useOrg } from "../../src/lib/org";
import { useI18n } from "../../src/lib/i18n";
import { useApi } from "../../src/lib/use-api";
import { formatMoney } from "../../src/lib/format";
import { ErrorBanner, LoadingBlock, Screen, StatCard } from "../../src/ui/Screen";
import { ListRow } from "../../src/ui/ListRow";
import { SchoolPicker } from "../../src/ui/SchoolPicker";
import { Button } from "../../src/ui/Button";

export default function HomeScreen() {
  const { me } = useAuth();
  const { orgId, orgName, can, isPlatformAdmin, support, exitSupport, memberships } = useOrg();
  const { t } = useI18n();
  const base = orgId ? `/api/v1/organizations/${orgId}` : null;
  const classes = useApi<ClassRow[]>(base ? `${base}/classes` : null);
  const billing = useApi<BillingSummary>(base && can("billing.view", "billing.manage") ? `${base}/billing` : null);
  const todayRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }, []);
  const today = useApi<SessionRow[]>(
    base ? `${base}/schedule?from=${encodeURIComponent(todayRange.from)}&to=${encodeURIComponent(todayRange.to)}` : null,
  );

  const stats = useMemo(() => {
    const rows = classes.data ?? [];
    const enrolled = rows.reduce((sum, item) => sum + item.occupancy.enrolled_count, 0);
    const capacity = rows.reduce((sum, item) => sum + item.occupancy.max_capacity, 0);
    const overdue = (billing.data?.invoices ?? []).filter((invoice) => invoice.status === "overdue" || invoice.status === "pending");
    const mrr = (billing.data?.subscriptions ?? [])
      .filter((item) => item.status === "active" || item.status === "past_due")
      .reduce((sum, item) => sum + (item.billing_plan?.price_cents ?? 0), 0);
    return {
      classes: rows.length,
      occupancy: capacity ? Math.round((enrolled / capacity) * 100) : 0,
      overdueCents: overdue.reduce((sum, item) => sum + item.amount_cents, 0),
      mrr,
      lessonsToday: (today.data ?? []).filter((s) => !s.cancelled_at).length,
    };
  }, [classes.data, billing.data, today.data]);

  const firstName = me?.profile?.full_name?.split(" ")[0] ?? "olá";

  if (!orgId) {
    return (
      <Screen brand eyebrow="Turma Certa" title="Escolher escola" description="Entre em uma unidade para continuar.">
        <SchoolPicker title="" />
      </Screen>
    );
  }

  return (
    <Screen
      brand
      eyebrow={support ? "Modo suporte" : orgName}
      title={`Oi, ${firstName}`}
      description={support ? `Operando ${orgName}` : "Resumo de hoje na sua escola."}
      refreshing={classes.loading || billing.loading}
      onRefresh={() => {
        classes.reload();
        billing.reload();
        today.reload();
      }}
      right={
        support || isPlatformAdmin || memberships.length > 1 ? (
          <Button
            label="Trocar"
            variant="outline"
            onPress={() => (support ? void exitSupport() : router.push("/(app)/network"))}
          />
        ) : undefined
      }
    >
      {classes.error ? <ErrorBanner message={classes.error} onRetry={classes.reload} /> : null}
      {classes.loading && !classes.data ? <LoadingBlock /> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <StatCard label="Aulas hoje" value={String(stats.lessonsToday)} tone="primary" />
        <StatCard label="Turmas" value={String(stats.classes)} />
        <StatCard label="Ocupação" value={`${stats.occupancy}%`} tone="success" />
        {can("billing.view", "billing.manage") ? (
          <StatCard label="Em aberto" value={formatMoney(stats.overdueCents)} tone="warning" />
        ) : null}
      </View>
      {can("billing.view", "billing.manage") ? <ListRow title="MRR" meta={formatMoney(stats.mrr)} /> : null}
      <ListRow title={t.schedule} subtitle="Próximos 14 dias" onPress={() => router.push("/(app)/schedule")} />
      <ListRow title={t.classes} onPress={() => router.push("/(app)/classes")} />
      <ListRow title="Mais opções" onPress={() => router.push("/(app)/more")} />
    </Screen>
  );
}
