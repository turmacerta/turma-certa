import { useLocalSearchParams, router } from "expo-router";
import { Text, View } from "react-native";
import { useState } from "react";
import type { BillingPlan, ClassDetail, Student } from "@turma-certa/types";
import { spacing } from "@turma-certa/tokens";
import { api } from "../../../src/lib/api";
import { useOrg } from "../../../src/lib/org";
import { useI18n } from "../../../src/lib/i18n";
import { useTheme } from "../../../src/lib/theme";
import { useApi } from "../../../src/lib/use-api";
import { formatMoney } from "../../../src/lib/format";
import { Button } from "../../../src/ui/Button";
import { ErrorBanner, LoadingBlock, Screen } from "../../../src/ui/Screen";
import { ListRow } from "../../../src/ui/ListRow";

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orgId } = useOrg();
  const { t } = useI18n();
  const { colors } = useTheme();
  const detail = useApi<ClassDetail>(orgId && id ? `/api/v1/organizations/${orgId}/classes/${id}` : null);
  const students = useApi<Student[]>(orgId ? `/api/v1/organizations/${orgId}/students` : null);
  const plans = useApi<BillingPlan[]>(orgId ? `/api/v1/organizations/${orgId}/billing/plans` : null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "enroll">("view");

  if (detail.loading && !detail.data) return <LoadingBlock />;
  if (!detail.data) {
    return (
      <Screen title={t.classes}>
        <ErrorBanner message="Turma não encontrada" />
        <Button label={t.back} onPress={() => router.back()} />
      </Screen>
    );
  }

  const row = detail.data;

  return (
    <Screen title={row.name} refreshing={detail.loading} onRefresh={detail.reload}>
      {error ? <ErrorBanner message={error} /> : null}
      <Text style={{ color: colors.mutedFg }}>
        {row.teacher?.full_name ?? "Sem professor"} · {row.occupancy.enrolled_count}/{row.occupancy.max_capacity}
      </Text>
      <Text style={{ color: colors.fg, fontWeight: "700" }}>Alunos matriculados</Text>
      {(row.enrollments ?? []).map((enrollment) => (
        <ListRow key={enrollment.id} title={enrollment.student?.full_name ?? "Aluno"} meta={enrollment.status} />
      ))}

      {mode === "view" ? (
        <Button label="Matricular / vender pacote" onPress={() => setMode("enroll")} />
      ) : (
        <View style={{ gap: spacing.md }}>
          <Text style={{ color: colors.fg, fontWeight: "700" }}>Escolher aluno</Text>
          {(students.data ?? []).slice(0, 20).map((student) => (
            <ListRow
              key={student.id}
              title={student.full_name}
              meta={selectedStudent === student.id ? "✓" : undefined}
              onPress={() => setSelectedStudent(student.id)}
            />
          ))}
          <Text style={{ color: colors.fg, fontWeight: "700" }}>Pacote</Text>
          {(plans.data ?? []).map((plan) => (
            <ListRow
              key={plan.id}
              title={plan.name}
              subtitle={formatMoney(plan.price_cents)}
              meta={selectedPlan === plan.id ? "✓" : undefined}
              onPress={() => setSelectedPlan(plan.id)}
            />
          ))}
          <Button
            label="Confirmar matrícula"
            loading={busy}
            onPress={async () => {
              if (!orgId || !selectedStudent || !selectedPlan || !id) {
                setError("Selecione aluno e pacote");
                return;
              }
              setBusy(true);
              setError(null);
              try {
                await api(`/api/v1/organizations/${orgId}/billing/subscriptions`, {
                  method: "POST",
                  body: JSON.stringify({
                    studentId: selectedStudent,
                    billingPlanId: selectedPlan,
                    autoRenew: true,
                    classIds: [id],
                  }),
                });
                setMode("view");
                detail.reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Falha na matrícula");
              } finally {
                setBusy(false);
              }
            }}
          />
          <Button label={t.cancel} variant="ghost" onPress={() => setMode("view")} />
        </View>
      )}
      <Button label={t.back} variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
