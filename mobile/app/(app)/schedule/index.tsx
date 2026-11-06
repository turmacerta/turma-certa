import { router } from "expo-router";
import type { SessionRow } from "@turma-certa/types";
import { useOrg } from "../../../src/lib/org";
import { useI18n } from "../../../src/lib/i18n";
import { useApi } from "../../../src/lib/use-api";
import { formatDateTime, horizonRange } from "../../../src/lib/format";
import { EmptyState, ErrorBanner, LoadingBlock, Screen } from "../../../src/ui/Screen";
import { ListRow } from "../../../src/ui/ListRow";

export default function ScheduleScreen() {
  const { orgId, can, persona } = useOrg();
  const { t } = useI18n();
  const range = horizonRange(14);
  const ownAgenda = persona === "teacher" && !can("schedule.view_all");
  const path = orgId
    ? ownAgenda
      ? `/api/v1/me/schedule?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
      : `/api/v1/organizations/${orgId}/schedule?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
    : null;
  const sessions = useApi<SessionRow[]>(path);

  return (
    <Screen title={t.schedule} refreshing={sessions.loading} onRefresh={sessions.reload}>
      {sessions.error ? <ErrorBanner message={sessions.error} onRetry={sessions.reload} /> : null}
      {sessions.loading && !sessions.data ? <LoadingBlock /> : null}
      {!sessions.loading && !(sessions.data?.length) ? <EmptyState message={t.noLessons} /> : null}
      {(sessions.data ?? []).map((session) => (
        <ListRow
          key={session.id}
          title={session.class_group?.name ?? "Aula"}
          subtitle={`${formatDateTime(session.starts_at)}${session.cancelled_at ? " · cancelada" : ""}`}
          meta={session.teacher?.full_name ?? undefined}
          onPress={() => router.push(`/(app)/schedule/${session.id}`)}
        />
      ))}
    </Screen>
  );
}
