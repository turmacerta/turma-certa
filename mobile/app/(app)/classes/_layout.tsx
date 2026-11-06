import { Stack } from "expo-router";
import { useTheme } from "../../../src/lib/theme";

export default function ClassesLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
