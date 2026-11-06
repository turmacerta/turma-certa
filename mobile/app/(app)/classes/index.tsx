import { router } from "expo-router";
import type { ClassRow } from "@turma-certa/types";
import { useOrg } from "../../../src/lib/org";
import { useI18n } from "../../../src/lib/i18n";
import { useApi } from "../../../src/lib/use-api";
import { EmptyState, ErrorBanner, LoadingBlock, Screen } from "../../../src/ui/Screen";
import { ListRow } from "../../../src/ui/ListRow";

export default function ClassesScreen() {
  const { orgId } = useOrg();
  const { t } = useI18n();
  const classes = useApi<ClassRow[]>(orgId ? `/api/v1/organizations/${orgId}/classes` : null);

  return (
    <Screen title={t.classes} refreshing={classes.loading} onRefresh={classes.reload}>
      {classes.error ? <ErrorBanner message={classes.error} onRetry={classes.reload} /> : null}
      {classes.loading && !classes.data ? <LoadingBlock /> : null}
      {!classes.loading && !(classes.data?.length) ? <EmptyState /> : null}
      {(classes.data ?? []).map((row) => (
        <ListRow
          key={row.id}
          title={row.name}
          subtitle={`${row.teacher?.full_name ?? "Sem professor"} · ${row.occupancy.enrolled_count}/${row.occupancy.max_capacity}`}
          onPress={() => router.push(`/(app)/classes/${row.id}`)}
        />
      ))}
    </Screen>
  );
}
