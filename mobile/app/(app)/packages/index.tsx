import { useState } from "react";
import { View } from "react-native";
import type { BillingPlan } from "@turma-certa/types";
import { spacing } from "@turma-certa/tokens";
import { api } from "../../../src/lib/api";
import { useOrg } from "../../../src/lib/org";
import { useI18n } from "../../../src/lib/i18n";
import { useApi } from "../../../src/lib/use-api";
import { formatMoney } from "../../../src/lib/format";
import { Button } from "../../../src/ui/Button";
import { Field } from "../../../src/ui/Field";
import { EmptyState, ErrorBanner, LoadingBlock, Screen } from "../../../src/ui/Screen";
import { ListRow } from "../../../src/ui/ListRow";

export default function PackagesScreen() {
  const { orgId } = useOrg();
  const { t } = useI18n();
  const plans = useApi<BillingPlan[]>(orgId ? `/api/v1/organizations/${orgId}/billing/plans` : null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("250");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Screen title={t.packages} refreshing={plans.loading} onRefresh={plans.reload}>
      {plans.error ? <ErrorBanner message={plans.error} onRetry={plans.reload} /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {plans.loading && !plans.data ? <LoadingBlock /> : null}
      {!plans.loading && !(plans.data?.length) && !creating ? <EmptyState /> : null}
      {(plans.data ?? []).map((plan) => (
        <ListRow
          key={plan.id}
          title={plan.name}
          subtitle={`${formatMoney(plan.price_cents)} · ${plan.format}`}
          meta={plan.is_active === false ? "inativo" : "ativo"}
        />
      ))}
      {creating ? (
        <View style={{ gap: spacing.md }}>
          <Field label="Nome" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="Preço (R$)" value={price} onChangeText={setPrice} keyboardType="number-pad" />
          <Button
            label={t.save}
            loading={busy}
            onPress={async () => {
              if (!orgId) return;
              setBusy(true);
              setError(null);
              try {
                const cents = Math.round(Number(price.replace(",", ".")) * 100);
                await api(`/api/v1/organizations/${orgId}/billing/plans`, {
                  method: "POST",
                  body: JSON.stringify({
                    name: name.trim(),
                    priceCents: cents,
                    format: "group",
                    weeklyClasses: 2,
                    cycleDays: 30,
                  }),
                });
                setCreating(false);
                setName("");
                plans.reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Falha");
              } finally {
                setBusy(false);
              }
            }}
          />
          <Button label={t.cancel} variant="ghost" onPress={() => setCreating(false)} />
        </View>
      ) : (
        <Button label="Novo pacote" onPress={() => setCreating(true)} />
      )}
    </Screen>
  );
}
