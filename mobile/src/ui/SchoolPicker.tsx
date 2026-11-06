import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { spacing, typography } from "@turma-certa/tokens";
import { useAuth } from "../lib/auth";
import { useOrg } from "../lib/org";
import { useTheme } from "../lib/theme";
import { useApi } from "../lib/use-api";
import { env } from "../lib/env";
import { Field } from "./Field";
import { ListRow } from "./ListRow";
import { Button } from "./Button";
import { ErrorBanner, LoadingBlock } from "./Screen";

type AdminOrg = {
  id: string;
  name: string;
  saas_plan: string;
  student_count: number;
  owner?: { fullName: string | null; email: string | null };
};

type AdminSummary = { organizations: AdminOrg[] };

export function SchoolPicker({ title }: { title?: string }) {
  const { colors } = useTheme();
  const { me, error: meError, refreshMe, status } = useAuth();
  const { memberships, setOrgId, isPlatformAdmin, enterSupport, orgId } = useOrg();
  const summary = useApi<AdminSummary>(isPlatformAdmin ? "/api/v1/admin/summary" : null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  type PickRow = { id: string; name: string; subtitle: string };

  const own: PickRow[] = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    subtitle: m.org_role?.name ?? m.role,
  }));

  const adminOrgs = useMemo<PickRow[]>(() => {
    const rows = summary.data?.organizations ?? [];
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => !q || `${row.name} ${row.owner?.fullName ?? ""} ${row.owner?.email ?? ""}`.toLowerCase().includes(q))
      .map((row) => ({
        id: row.id,
        name: row.name,
        subtitle: `${row.saas_plan === "school" ? "Escola" : "Autônomo"} · ${row.student_count} alunos`,
      }));
  }, [summary.data, query]);

  const list = isPlatformAdmin ? adminOrgs : own;
  const loadingMe = status === "loading" || (status === "ready" && !me && !meError);
  const loadingList = isPlatformAdmin && summary.loading && !summary.data;

  if (loadingMe) return <LoadingBlock label="Carregando perfil..." />;

  return (
    <View style={{ gap: spacing.md }}>
      {title ? (
        <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.sizeLg, color: colors.fg, fontWeight: "600" }}>
          {title}
        </Text>
      ) : null}

      {meError ? (
        <ErrorBanner
          message={`Não deu para falar com a API (${env.apiUrl}): ${meError}. Suba o backend com npm run dev:backend e libere CORS para http://localhost:8081.`}
          onRetry={() => void refreshMe()}
        />
      ) : null}

      {isPlatformAdmin ? (
        <Text style={{ color: colors.mutedFg, fontSize: typography.sizeSm, lineHeight: 20 }}>
          Admin da plataforma — escolha uma escola para operar (igual ao web).
        </Text>
      ) : null}

      {isPlatformAdmin ? (
        <Field label="Buscar" value={query} onChangeText={setQuery} placeholder="Nome, dono ou e-mail" autoCapitalize="none" />
      ) : null}

      {summary.error ? (
        <ErrorBanner
          message={`Falha ao listar escolas: ${summary.error}`}
          onRetry={summary.reload}
        />
      ) : null}

      {loadingList ? <LoadingBlock label="Buscando escolas..." /> : null}

      {list.map((row) => (
        <ListRow
          key={row.id}
          title={row.name}
          subtitle={row.subtitle}
          meta={orgId === row.id ? "atual" : busyId === row.id ? "..." : "Entrar"}
          accent={orgId === row.id}
          onPress={async () => {
            setBusyId(row.id);
            try {
              if (isPlatformAdmin) await enterSupport(row.id);
              else setOrgId(row.id);
            } finally {
              setBusyId(null);
            }
          }}
        />
      ))}

      {!list.length && !loadingList && !meError && !summary.error ? (
        <View style={{ gap: spacing.md }}>
          <Text style={{ color: colors.mutedFg, lineHeight: 20 }}>
            {isPlatformAdmin
              ? "Nenhuma escola cadastrada na plataforma ainda."
              : "Você ainda não faz parte de nenhuma escola neste perfil."}
          </Text>
          {!isPlatformAdmin ? (
            <Button label="Criar escola / onboarding" onPress={() => router.replace("/(onboarding)")} />
          ) : (
            <Button label="Tentar de novo" variant="secondary" onPress={summary.reload} />
          )}
        </View>
      ) : null}
    </View>
  );
}
