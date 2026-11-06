import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from "@expo-google-fonts/inter";
import { Sora_600SemiBold, Sora_700Bold } from "@expo-google-fonts/sora";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/lib/auth";
import { OrgProvider } from "../src/lib/org";
import { ThemeProvider, useTheme } from "../src/lib/theme";
import { I18nProvider } from "../src/lib/i18n";
import { getSupabase } from "../src/lib/supabase";
import { LoadingBlock } from "../src/ui/Screen";

function RootNavigator() {
  const { theme, colors } = useTheme();
  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "fade",
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const supabase = getSupabase();
      if (!supabase) return;
      if (url.includes("access_token") || url.includes("refresh_token") || url.includes("code=")) {
        await supabase.auth.exchangeCodeForSession(url).catch(async () => {
          const hash = url.split("#")[1] ?? "";
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
        });
      }
    };
    void Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <LoadingBlock label="Carregando..." />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <OrgProvider>
                <RootNavigator />
              </OrgProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
