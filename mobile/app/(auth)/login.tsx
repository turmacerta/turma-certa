import { useState } from "react";
import { Text, View } from "react-native";
import { Link, Redirect, router } from "expo-router";
import { spacing, typography } from "@turma-certa/tokens";
import { useAuth } from "../../src/lib/auth";
import { useI18n } from "../../src/lib/i18n";
import { useTheme } from "../../src/lib/theme";
import { Button } from "../../src/ui/Button";
import { Field } from "../../src/ui/Field";
import { ErrorBanner, Screen } from "../../src/ui/Screen";

export default function LoginScreen() {
  const { status, signIn } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === "ready") return <Redirect href="/" />;
  if (status === "needs2fa") return <Redirect href="/(auth)/two-factor" />;
  if (status === "needsVerify") return <Redirect href="/(auth)/verify" />;

  return (
    <Screen brand title="Entrar" description="Use a mesma conta do Turma Certa no computador.">
      {error ? <ErrorBanner message={error} /> : null}
      <Field label={t.email} value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label={t.password} value={password} onChangeText={setPassword} secureTextEntry />
      <Button
        label={t.signIn}
        loading={loading}
        onPress={async () => {
          setLoading(true);
          setError(null);
          const result = await signIn(email.trim(), password);
          setLoading(false);
          if (result.error) setError(result.error);
          else if (result.needs2fa) router.replace("/(auth)/two-factor");
          else router.replace("/");
        }}
      />
      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <Link href="/(auth)/forgot" style={{ color: colors.primary, fontWeight: "700", fontSize: typography.sizeSm }}>
          {t.forgot}
        </Link>
        <Text style={{ color: colors.mutedFg, fontSize: typography.sizeSm }}>
          Não tem conta?{" "}
          <Link href="/(auth)/signup" style={{ color: colors.primary, fontWeight: "700" }}>
            {t.signUp}
          </Link>
        </Text>
      </View>
    </Screen>
  );
}
