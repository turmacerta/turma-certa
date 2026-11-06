import { useState } from "react";
import { Text } from "react-native";
import { Link, router } from "expo-router";
import { spacing, typography } from "@turma-certa/tokens";
import { useAuth } from "../../src/lib/auth";
import { useI18n } from "../../src/lib/i18n";
import { useTheme } from "../../src/lib/theme";
import { Button } from "../../src/ui/Button";
import { Field } from "../../src/ui/Field";
import { ErrorBanner, Screen } from "../../src/ui/Screen";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Screen title={t.signUp}>
      <Text style={{ color: colors.mutedFg, fontSize: typography.sizeMd }}>Crie sua conta no Turma Certa</Text>
      {error ? <ErrorBanner message={error} /> : null}
      <Field label={t.fullName} value={fullName} onChangeText={setFullName} autoCapitalize="words" />
      <Field label={t.email} value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label={t.password} value={password} onChangeText={setPassword} secureTextEntry />
      <Button
        label={t.signUp}
        loading={loading}
        onPress={async () => {
          setLoading(true);
          setError(null);
          const result = await signUp(email.trim(), password, fullName.trim());
          setLoading(false);
          if (result.error) setError(result.error);
          else if (result.needsVerify) router.replace("/(auth)/verify");
          else router.replace("/");
        }}
      />
      <Link href="/(auth)/login" style={{ color: colors.primary, fontWeight: "600", marginTop: spacing.md }}>
        {t.signIn}
      </Link>
    </Screen>
  );
}
