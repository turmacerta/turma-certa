import { useState } from "react";
import { api } from "../../src/lib/api";
import { PortalProvider, usePortal } from "../../src/lib/portal";
import { useI18n } from "../../src/lib/i18n";
import { formatDateTime } from "../../src/lib/format";
import { EmptyState, ErrorBanner, LoadingBlock, Screen } from "../../src/ui/Screen";
import { ListRow } from "../../src/ui/ListRow";

function MakeupInner() {
  const { t } = useI18n();
  const { studentId, overview, loading, error, reload } = usePortal();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Screen title={t.makeup} refreshing={loading} onRefresh={reload}>
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {message ? <ErrorBanner message={message} /> : null}
      {loading && !overview ? <LoadingBlock /> : null}
      <ListRow title="Créditos disponíveis" meta={String(overview?.credits?.balance ?? 0)} />
      {!(overview?.slots?.length) && !loading ? <EmptyState message="Sem opções na janela de 14 dias" /> : null}
      {(overview?.slots ?? []).map((lesson) => (
        <ListRow
          key={lesson.id}
          title={lesson.title}
          subtitle={`${formatDateTime(lesson.startsAt)} · ${lesson.teacher}`}
          meta={`Vagas ${lesson.vacancies ?? "—"}`}
          onPress={async () => {
            if (!studentId) return;
            setMessage(null);
            try {
              await api(`/api/v1/me/students/${studentId}/makeup/${lesson.id}`, { method: "POST" });
              reload();
            } catch (err) {
              setMessage(err instanceof Error ? err.message : "Falha");
            }
          }}
        />
      ))}
      {(overview?.lessons ?? [])
        .filter((lesson) => lesson.kind === "makeup")
        .map((lesson) => (
          <ListRow
            key={`booked-${lesson.id}`}
            title={`Reservada: ${lesson.title}`}
            subtitle={formatDateTime(lesson.startsAt)}
            meta="Cancelar"
            onPress={async () => {
              if (!studentId) return;
              try {
                await api(`/api/v1/me/students/${studentId}/makeup/${lesson.id}`, { method: "DELETE" });
                reload();
              } catch (err) {
                setMessage(err instanceof Error ? err.message : "Falha");
              }
            }}
          />
        ))}
    </Screen>
  );
}

export default function MakeupScreen() {
  return (
    <PortalProvider>
      <MakeupInner />
    </PortalProvider>
  );
}
