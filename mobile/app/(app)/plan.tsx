import { useState } from "react";
import { Text } from "react-native";
import { api } from "../../src/lib/api";
import { PortalProvider, usePortal } from "../../src/lib/portal";
import { useI18n } from "../../src/lib/i18n";
import { useTheme } from "../../src/lib/theme";
import { formatDate, formatMoney } from "../../src/lib/format";
import { Button } from "../../src/ui/Button";
import { ErrorBanner, LoadingBlock, Screen } from "../../src/ui/Screen";
import { ListRow } from "../../src/ui/ListRow";

function PlanInner() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { studentId, overview, loading, error, reload } = usePortal();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const plan = overview?.subscription;

  return (
    <Screen title={t.plan} refreshing={loading} onRefresh={reload}>
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {message ? <ErrorBanner message={message} /> : null}
      {loading && !overview ? <LoadingBlock /> : null}
      <ListRow
        title={plan?.billing_plan?.name ?? "Sem plano ativo"}
        subtitle={plan?.status}
        meta={plan?.billing_plan ? formatMoney(plan.billing_plan.price_cents) : undefined}
      />
      {plan?.current_period_end ? (
        <Text style={{ color: colors.mutedFg }}>Período até {formatDate(plan.current_period_end)}</Text>
      ) : null}
      <Button
        label="Solicitar renovação"
        loading={busy}
        onPress={async () => {
          if (!studentId) return;
          setBusy(true);
          setMessage(null);
          try {
            await api(`/api/v1/me/students/${studentId}/renewal`, { method: "POST" });
            setMessage("Renovação solicitada");
            reload();
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Falha");
          } finally {
            setBusy(false);
          }
        }}
      />
    </Screen>
  );
}

export default function PlanScreen() {
  return (
    <PortalProvider>
      <PlanInner />
    </PortalProvider>
  );
}
