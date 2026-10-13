import { ClipboardCheck, ClipboardList, Home } from "@tamagui/lucide-icons-2";
import { Tabs, useRouter } from "expo-router";
import { TabBar } from "../../src/components/TabBar";
import { C } from "../../src/lib/tokens";

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted,
      }}
      tabBar={(props) => <TabBar {...props} onFabPress={() => router.push("/periksa")} />}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Beranda", tabBarIcon: ({ color }) => <Home color={color as any} size={22} /> }}
      />
      <Tabs.Screen
        name="pemeriksaan"
        options={{ title: "Draft", tabBarIcon: ({ color }) => <ClipboardList color={color as any} size={22} /> }}
      />
      <Tabs.Screen
        name="rekap"
        options={{ title: "Rekap", tabBarIcon: ({ color }) => <ClipboardCheck color={color as any} size={22} /> }}
      />
    </Tabs>
  );
}
