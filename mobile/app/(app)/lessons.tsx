import { useState } from "react";
import { api } from "../../src/lib/api";
import { PortalProvider, usePortal } from "../../src/lib/portal";
import { useI18n } from "../../src/lib/i18n";
import { formatDateTime } from "../../src/lib/format";
import { EmptyState, ErrorBanner, LoadingBlock, Screen } from "../../src/ui/Screen";
import { ListRow } from "../../src/ui/ListRow";

function LessonsInner() {
  const { t } = useI18n();
  const { studentId, overview, loading, error, reload } = usePortal();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Screen title={t.lessons} refreshing={loading} onRefresh={reload}>
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {message ? <ErrorBanner message={message} /> : null}
      {loading && !overview ? <LoadingBlock /> : null}
      {!(overview?.lessons?.length) && !loading ? <EmptyState message={t.noLessons} /> : null}
      {(overview?.lessons ?? []).map((lesson) => {
        const cancelled = lesson.status.startsWith("cancelled");
        return (
          <ListRow
            key={lesson.id}
            title={lesson.title}
            subtitle={`${formatDateTime(lesson.startsAt)} · ${lesson.kind}`}
            meta={cancelled ? t.restoreLesson : t.cancelLesson}
            onPress={async () => {
              if (!studentId) return;
              setMessage(null);
              try {
                await api(
                  `/api/v1/me/students/${studentId}/lessons/${lesson.id}/${cancelled ? "restore" : "cancel"}`,
                  { method: "POST" },
                );
                reload();
              } catch (err) {
                setMessage(err instanceof Error ? err.message : "Falha");
              }
            }}
          />
        );
      })}
    </Screen>
  );
}

export default function LessonsScreen() {
  return (
    <PortalProvider>
      <LessonsInner />
    </PortalProvider>
  );
}
