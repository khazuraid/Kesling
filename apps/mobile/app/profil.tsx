import { ArrowLeft, ChevronRight, Fingerprint, HelpCircle, LogOut, Moon, Sun } from "@tamagui/lucide-icons-2";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { biometricAvailable, isBiometricEnabled, setBiometricEnabled, useAuth } from "../src/lib/auth";
import { resetOnboarding } from "../src/lib/storage";
import { getTheme, setThemePref, type ThemeName, usePalette } from "../src/lib/theme";

export default function ProfilScreen() {
  const pal = usePalette();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [dark, setDark] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioAvail, setBioAvail] = useState(false);

  useEffect(() => {
    getTheme().then((t: ThemeName) => setDark(t === "dark"));
    biometricAvailable().then(setBioAvail);
    isBiometricEnabled().then(setBioOn);
  }, []);

  const s = mkStyles(pal);

  return (
    <ScrollView style={[s.root, { backgroundColor: pal.bg }]} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Hero — pola sama dengan halaman lain */}
      <View style={s.hero}>
        <LinearGradient
          colors={["#0C1B16", "#123527"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1.1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.heroBlob} />
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
          <ArrowLeft size={13} color="#fff" strokeWidth={2.4} />
          <Text style={s.backText}>Kembali</Text>
        </Pressable>
        <View style={s.userRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(user?.name || "P")[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName} numberOfLines={1}>
              {user?.name}
            </Text>
            <Text style={s.userMeta} numberOfLines={1}>
              {user?.role} · {user?.puskesmasNama || "—"}
            </Text>
          </View>
        </View>
      </View>

      {/* Menu */}
      <View style={s.menuWrap}>
        <Pressable
          style={({ pressed }) => [s.item, pressed && { backgroundColor: pal.accentSoft }]}
          onPress={() => {
            resetOnboarding();
            router.push("/onboarding");
          }}
        >
          <View style={s.itemIcon}>
            <HelpCircle size={18} color="#00A876" />
          </View>
          <Text style={s.itemLabel}>Lihat Kembali Panduan</Text>
          <ChevronRight size={15} color={pal.sub} />
        </Pressable>

        <View style={s.item}>
          <View style={s.itemIcon}>
            {dark ? <Moon size={18} color="#00A876" /> : <Sun size={18} color="#00A876" />}
          </View>
          <Text style={s.itemLabel}>Mode Gelap</Text>
          <Switch
            value={dark}
            onValueChange={(v) => {
              setDark(v);
              setThemePref(v ? "dark" : "light");
            }}
            trackColor={{ true: pal.accent, false: pal.border }}
            thumbColor={pal.card}
          />
        </View>

        {bioAvail ? (
          <View style={s.item}>
            <View style={s.itemIcon}>
              <Fingerprint size={18} color="#00A876" />
            </View>
            <Text style={s.itemLabel}>Login Biometrik</Text>
            <Switch
              value={bioOn}
              onValueChange={(v) => {
                setBioOn(v);
                setBiometricEnabled(v);
              }}
              trackColor={{ true: pal.accent, false: pal.border }}
              thumbColor={pal.card}
            />
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [s.item, pressed && { backgroundColor: "#FEECEB" }]}
          onPress={() => {
            signOut();
            router.replace("/login");
          }}
        >
          <View style={[s.itemIcon, { backgroundColor: "#FEECEB" }]}>
            <LogOut size={18} color="#EF4444" />
          </View>
          <Text style={[s.itemLabel, { color: "#EF4444" }]}>Logout</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const mkStyles = (pal: ReturnType<typeof usePalette>) =>
  StyleSheet.create({
    root: { flex: 1 },
    hero: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === "web" ? 28 : 60,
      paddingBottom: 56,
      overflow: "hidden",
    },
    heroBlob: {
      position: "absolute",
      top: -70,
      right: -60,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: "#00A876",
      opacity: 0.14,
    },
    userRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(255,255,255,0.12)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      alignSelf: "flex-start",
      marginBottom: 18,
    },
    backText: { fontSize: 12, fontWeight: "700", color: "#fff" },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: "rgba(190,242,100,0.2)",
      borderWidth: 1,
      borderColor: "rgba(190,242,100,0.35)",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 22, fontWeight: "800", color: "#D9F99D" },
    userName: { fontSize: 19, fontWeight: "800", color: "#fff", letterSpacing: -0.4 },
    userMeta: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 3 },
    menuWrap: { paddingHorizontal: 16, marginTop: -28, gap: 8 },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: pal.card,
      borderRadius: 18,
      padding: 14,
      shadowColor: "#1B1917",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
    },
    itemIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: pal.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    itemLabel: { fontSize: 14.5, fontWeight: "700", color: pal.text, flex: 1 },
  });
