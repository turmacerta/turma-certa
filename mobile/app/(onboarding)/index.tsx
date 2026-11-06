import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { radii, spacing, typography } from "@turma-certa/tokens";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { useI18n } from "../../src/lib/i18n";
import { useOrg } from "../../src/lib/org";
import { useTheme } from "../../src/lib/theme";
import { Button } from "../../src/ui/Button";
import { Field } from "../../src/ui/Field";
import { ErrorBanner, Screen } from "../../src/ui/Screen";

export default function OnboardingScreen() {
  const { me, refreshMe, signOut } = useAuth();
  const { needsOnboarding, setOrgId } = useOrg();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [path, setPath] = useState<"owner" | "member" | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [sport, setSport] = useState("Tênis");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!needsOnboarding) return <Redirect href="/" />;

  const firstName = me?.profile?.full_name?.split(" ")[0] ?? "olá";

  return (
    <Screen title={t.appName}>
      <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.sizeXl, color: colors.fg }}>
        {t.onboardingHello(firstName)}
      </Text>
      {error ? <ErrorBanner message={error} /> : null}

      {!path ? (
        <View style={{ gap: spacing.md }}>
          <Choice
            title={t.ownerTitle}
            subtitle="Criar escola e configurar a primeira turma"
            onPress={() => setPath("owner")}
          />
          <Choice
            title={t.memberTitle}
            subtitle={t.waitingInvite}
            onPress={() => setPath("member")}
          />
        </View>
      ) : null}

      {path === "member" ? (
        <View style={{ gap: spacing.md }}>
          <Text style={{ color: colors.mutedFg }}>{t.waitingInvite}</Text>
          <Button label="Atualizar" onPress={() => void refreshMe().then(() => router.replace("/"))} />
          <Button label={t.back} variant="ghost" onPress={() => setPath(null)} />
        </View>
      ) : null}

      {path === "owner" ? (
        <View style={{ gap: spacing.md }}>
          <Field label={t.schoolName} value={schoolName} onChangeText={setSchoolName} autoCapitalize="words" />
          <Field label="Esporte principal" value={sport} onChangeText={setSport} autoCapitalize="words" />
          <Button
            label={t.createSchool}
            loading={loading}
            onPress={async () => {
              if (schoolName.trim().length < 2) {
                setError("Informe o nome da escola");
                return;
              }
              setLoading(true);
              setError(null);
              try {
                const organization = await api<{ id: string }>("/api/v1/organizations", {
                  method: "POST",
                  body: JSON.stringify({ name: schoolName.trim(), saasPlan: "school" }),
                });
                const base = `/api/v1/organizations/${organization.id}`;
                const sportRow = await api<{ id: string }>(`${base}/sports`, {
                  method: "POST",
                  body: JSON.stringify({ name: sport.trim() || "Esporte" }),
                });
                const level = await api<{ id: string }>(`${base}/levels`, {
                  method: "POST",
                  body: JSON.stringify({ name: "Iniciante", rank: 0, sportId: sportRow.id }),
                });
                const unit = await api<{ id: string }>(`${base}/units`, {
                  method: "POST",
                  body: JSON.stringify({ name: "Unidade principal" }),
                });
                const space = await api<{ id: string }>(`${base}/units/${unit.id}/spaces`, {
                  method: "POST",
                  body: JSON.stringify({ name: "Quadra 1" }),
                });
                await api(`${base}/classes`, {
                  method: "POST",
                  body: JSON.stringify({
                    name: `${sport.trim()} · Iniciante`,
                    format: "group",
                    maxCapacity: 8,
                    sportId: sportRow.id,
                    classLevelId: level.id,
                    unitId: unit.id,
                    spaceId: space.id,
                    schedules: [
                      { weekday: 2, startsAt: "18:00", endsAt: "19:00" },
                      { weekday: 4, startsAt: "18:00", endsAt: "19:00" },
                    ],
                  }),
                });
                setOrgId(organization.id);
                await refreshMe();
                router.replace("/");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Falha ao criar escola");
              } finally {
                setLoading(false);
              }
            }}
          />
          <Button label={t.back} variant="ghost" onPress={() => setPath(null)} />
        </View>
      ) : null}

      <Button label={t.signOut} variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}

function Choice({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        borderRadius: radii.md,
        padding: spacing.lg,
        gap: spacing.xs,
      })}
    >
      <Text style={{ color: colors.fg, fontWeight: "700", fontSize: typography.sizeMd }}>{title}</Text>
      <Text style={{ color: colors.mutedFg }}>{subtitle}</Text>
    </Pressable>
  );
}
