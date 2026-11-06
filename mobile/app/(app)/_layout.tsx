import { Tabs } from "expo-router";
import {
  BookOpenCheck,
  CalendarDays,
  CalendarSync,
  House,
  LayoutGrid,
  Package,
  User,
  Volleyball,
} from "lucide-react-native";
import { useOrg } from "../../src/lib/org";
import { useI18n } from "../../src/lib/i18n";
import { useTheme } from "../../src/lib/theme";

export default function AppLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { persona, isPlatformAdmin } = useOrg();
  const student = persona === "student" && !isPlatformAdmin;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedFg,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t.home,
          href: student ? null : "/home",
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: t.schedule,
          href: student ? null : "/schedule",
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: t.classes,
          href: student ? null : "/classes",
          tabBarIcon: ({ color, size }) => <Volleyball color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="portal"
        options={{
          title: t.home,
          href: student ? "/portal" : null,
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: t.lessons,
          href: student ? "/lessons" : null,
          tabBarIcon: ({ color, size }) => <BookOpenCheck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="makeup"
        options={{
          title: t.makeup,
          href: student ? "/makeup" : null,
          tabBarIcon: ({ color, size }) => <CalendarSync color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: t.plan,
          href: student ? "/plan" : null,
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Mais",
          href: student ? null : "/more",
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t.account,
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="students/index" options={{ href: null }} />
      <Tabs.Screen name="students/[id]" options={{ href: null }} />
      <Tabs.Screen name="teachers/index" options={{ href: null }} />
      <Tabs.Screen name="packages/index" options={{ href: null }} />
      <Tabs.Screen name="billing/index" options={{ href: null }} />
      <Tabs.Screen name="team/index" options={{ href: null }} />
      <Tabs.Screen name="settings/index" options={{ href: null }} />
      <Tabs.Screen name="network/index" options={{ href: null }} />
    </Tabs>
  );
}
