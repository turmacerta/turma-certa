import { useState } from "react";
import { Image, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { radii, spacing, typography } from "@turma-certa/tokens";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { useI18n, type Locale } from "../../src/lib/i18n";
import { useOrg } from "../../src/lib/org";
import { useTheme } from "../../src/lib/theme";
import { getSupabase } from "../../src/lib/supabase";
import { Button } from "../../src/ui/Button";
import { Field } from "../../src/ui/Field";
import { ErrorBanner, Screen } from "../../src/ui/Screen";
import { ListRow } from "../../src/ui/ListRow";

export default function AccountScreen() {
  const { me, signOut, user, refreshMe } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { memberships, setOrgId, orgId, orgName } = useOrg();
  const { colors, preference, setTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [factorCode, setFactorCode] = useState("");
  const [enrollUri, setEnrollUri] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Screen title={t.account}>
      <View style={{ alignItems: "flex-start", gap: spacing.sm }}>
        {me?.profile?.avatar_url ? (
          <Image
            source={{ uri: me.profile.avatar_url }}
            style={{ width: 72, height: 72, borderRadius: radii.full, backgroundColor: colors.surface2 }}
          />
        ) : (
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radii.full,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 24 }}>
              {(me?.profile?.full_name ?? "?").slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.sizeXl, color: colors.fg }}>
        {me?.profile?.full_name ?? "Conta"}
      </Text>
      <Text style={{ color: colors.mutedFg }}>{me?.profile?.email ?? user?.email}</Text>
      <Text style={{ color: colors.mutedFg }}>Escola: {orgName || "—"}</Text>
      {error ? <ErrorBanner message={error} /> : null}
      <Button
        label="Alterar foto"
        variant="secondary"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              setError("Permissão de fotos negada");
              return;
            }
            const picked = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.7,
              base64: true,
            });
            if (picked.canceled || !picked.assets[0]?.base64) return;
            const asset = picked.assets[0];
            const mime = asset.mimeType ?? "image/jpeg";
            const dataUrl = `data:${mime};base64,${asset.base64}`;
            await api("/api/v1/me/avatar", { method: "PUT", body: JSON.stringify({ dataUrl }) });
            await refreshMe();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Falha no upload");
          } finally {
            setBusy(false);
          }
        }}
      />

      <Text style={{ color: colors.fg, fontWeight: "700", marginTop: spacing.md }}>Idioma</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {(["pt-BR", "en"] as Locale[]).map((item) => (
          <Button
            key={item}
            label={item === "pt-BR" ? "PT" : "EN"}
            variant={locale === item ? "primary" : "secondary"}
            onPress={() => setLocale(item)}
          />
        ))}
      </View>

      <Text style={{ color: colors.fg, fontWeight: "700", marginTop: spacing.md }}>Tema</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
        {(["system", "light", "dark"] as const).map((item) => (
          <Button
            key={item}
            label={item}
            variant={preference === item ? "primary" : "secondary"}
            onPress={() => setTheme(item)}
          />
        ))}
      </View>

      {memberships.length > 1 ? (
        <>
          <Text style={{ color: colors.fg, fontWeight: "700", marginTop: spacing.md }}>{t.network}</Text>
          {memberships.map((membership) => (
            <ListRow
              key={membership.organization.id}
              title={membership.organization.name}
              meta={orgId === membership.organization.id ? "atual" : undefined}
              onPress={() => setOrgId(membership.organization.id)}
            />
          ))}
        </>
      ) : null}

      <Text style={{ color: colors.fg, fontWeight: "700", marginTop: spacing.md }}>{t.twoFactor}</Text>
      {!enrollUri ? (
        <Button
          label="Ativar 2FA"
          variant="secondary"
          loading={busy}
          onPress={async () => {
            const supabase = getSupabase();
            if (!supabase) return;
            setBusy(true);
            setError(null);
            try {
              const enrolled = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Turma Certa" });
              if (enrolled.error) throw enrolled.error;
              setFactorId(enrolled.data.id);
              setEnrollUri(enrolled.data.totp.qr_code);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Falha ao iniciar 2FA");
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          <Text style={{ color: colors.mutedFg }}>Escaneie o QR no autenticador e confirme o código.</Text>
          <Text selectable style={{ color: colors.fg, fontSize: 12 }}>
            {enrollUri}
          </Text>
          <Field label={t.code} value={factorCode} onChangeText={setFactorCode} keyboardType="number-pad" />
          <Button
            label="Confirmar 2FA"
            loading={busy}
            onPress={async () => {
              const supabase = getSupabase();
              if (!supabase || !factorId) return;
              setBusy(true);
              setError(null);
              try {
                const challenge = await supabase.auth.mfa.challenge({ factorId });
                if (challenge.error) throw challenge.error;
                const verified = await supabase.auth.mfa.verify({
                  factorId,
                  challengeId: challenge.data.id,
                  code: factorCode.trim(),
                });
                if (verified.error) throw verified.error;
                setEnrollUri(null);
                setFactorCode("");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Código inválido");
              } finally {
                setBusy(false);
              }
            }}
          />
        </View>
      )}

      <Button label={t.signOut} variant="danger" onPress={() => void signOut()} />
    </Screen>
  );
}
