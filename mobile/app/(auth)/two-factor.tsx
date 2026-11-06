import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/lib/auth";
import { useI18n } from "../../src/lib/i18n";
import { useTheme } from "../../src/lib/theme";
import { Button } from "../../src/ui/Button";
import { Field } from "../../src/ui/Field";
import { ErrorBanner, Screen } from "../../src/ui/Screen";

export default function TwoFactorScreen() {
  const { verifyTotp } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Screen title={t.twoFactor}>
      <Text style={{ color: colors.mutedFg }}>Informe o código do autenticador.</Text>
      {error ? <ErrorBanner message={error} /> : null}
      <Field label={t.code} value={code} onChangeText={setCode} keyboardType="number-pad" />
      <Button
        label={t.signIn}
        loading={loading}
        onPress={async () => {
          setLoading(true);
          setError(null);
          const result = await verifyTotp(code.trim());
          setLoading(false);
          if (result.error) setError(result.error);
          else router.replace("/");
        }}
      />
    </Screen>
  );
}
