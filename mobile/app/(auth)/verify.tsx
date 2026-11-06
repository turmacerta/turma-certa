import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/lib/auth";
import { useI18n } from "../../src/lib/i18n";
import { useTheme } from "../../src/lib/theme";
import { Button } from "../../src/ui/Button";
import { Field } from "../../src/ui/Field";
import { ErrorBanner, Screen } from "../../src/ui/Screen";

export default function VerifyScreen() {
  const { pendingEmail, verifyOtp, setPendingEmail } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [email, setEmail] = useState(pendingEmail ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Screen title={t.verifyEmail}>
      <Text style={{ color: colors.mutedFg }}>Digite o código enviado para o seu e-mail.</Text>
      {error ? <ErrorBanner message={error} /> : null}
      <Field
        label={t.email}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setPendingEmail(value);
        }}
        keyboardType="email-address"
      />
      <Field label={t.code} value={code} onChangeText={setCode} keyboardType="number-pad" />
      <Button
        label={t.verifyEmail}
        loading={loading}
        onPress={async () => {
          setLoading(true);
          setError(null);
          const result = await verifyOtp(email.trim(), code.trim());
          setLoading(false);
          if (result.error) setError(result.error);
          else router.replace("/");
        }}
      />
    </Screen>
  );
}
