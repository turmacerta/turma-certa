import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "../src/lib/auth";
import { useOrg } from "../src/lib/org";
import { useI18n } from "../src/lib/i18n";
import { Button } from "../src/ui/Button";
import { ErrorBanner, LoadingBlock, Screen } from "../src/ui/Screen";

export default function Index() {
  const { status, clearKick, signOut } = useAuth();
  const { needsOnboarding, persona, isStaff, isPlatformAdmin } = useOrg();
  const { t } = useI18n();

  if (status === "loading") return <LoadingBlock />;
  if (status === "kicked") {
    return (
      <Screen brand>
        <ErrorBanner message={t.sessionReplaced} />
        <Button
          label={t.signIn}
          onPress={() => {
            clearKick();
            void signOut();
          }}
        />
      </Screen>
    );
  }
  if (status === "signedOut") return <Redirect href="/(auth)/login" />;
  if (status === "needsVerify") return <Redirect href="/(auth)/verify" />;
  if (status === "needs2fa") return <Redirect href="/(auth)/two-factor" />;
  if (needsOnboarding) return <Redirect href="/(onboarding)" />;
  if (persona === "student" && !isPlatformAdmin) return <Redirect href="/(app)/portal" />;
  if (isStaff && persona === "teacher" && !isPlatformAdmin) return <Redirect href="/(app)/schedule" />;
  if (isStaff || isPlatformAdmin) return <Redirect href="/(app)/home" />;
  return <View />;
}
