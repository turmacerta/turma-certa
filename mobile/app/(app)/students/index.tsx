import { router } from "expo-router";
import type { Student } from "@turma-certa/types";
import { useOrg } from "../../../src/lib/org";
import { useI18n } from "../../../src/lib/i18n";
import { useApi } from "../../../src/lib/use-api";
import { EmptyState, ErrorBanner, LoadingBlock, Screen } from "../../../src/ui/Screen";
import { ListRow } from "../../../src/ui/ListRow";

export default function StudentsScreen() {
  const { orgId } = useOrg();
  const { t } = useI18n();
  const students = useApi<Student[]>(orgId ? `/api/v1/organizations/${orgId}/students` : null);

  return (
    <Screen title={t.students} refreshing={students.loading} onRefresh={students.reload}>
      {students.error ? <ErrorBanner message={students.error} onRetry={students.reload} /> : null}
      {students.loading && !students.data ? <LoadingBlock /> : null}
      {!students.loading && !(students.data?.length) ? <EmptyState /> : null}
      {(students.data ?? []).map((student) => (
        <ListRow
          key={student.id}
          title={student.full_name}
          subtitle={student.guardian?.full_name ? `Resp.: ${student.guardian.full_name}` : student.email ?? undefined}
          onPress={() => router.push(`/(app)/students/${student.id}`)}
        />
      ))}
    </Screen>
  );
}
