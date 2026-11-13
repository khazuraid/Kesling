import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  Bell,
  ChevronRight,
  Database,
  Fingerprint,
  HelpCircle,
  Info,
  LogOut,
  Moon,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sun,
  User,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { biometricAvailable, isBiometricEnabled, setBiometricEnabled, useAuth } from "../../src/lib/auth";
import { checkAndApplyUpdates } from "../../src/lib/ota";
import { getAllDraftsSQLite } from "../../src/lib/sqlite-drafts";

export default function AkunScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [bioOn, setBioOn] = useState(false);
  const [bioAvail, setBioAvail] = useState(false);
  const [draftCount, setDraftCount] = useState(0);

  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    biometricAvailable().then(setBioAvail);
    isBiometricEnabled().then(setBioOn);
    getAllDraftsSQLite().then((d) => setDraftCount(d.length));
  }, []);

  const handleCheckUpdate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckingUpdate(true);
    await checkAndApplyUpdates(false);
    setCheckingUpdate(false);
  };

  const handleToggleBiometric = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBioOn(val);
    await setBiometricEnabled(val);
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Konfirmasi Keluar",
      draftCount > 0
        ? `Ada ${draftCount} data draft di HP yang belum disinkronkan ke server. Yakin ingin keluar?`
        : "Apakah Anda yakin ingin keluar dari akun ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/login");
          },
        },
      ],
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* 1. Header Profile Box */}
      <View style={s.topBar}>
        <Text style={s.topBarTitle}>Profil & Pengaturan</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 110 }]}
      >
        {/* User Identity Card */}
        <View style={s.userCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarInitials}>{(user?.name || "Sanitarian")[0].toUpperCase()}</Text>
          </View>
          <View style={s.userMeta}>
            <Text style={s.userName}>{user?.name || "Sanitarian Lapangan"}</Text>
            <Text style={s.userRole}>
              {user?.role || "PETUGAS"} • NIP / ID #{user?.id || 104}
            </Text>
            <View style={s.pkmBadge}>
              <Text style={s.pkmBadgeText}>{user?.puskesmasNama || "PKM Kejaksan Kota Cirebon"}</Text>
            </View>
          </View>
        </View>

        {/* Section: Status Sinkronisasi & SQLite Storage */}
        <View style={s.sectionBox}>
          <Text style={s.sectionTitle}>Penyimpanan & Sinkronisasi</Text>
          <View style={s.rowItem}>
            <View style={s.rowLeft}>
              <Database size={18} color="#047857" strokeWidth={2.2} />
              <View>
                <Text style={s.rowLabel}>Database SQLite Lokal</Text>
                <Text style={s.rowSub}>
                  {draftCount > 0 ? `${draftCount} draft tersimpan offline` : "Semua data sinkron"}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => router.push("/drafts")} style={s.btnMiniDraft}>
              <Text style={s.btnMiniDraftText}>Kelola</Text>
            </Pressable>
          </View>
        </View>

        {/* Section: Keamanan & Perangkat */}
        <View style={s.sectionBox}>
          <Text style={s.sectionTitle}>Keamanan & Akses</Text>

          {bioAvail && (
            <View style={s.rowItem}>
              <View style={s.rowLeft}>
                <Fingerprint size={18} color="#047857" strokeWidth={2.2} />
                <View>
                  <Text style={s.rowLabel}>Kunci Sidik Jari (Biometrik)</Text>
                  <Text style={s.rowSub}>Buka aplikasi cepat tanpa ketik sandi</Text>
                </View>
              </View>
              <Switch
                value={bioOn}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: "#CBD5E1", true: "#A7F3D0" }}
                thumbColor={bioOn ? "#047857" : "#F8FAFC"}
              />
            </View>
          )}

          <View style={s.rowItem}>
            <View style={s.rowLeft}>
              <ShieldCheck size={18} color="#047857" strokeWidth={2.2} />
              <View>
                <Text style={s.rowLabel}>Verifikasi Perangkat Baru</Text>
                <Text style={s.rowSub}>OTP 6-digit aktif untuk keamanan akun</Text>
              </View>
            </View>
            <View style={s.statusPillActive}>
              <Text style={s.statusPillText}>Aktif</Text>
            </View>
          </View>
        </View>

        {/* Section: Informasi Aplikasi */}
        <View style={s.sectionBox}>
          <Text style={s.sectionTitle}>Informasi Aplikasi</Text>
          <View style={s.rowItem}>
            <View style={s.rowLeft}>
              <Smartphone size={18} color="#64748B" strokeWidth={2} />
              <View>
                <Text style={s.rowLabel}>Versi Aplikasi Android</Text>
                <Text style={s.rowSub}>v2.7.4 (Build New Architecture EAS)</Text>
              </View>
            </View>
          </View>

          <View style={s.rowItem}>
            <View style={s.rowLeft}>
              <Info size={18} color="#64748B" strokeWidth={2} />
              <View>
                <Text style={s.rowLabel}>OTA Instant Updates</Text>
                <Text style={s.rowSub}>Pembaruan otomatis dari server Dinkes</Text>
              </View>
            </View>
            <Pressable onPress={handleCheckUpdate} disabled={checkingUpdate} style={s.btnMiniDraft}>
              <Text style={s.btnMiniDraftText}>{checkingUpdate ? "Memeriksa..." : "Cek Update"}</Text>
            </Pressable>
          </View>
        </View>

        {/* Tombol Logout */}
        <Pressable onPress={handleLogout} style={s.btnLogout}>
          <LogOut size={18} color="#DC2626" strokeWidth={2.4} />
          <Text style={s.btnLogoutText}>Keluar dari Akun</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#A7F3D0",
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: "900",
    color: "#047857",
  },
  userMeta: {
    flex: 1,
    gap: 3,
  },
  userName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  userRole: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  pkmBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  pkmBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
  },
  sectionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  rowSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  btnMiniDraft: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  btnMiniDraftText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  statusPillActive: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#047857",
  },
  btnLogout: {
    minHeight: 50,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  btnLogoutText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
  },
});
