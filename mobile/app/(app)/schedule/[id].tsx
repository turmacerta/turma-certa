import { useLocalSearchParams, router } from "expo-router";
import { Text } from "react-native";
import type { SessionRow } from "@turma-certa/types";
import { useOrg } from "../../../src/lib/org";
import { useI18n } from "../../../src/lib/i18n";
import { useTheme } from "../../../src/lib/theme";
import { useApi } from "../../../src/lib/use-api";
import { api } from "../../../src/lib/api";
import { formatDateTime, horizonRange } from "../../../src/lib/format";
import { Button } from "../../../src/ui/Button";
import { ErrorBanner, LoadingBlock, Screen } from "../../../src/ui/Screen";
import { useState } from "react";

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orgId, can, persona } = useOrg();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const range = horizonRange(14);
  const ownAgenda = persona === "teacher" && !can("schedule.view_all");
  const path = orgId
    ? ownAgenda
      ? `/api/v1/me/schedule?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
      : `/api/v1/organizations/${orgId}/schedule?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
    : null;
  const sessions = useApi<SessionRow[]>(path);
  const session = (sessions.data ?? []).find((item) => item.id === id);

  async function toggleCancel(next: boolean) {
    if (!orgId || !id) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/v1/organizations/${orgId}/schedule/sessions/${id}/${next ? "cancel" : "restore"}`, {
        method: "POST",
        body: JSON.stringify(next ? { reason: "Cancelado pelo app" } : {}),
      });
      sessions.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha");
    } finally {
      setBusy(false);
    }
  }

  if (sessions.loading && !session) return <LoadingBlock />;
  if (!session) {
    return (
      <Screen title={t.schedule}>
        <ErrorBanner message="Aula não encontrada" />
        <Button label={t.back} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen title={session.class_group?.name ?? "Aula"}>
      {error ? <ErrorBanner message={error} /> : null}
      <Text style={{ color: colors.fg }}>{formatDateTime(session.starts_at)}</Text>
      <Text style={{ color: colors.mutedFg }}>Professor: {session.teacher?.full_name ?? "—"}</Text>
      <Text style={{ color: colors.mutedFg }}>Espaço: {session.space?.name ?? "—"}</Text>
      <Text style={{ color: session.cancelled_at ? colors.danger : colors.success }}>
        {session.cancelled_at ? "Cancelada" : "Ativa"}
      </Text>
      {session.cancelled_at ? (
        <Button label={t.restoreLesson} loading={busy} onPress={() => void toggleCancel(false)} />
      ) : (
        <Button label={t.cancelLesson} variant="danger" loading={busy} onPress={() => void toggleCancel(true)} />
      )}
      <Button label={t.back} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
