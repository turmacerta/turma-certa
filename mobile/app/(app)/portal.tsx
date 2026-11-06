import { Text } from "react-native";
import { typography } from "@turma-certa/tokens";
import { PortalProvider, usePortal } from "../../src/lib/portal";
import { useI18n } from "../../src/lib/i18n";
import { useTheme } from "../../src/lib/theme";
import { formatDateTime } from "../../src/lib/format";
import { EmptyState, ErrorBanner, LoadingBlock, Screen } from "../../src/ui/Screen";
import { ListRow } from "../../src/ui/ListRow";

function PortalHomeInner() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { students, studentId, setStudentId, overview, loading, error, reload } = usePortal();

  return (
    <Screen title={t.home} refreshing={loading} onRefresh={reload}>
      <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.sizeXl, color: colors.fg }}>
        Portal do aluno
      </Text>
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {loading && !overview ? <LoadingBlock /> : null}
      {students.length > 1 ? (
        <>
          <Text style={{ color: colors.mutedFg }}>Quem está estudando?</Text>
          {students.map((student) => (
            <ListRow
              key={student.id}
              title={student.full_name}
              meta={studentId === student.id ? "atual" : undefined}
              onPress={() => setStudentId(student.id)}
            />
          ))}
        </>
      ) : null}
      {overview ? (
        <>
          <ListRow
            title={overview.student.full_name}
            subtitle={overview.subscription?.billing_plan?.name ?? "Sem plano"}
          />
          <ListRow title="Créditos" meta={String(overview.credits?.balance ?? 0)} />
          <Text style={{ color: colors.fg, fontWeight: "700" }}>Próximas aulas</Text>
          {(overview.lessons ?? []).slice(0, 5).map((lesson) => (
            <ListRow
              key={lesson.id}
              title={lesson.title}
              subtitle={`${formatDateTime(lesson.startsAt)} · ${lesson.teacher}`}
              meta={lesson.status}
            />
          ))}
          {!(overview.lessons?.length) ? <EmptyState message={t.noLessons} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

export default function PortalHomeScreen() {
  return (
    <PortalProvider>
      <PortalHomeInner />
    </PortalProvider>
  );
}
