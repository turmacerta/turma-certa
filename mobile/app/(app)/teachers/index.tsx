import { useState } from "react";
import type { Teacher } from "@turma-certa/types";
import { api } from "../../../src/lib/api";
import { useOrg } from "../../../src/lib/org";
import { useI18n } from "../../../src/lib/i18n";
import { useApi } from "../../../src/lib/use-api";
import { Button } from "../../../src/ui/Button";
import { EmptyState, ErrorBanner, LoadingBlock, Screen } from "../../../src/ui/Screen";
import { ListRow } from "../../../src/ui/ListRow";

export default function TeachersScreen() {
  const { orgId } = useOrg();
  const { t } = useI18n();
  const teachers = useApi<Teacher[]>(orgId ? `/api/v1/organizations/${orgId}/teachers` : null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <Screen title={t.teachers} refreshing={teachers.loading} onRefresh={teachers.reload}>
      {teachers.error ? <ErrorBanner message={teachers.error} onRetry={teachers.reload} /> : null}
      {message ? <ErrorBanner message={message} /> : null}
      {teachers.loading && !teachers.data ? <LoadingBlock /> : null}
      {!teachers.loading && !(teachers.data?.length) ? <EmptyState /> : null}
      {(teachers.data ?? []).map((teacher) => (
        <ListRow
          key={teacher.id}
          title={teacher.full_name}
          subtitle={teacher.email ?? teacher.phone ?? undefined}
          meta="Acesso"
          onPress={async () => {
            if (!orgId) return;
            setBusyId(teacher.id);
            setMessage(null);
            try {
              const result = await api<{ email: string; invited: boolean }>(
                `/api/v1/organizations/${orgId}/teachers/${teacher.id}/access`,
                { method: "POST" },
              );
              setMessage(result.invited ? `Convite enviado para ${result.email}` : `Acesso ativo: ${result.email}`);
            } catch (err) {
              setMessage(err instanceof Error ? err.message : "Falha");
            } finally {
              setBusyId(null);
            }
          }}
        />
      ))}
      {busyId ? <Button label="Enviando..." loading onPress={() => undefined} /> : null}
    </Screen>
  );
}
