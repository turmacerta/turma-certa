import { useState } from "react";
import { Text } from "react-native";
import { Link } from "expo-router";
import { spacing } from "@turma-certa/tokens";
import { useAuth } from "../../src/lib/auth";
import { useI18n } from "../../src/lib/i18n";
import { useTheme } from "../../src/lib/theme";
import { Button } from "../../src/ui/Button";
import { Field } from "../../src/ui/Field";
import { ErrorBanner, Screen } from "../../src/ui/Screen";

export default function ForgotScreen() {
  const { resetPassword } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <Screen title={t.forgot}>
      {error ? <ErrorBanner message={error} /> : null}
      {done ? (
        <Text style={{ color: colors.fg }}>Enviamos o link de redefinição para o seu e-mail.</Text>
      ) : (
        <>
          <Field label={t.email} value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Button
            label="Enviar link"
            loading={loading}
            onPress={async () => {
              setLoading(true);
              setError(null);
              const result = await resetPassword(email.trim());
              setLoading(false);
              if (result.error) setError(result.error);
              else setDone(true);
            }}
          />
        </>
      )}
      <Link href="/(auth)/login" style={{ color: colors.primary, fontWeight: "600", marginTop: spacing.md }}>
        {t.back}
      </Link>
    </Screen>
  );
}
