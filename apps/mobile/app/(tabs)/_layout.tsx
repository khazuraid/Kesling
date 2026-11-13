import { Tabs, useRouter } from "expo-router";
import { TabBar } from "../../src/components/TabBar";

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <TabBar {...props} onFabPress={() => router.push("/periksa")} />}
    >
      <Tabs.Screen name="index" options={{ title: "Beranda" }} />
      <Tabs.Screen name="pemeriksaan" options={{ title: "Inspeksi" }} />
      <Tabs.Screen name="peta" options={{ title: "Peta" }} />
      <Tabs.Screen name="akun" options={{ title: "Akun" }} />
      {/* Hide legacy tab if any */}
      <Tabs.Screen
        name="rekap"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
