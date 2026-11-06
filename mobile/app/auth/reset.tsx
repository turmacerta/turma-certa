import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/lib/auth";
import { useI18n } from "../../src/lib/i18n";
import { useTheme } from "../../src/lib/theme";
import { Button } from "../../src/ui/Button";
import { Field } from "../../src/ui/Field";
import { ErrorBanner, Screen } from "../../src/ui/Screen";

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Screen title="Nova senha">
      <Text style={{ color: colors.mutedFg }}>Defina uma nova senha para continuar.</Text>
      {error ? <ErrorBanner message={error} /> : null}
      <Field label={t.password} value={password} onChangeText={setPassword} secureTextEntry />
      <Button
        label={t.save}
        loading={loading}
        onPress={async () => {
          setLoading(true);
          const result = await updatePassword(password);
          setLoading(false);
          if (result.error) setError(result.error);
          else router.replace("/");
        }}
      />
    </Screen>
  );
}
