import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { spacing } from "@turma-certa/tokens";
import { api } from "../../../src/lib/api";
import { useOrg } from "../../../src/lib/org";
import { useI18n } from "../../../src/lib/i18n";
import { useTheme } from "../../../src/lib/theme";
import { useApi } from "../../../src/lib/use-api";
import { Button } from "../../../src/ui/Button";
import { Field } from "../../../src/ui/Field";
import { ErrorBanner, LoadingBlock, Screen } from "../../../src/ui/Screen";
import { ListRow } from "../../../src/ui/ListRow";

type Named = { id: string; name: string };
type OrgInfo = {
  name: string;
  email: string | null;
  phone: string | null;
  lesson_rules?: { creditDays?: number } | null;
};

export default function SettingsScreen() {
  const { orgId } = useOrg();
  const { t } = useI18n();
  const { colors } = useTheme();
  const org = useApi<OrgInfo>(orgId ? `/api/v1/organizations/${orgId}` : null);
  const units = useApi<Named[]>(orgId ? `/api/v1/organizations/${orgId}/units` : null);
  const sports = useApi<Named[]>(orgId ? `/api/v1/organizations/${orgId}/sports` : null);
  const levels = useApi<Named[]>(orgId ? `/api/v1/organizations/${orgId}/levels` : null);
  const [name, setName] = useState("");
  const [creditDays, setCreditDays] = useState("14");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sportName, setSportName] = useState("");
  const [unitName, setUnitName] = useState("");

  useEffect(() => {
    if (org.data) {
      setName(org.data.name ?? "");
      setCreditDays(String(org.data.lesson_rules?.creditDays ?? 14));
    }
  }, [org.data]);

  if (org.loading && !org.data) return <LoadingBlock />;

  return (
    <Screen
      title={t.settings}
      refreshing={org.loading}
      onRefresh={() => {
        org.reload();
        units.reload();
        sports.reload();
        levels.reload();
      }}
    >
      {error ? <ErrorBanner message={error} /> : null}
      <Field label="Nome da escola" value={name} onChangeText={setName} autoCapitalize="words" />
      <Field label="Dias para reposição" value={creditDays} onChangeText={setCreditDays} keyboardType="number-pad" />
      <Button
        label={t.save}
        loading={busy}
        onPress={async () => {
          if (!orgId) return;
          setBusy(true);
          setError(null);
          try {
            await api(`/api/v1/organizations/${orgId}`, {
              method: "PATCH",
              body: JSON.stringify({
                name: name.trim(),
                lessonRules: { creditDays: Number(creditDays) || 14 },
              }),
            });
            org.reload();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Falha");
          } finally {
            setBusy(false);
          }
        }}
      />

      <Text style={{ color: colors.fg, fontWeight: "700", marginTop: spacing.md }}>Unidades</Text>
      {(units.data ?? []).map((unit) => (
        <ListRow key={unit.id} title={unit.name} />
      ))}
      <View style={{ gap: spacing.sm }}>
        <Field label="Nova unidade" value={unitName} onChangeText={setUnitName} autoCapitalize="words" />
        <Button
          label="Adicionar unidade"
          variant="secondary"
          onPress={async () => {
            if (!orgId || unitName.trim().length < 2) return;
            await api(`/api/v1/organizations/${orgId}/units`, {
              method: "POST",
              body: JSON.stringify({ name: unitName.trim() }),
            });
            setUnitName("");
            units.reload();
          }}
        />
      </View>

      <Text style={{ color: colors.fg, fontWeight: "700", marginTop: spacing.md }}>Esportes</Text>
      {(sports.data ?? []).map((sport) => (
        <ListRow key={sport.id} title={sport.name} />
      ))}
      <View style={{ gap: spacing.sm }}>
        <Field label="Novo esporte" value={sportName} onChangeText={setSportName} autoCapitalize="words" />
        <Button
          label="Adicionar esporte"
          variant="secondary"
          onPress={async () => {
            if (!orgId || sportName.trim().length < 2) return;
            await api(`/api/v1/organizations/${orgId}/sports`, {
              method: "POST",
              body: JSON.stringify({ name: sportName.trim() }),
            });
            setSportName("");
            sports.reload();
          }}
        />
      </View>

      <Text style={{ color: colors.fg, fontWeight: "700", marginTop: spacing.md }}>Níveis</Text>
      {(levels.data ?? []).map((level) => (
        <ListRow key={level.id} title={level.name} />
      ))}
    </Screen>
  );
}
