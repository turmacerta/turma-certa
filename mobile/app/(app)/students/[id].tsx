import { useLocalSearchParams, router } from "expo-router";
import { Text } from "react-native";
import type { Student } from "@turma-certa/types";
import { useOrg } from "../../../src/lib/org";
import { useI18n } from "../../../src/lib/i18n";
import { useTheme } from "../../../src/lib/theme";
import { useApi } from "../../../src/lib/use-api";
import { Button } from "../../../src/ui/Button";
import { ErrorBanner, LoadingBlock, Screen } from "../../../src/ui/Screen";
import { ListRow } from "../../../src/ui/ListRow";

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orgId } = useOrg();
  const { t } = useI18n();
  const { colors } = useTheme();
  const student = useApi<Student>(orgId && id ? `/api/v1/organizations/${orgId}/students/${id}` : null);

  if (student.loading && !student.data) return <LoadingBlock />;
  if (!student.data) {
    return (
      <Screen title={t.students}>
        <ErrorBanner message="Aluno não encontrado" />
        <Button label={t.back} onPress={() => router.back()} />
      </Screen>
    );
  }

  const row = student.data;
  return (
    <Screen title={row.full_name} refreshing={student.loading} onRefresh={student.reload}>
      <Text style={{ color: colors.mutedFg }}>{row.email ?? "Sem e-mail"}</Text>
      <Text style={{ color: colors.mutedFg }}>{row.phone ?? "Sem telefone"}</Text>
      {row.guardian ? (
        <ListRow
          title={`Responsável: ${row.guardian.full_name}`}
          subtitle={row.guardian.email ?? row.guardian.phone ?? undefined}
        />
      ) : (
        <ListRow title="Sem responsável cadastrado" />
      )}
      <Button label={t.back} variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
