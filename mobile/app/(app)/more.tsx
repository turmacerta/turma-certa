import { router } from "expo-router";
import { useOrg } from "../../src/lib/org";
import { useI18n } from "../../src/lib/i18n";
import { Screen } from "../../src/ui/Screen";
import { ListRow } from "../../src/ui/ListRow";

export default function MoreScreen() {
  const { t } = useI18n();
  const { can, saasPlan, memberships, isPlatformAdmin, orgId } = useOrg();
  const school = saasPlan === "school";

  return (
    <Screen brand eyebrow="Menu" title="Mais" description="Operação e configuração da escola.">
      {!orgId && isPlatformAdmin ? (
        <ListRow title="Escolher escola" subtitle="Modo suporte" onPress={() => router.push("/(app)/home")} accent />
      ) : null}
      {can("students.view", "students.manage", "classes.view_all") ? (
        <ListRow title={t.students} onPress={() => router.push("/(app)/students")} />
      ) : null}
      {school && can("teachers.view", "teachers.manage") ? (
        <ListRow title={t.teachers} onPress={() => router.push("/(app)/teachers")} />
      ) : null}
      {can("billing.view", "billing.manage") ? (
        <>
          <ListRow title={t.billing} onPress={() => router.push("/(app)/billing")} />
          <ListRow title={t.packages} onPress={() => router.push("/(app)/packages")} />
        </>
      ) : null}
      {can("team.manage") ? <ListRow title={t.team} onPress={() => router.push("/(app)/team")} /> : null}
      {can("settings.manage") ? (
        <ListRow title={t.settings} onPress={() => router.push("/(app)/settings")} />
      ) : null}
      {memberships.length > 1 || isPlatformAdmin ? (
        <ListRow title={t.network} onPress={() => router.push("/(app)/network")} />
      ) : null}
      <ListRow title={t.account} onPress={() => router.push("/(app)/account")} />
    </Screen>
  );
}
