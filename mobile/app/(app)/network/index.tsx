import { Text } from "react-native";
import { useOrg } from "../../../src/lib/org";
import { useI18n } from "../../../src/lib/i18n";
import { useTheme } from "../../../src/lib/theme";
import { useApi } from "../../../src/lib/use-api";
import { formatMoney } from "../../../src/lib/format";
import { EmptyState, ErrorBanner, LoadingBlock, Screen } from "../../../src/ui/Screen";
import { ListRow } from "../../../src/ui/ListRow";
import { SchoolPicker } from "../../../src/ui/SchoolPicker";
import { Button } from "../../../src/ui/Button";

type NetworkRow = {
  organization: { id: string; name: string; saas_plan: string };
  students: number;
  occupancy: number;
  mrr_cents: number;
  overdue_cents: number;
  lessons_today: number;
};

export default function NetworkScreen() {
  const { memberships, setOrgId, orgId, isPlatformAdmin, support, exitSupport } = useOrg();
  const { t } = useI18n();
  const { colors } = useTheme();
  const network = useApi<NetworkRow[]>(isPlatformAdmin ? null : "/api/v1/me/network");

  if (isPlatformAdmin) {
    return (
      <Screen
        brand
        eyebrow="Admin"
        title={t.network}
        description="Entre em uma escola no modo suporte."
        right={support ? <Button label="Sair" variant="outline" onPress={() => void exitSupport()} /> : undefined}
      >
        <SchoolPicker />
      </Screen>
    );
  }

  return (
    <Screen brand eyebrow={t.network} title="Suas escolas" description="Troque de unidade ou veja o resumo." refreshing={network.loading} onRefresh={network.reload}>
      {network.error ? <ErrorBanner message={network.error} onRetry={network.reload} /> : null}
      {network.loading && !network.data ? <LoadingBlock /> : null}
      {!network.loading && !(network.data?.length) && !(memberships.length > 1) ? <EmptyState /> : null}
      {(network.data ?? []).map((row) => (
        <ListRow
          key={row.organization.id}
          title={row.organization.name}
          subtitle={`Alunos ${row.students} · Ocup. ${row.occupancy}% · Hoje ${row.lessons_today}`}
          meta={orgId === row.organization.id ? "atual" : formatMoney(row.mrr_cents)}
          accent={orgId === row.organization.id}
          onPress={() => setOrgId(row.organization.id)}
        />
      ))}
      {!network.data?.length
        ? memberships.map((membership) => (
            <ListRow
              key={membership.organization.id}
              title={membership.organization.name}
              subtitle={membership.organization.saas_plan}
              meta={orgId === membership.organization.id ? "atual" : undefined}
              accent={orgId === membership.organization.id}
              onPress={() => setOrgId(membership.organization.id)}
            />
          ))
        : null}
      {!network.data?.length && !memberships.length ? (
        <Text style={{ color: colors.mutedFg }}>Nenhuma escola na rede.</Text>
      ) : null}
    </Screen>
  );
}
