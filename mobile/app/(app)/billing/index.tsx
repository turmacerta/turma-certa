import { useState } from "react";
import type { BillingSummary } from "@turma-certa/types";
import { api } from "../../../src/lib/api";
import { useOrg } from "../../../src/lib/org";
import { useI18n } from "../../../src/lib/i18n";
import { useApi } from "../../../src/lib/use-api";
import { formatDate, formatMoney } from "../../../src/lib/format";
import { EmptyState, ErrorBanner, LoadingBlock, Screen } from "../../../src/ui/Screen";
import { ListRow } from "../../../src/ui/ListRow";

export default function BillingScreen() {
  const { orgId } = useOrg();
  const { t } = useI18n();
  const billing = useApi<BillingSummary>(orgId ? `/api/v1/organizations/${orgId}/billing` : null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Screen title={t.billing} refreshing={billing.loading} onRefresh={billing.reload}>
      {billing.error ? <ErrorBanner message={billing.error} onRetry={billing.reload} /> : null}
      {message ? <ErrorBanner message={message} /> : null}
      {billing.loading && !billing.data ? <LoadingBlock /> : null}
      <ListRow title="Assinaturas" meta={String(billing.data?.subscriptions?.length ?? 0)} />
      <ListRow title="Faturas" meta={String(billing.data?.invoices?.length ?? 0)} />
      {!(billing.data?.invoices?.length) && !billing.loading ? <EmptyState message="Sem faturas" /> : null}
      {(billing.data?.invoices ?? []).map((invoice) => (
        <ListRow
          key={invoice.id}
          title={invoice.student?.full_name ?? "Aluno"}
          subtitle={`${formatMoney(invoice.amount_cents)} · ${invoice.status} · ${formatDate(invoice.due_date)}`}
          meta={invoice.status === "paid" ? "pago" : t.markPaid}
          onPress={async () => {
            if (!orgId || invoice.status === "paid") return;
            setMessage(null);
            try {
              await api(`/api/v1/organizations/${orgId}/billing/invoices/${invoice.id}/pay`, { method: "POST" });
              if (invoice.subscription_id) {
                await api(`/api/v1/organizations/${orgId}/billing/subscriptions/${invoice.subscription_id}/renew`, {
                  method: "POST",
                }).catch(() => undefined);
              }
              setMessage("Marcado como pago");
              billing.reload();
            } catch (err) {
              setMessage(err instanceof Error ? err.message : "Falha");
            }
          }}
        />
      ))}
      {(billing.data?.subscriptions ?? []).map((sub) => (
        <ListRow
          key={sub.id}
          title={sub.student?.full_name ?? "Assinatura"}
          subtitle={`${sub.billing_plan?.name ?? "Pacote"} · ${sub.status}`}
          meta={t.renew}
          onPress={async () => {
            if (!orgId) return;
            setMessage(null);
            try {
              await api(`/api/v1/organizations/${orgId}/billing/subscriptions/${sub.id}/renew`, { method: "POST" });
              setMessage("Renovação gerada");
              billing.reload();
            } catch (err) {
              setMessage(err instanceof Error ? err.message : "Falha");
            }
          }}
        />
      ))}
    </Screen>
  );
}
