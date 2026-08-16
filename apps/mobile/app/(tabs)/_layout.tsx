import { CalendarDays, CalendarPlus, ClipboardCheck, Home, Plus } from "@tamagui/lucide-icons-2";
import { Tabs, useRouter } from "expo-router";
import { useState } from "react";
import { ActionSheet } from "../../src/components/motion/ActionSheet";
import { TabBar } from "../../src/components/TabBar";

export default function TabLayout() {
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#00A876",
          tabBarInactiveTintColor: "#8A8580",
        }}
        tabBar={(props) => <TabBar {...props} fabOpen={fabOpen} onFabPress={() => setFabOpen(true)} />}
      >
        <Tabs.Screen
          name="index"
          options={{ title: "Hari Ini", tabBarIcon: ({ color }) => <Home color={color as any} size={22} /> }}
        />
        <Tabs.Screen
          name="jadwal"
          options={{ title: "Jadwal", tabBarIcon: ({ color }) => <CalendarDays color={color as any} size={22} /> }}
        />
        <Tabs.Screen
          name="rekap"
          options={{ title: "Rekap", tabBarIcon: ({ color }) => <ClipboardCheck color={color as any} size={22} /> }}
        />
      </Tabs>

      <ActionSheet
        open={fabOpen}
        onClose={() => setFabOpen(false)}
        title="Aksi Cepat"
        items={[
          {
            icon: <ClipboardCheck size={18} color="#00A876" />,
            label: "Pemeriksaan Baru",
            onPress: () => router.push("/(tabs)/jadwal"),
          },
          {
            icon: <Plus size={18} color="#00A876" />,
            label: "Sasaran Baru",
            onPress: () => router.push("/sasaran/new"),
          },
          {
            icon: <CalendarPlus size={18} color="#00A876" />,
            label: "Generate Jadwal",
            onPress: () => router.push("/(tabs)/jadwal"),
          },
        ]}
      />
    </>
  );
}
