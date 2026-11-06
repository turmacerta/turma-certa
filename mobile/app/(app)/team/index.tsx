import { useState } from "react";
import { View } from "react-native";
import { spacing } from "@turma-certa/tokens";
import { api } from "../../../src/lib/api";
import { useOrg } from "../../../src/lib/org";
import { useI18n } from "../../../src/lib/i18n";
import { useApi } from "../../../src/lib/use-api";
import { Button } from "../../../src/ui/Button";
import { Field } from "../../../src/ui/Field";
import { EmptyState, ErrorBanner, LoadingBlock, Screen } from "../../../src/ui/Screen";
import { ListRow } from "../../../src/ui/ListRow";

type Member = {
  id: string;
  email?: string | null;
  status?: string;
  profile?: { full_name?: string | null; email?: string | null } | null;
  org_role?: { id: string; name: string; tag: string } | null;
};

type Role = { id: string; name: string; tag: string };

export default function TeamScreen() {
  const { orgId } = useOrg();
  const { t } = useI18n();
  const members = useApi<Member[]>(orgId ? `/api/v1/organizations/${orgId}/team/members` : null);
  const roles = useApi<Role[]>(orgId ? `/api/v1/organizations/${orgId}/team/roles` : null);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviting, setInviting] = useState(false);

  return (
    <Screen title={t.team} refreshing={members.loading} onRefresh={members.reload}>
      {members.error ? <ErrorBanner message={members.error} onRetry={members.reload} /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {members.loading && !members.data ? <LoadingBlock /> : null}
      {!members.loading && !(members.data?.length) ? <EmptyState /> : null}
      {(members.data ?? []).map((member) => (
        <ListRow
          key={member.id}
          title={member.profile?.full_name ?? member.email ?? member.profile?.email ?? "Membro"}
          subtitle={member.org_role?.name ?? member.status}
        />
      ))}
      {inviting ? (
        <View style={{ gap: spacing.md }}>
          <Field label={t.email} value={email} onChangeText={setEmail} keyboardType="email-address" />
          {(roles.data ?? []).map((role) => (
            <ListRow
              key={role.id}
              title={role.name}
              subtitle={role.tag}
              meta={roleId === role.id ? "✓" : undefined}
              onPress={() => setRoleId(role.id)}
            />
          ))}
          <Button
            label="Convidar"
            loading={busy}
            onPress={async () => {
              if (!orgId || !roleId) {
                setError("Escolha um papel");
                return;
              }
              setBusy(true);
              setError(null);
              try {
                await api(`/api/v1/organizations/${orgId}/team/members`, {
                  method: "POST",
                  body: JSON.stringify({ email: email.trim(), roleId }),
                });
                setInviting(false);
                setEmail("");
                members.reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Falha");
              } finally {
                setBusy(false);
              }
            }}
          />
          <Button label={t.cancel} variant="ghost" onPress={() => setInviting(false)} />
        </View>
      ) : (
        <Button label="Convidar membro" onPress={() => setInviting(true)} />
      )}
    </Screen>
  );
}
