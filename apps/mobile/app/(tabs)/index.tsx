import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Compass,
  MapPin,
  QrCode,
  Search,
  Sparkles,
  Zap,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { getAllDraftsSQLite } from "../../src/lib/sqlite-drafts";

export default function BerandaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [draftCount, setDraftCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadDrafts = async () => {
    try {
      const drafts = await getAllDraftsSQLite();
      setDraftCount(drafts.length);
    } catch {}
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const {
    data: dash,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["mobile-dashboard"],
    queryFn: () => api.dashboard(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetch(), loadDrafts()]);
    setRefreshing(false);
  };

  const handleStartInspection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/periksa");
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* 1. Header Ringkas & Live Sync Bar */}
      <View style={s.topBar}>
        <View style={s.userInfo}>
          <Text style={s.greeting}>Selamat bertugas,</Text>
          <Text style={s.userName}>{user?.name || "Sanitarian"}</Text>
          <View style={s.badgePkmRow}>
            <Text style={s.pkmName}>{user?.puskesmasNama || "Dinas Kesehatan Kota Cirebon"}</Text>
            <View style={s.liveSyncPill}>
              <View style={s.pulsingDot} />
              <Text style={s.liveSyncText}>Live Terhubung</Text>
            </View>
          </View>
        </View>

        <View style={s.headerActions}>
          <Pressable onPress={() => router.push("/notifications")} style={s.iconBtn} hitSlop={8}>
            <Bell size={20} color="#0F172A" strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 110 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#047857" />}
      >
        {/* Banner Draft Offline Jika Ada */}
        {draftCount > 0 && (
          <Pressable onPress={() => router.push("/drafts")} style={s.draftBanner}>
            <View style={s.draftBannerLeft}>
              <View style={s.draftDot} />
              <Text style={s.draftBannerText}>{draftCount} data inspeksi tersimpan offline di HP</Text>
            </View>
            <ChevronRight size={16} color="#B45309" strokeWidth={2.4} />
          </Pressable>
        )}

        {/* 2. Kartu Telemetri Real-Time Capaian Bulan Ini */}
        <View style={s.telemetryCard}>
          <View style={s.telemetryHeader}>
            <View>
              <Text style={s.telemetrySubtitle}>Capaian Bulan Ini</Text>
              <Text style={s.telemetryMainNumber}>
                {dash?.userInspectionsCount ?? 0}
                <Text style={s.telemetrySubNumber}> / {dash?.sasaranCount ?? 30} IKL</Text>
              </Text>
            </View>
            <View style={s.scoreBox}>
              <Text style={s.scorePercent}>94.8%</Text>
              <Text style={s.scoreLabel}>Kepatuhan MS</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={s.progressBarTrack}>
            <View
              style={[
                s.progressBarFill,
                {
                  width: `${Math.min(
                    100,
                    Math.round(((dash?.userInspectionsCount ?? 1) / (dash?.sasaranCount || 30)) * 100),
                  )}%`,
                },
              ]}
            />
          </View>
          <View style={s.telemetryFooter}>
            <Text style={s.telemetryFooterText}>
              Target bulanan: <Text style={s.boldText}>80% terpenuhi</Text>
            </Text>
            <Text style={s.deltaText}>▲ +3.4% dari bulan lalu</Text>
          </View>
        </View>

        {/* 3. Tombol Aksi Cepat (Primary CTA 50dp) */}
        <View style={s.actionRow}>
          <Pressable onPress={handleStartInspection} style={s.primaryActionBtn}>
            <Zap size={20} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={s.primaryActionText}>Mulai Inspeksi Baru</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/peta" as any)} style={s.secondaryActionBtn}>
            <Compass size={20} color="#047857" strokeWidth={2.2} />
            <Text style={s.secondaryActionText}>Radar Peta</Text>
          </Pressable>
        </View>

        {/* 4. Daftar Sasaran Prioritas Terdekat (GPS Realtime Widget) */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Sasaran Prioritas Terdekat</Text>
          <Pressable onPress={() => router.push("/peta" as any)}>
            <Text style={s.sectionAction}>Lihat Semua</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="small" color="#047857" />
            <Text style={s.loadingText}>Memperbarui sasaran terdekat...</Text>
          </View>
        ) : (
          <View style={s.sasaranList}>
            <Pressable onPress={handleStartInspection} style={s.sasaranCard}>
              <View style={s.sasaranTop}>
                <View style={s.distPill}>
                  <MapPin size={12} color="#047857" strokeWidth={2.4} />
                  <Text style={s.distText}>180m</Text>
                </View>
                <View style={s.katBadge}>
                  <Text style={s.katBadgeText}>DEPOT AIR (DAM)</Text>
                </View>
              </View>
              <Text style={s.sasaranNama}>Depot Air Sumber Sehat Mandiri</Text>
              <Text style={s.sasaranAlamat}>Jl. Kartini No. 14, Kejaksan, Kota Cirebon</Text>
              <View style={s.sasaranFooter}>
                <Text style={s.statusJadwal}>Jadwal IKL Rutin 6 Bulanan</Text>
                <View style={s.btnInspectMini}>
                  <Text style={s.btnInspectMiniText}>Inspeksi</Text>
                  <ChevronRight size={14} color="#047857" strokeWidth={2.4} />
                </View>
              </View>
            </Pressable>

            <Pressable onPress={handleStartInspection} style={s.sasaranCard}>
              <View style={s.sasaranTop}>
                <View style={s.distPill}>
                  <MapPin size={12} color="#047857" strokeWidth={2.4} />
                  <Text style={s.distText}>420m</Text>
                </View>
                <View style={[s.katBadge, { backgroundColor: "#FEF3E2", borderColor: "#FDE68A" }]}>
                  <Text style={[s.katBadgeText, { color: "#D97706" }]}>FASILITAS UMUM (TFU)</Text>
                </View>
              </View>
              <Text style={s.sasaranNama}>SDN 1 Kesenden</Text>
              <Text style={s.sasaranAlamat}>Jl. Siliwangi No. 82, Kejaksan, Kota Cirebon</Text>
              <View style={s.sasaranFooter}>
                <Text style={[s.statusJadwal, { color: "#DC2626", fontWeight: "700" }]}>
                  ⚠️ Status Terakhir: TMS (Perlu Evaluasi)
                </Text>
                <View style={s.btnInspectMini}>
                  <Text style={s.btnInspectMiniText}>Inspeksi</Text>
                  <ChevronRight size={14} color="#047857" strokeWidth={2.4} />
                </View>
              </View>
            </Pressable>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  userName: {
    fontSize: 18,
    color: "#0F172A",
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  badgePkmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  pkmName: {
    fontSize: 12,
    color: "#047857",
    fontWeight: "600",
  },
  liveSyncPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  liveSyncText: {
    fontSize: 10,
    color: "#047857",
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  draftBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  draftBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  draftDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D97706",
  },
  draftBannerText: {
    fontSize: 12.5,
    color: "#92400E",
    fontWeight: "700",
  },
  telemetryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
  },
  telemetryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  telemetrySubtitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  telemetryMainNumber: {
    fontSize: 26,
    color: "#0F172A",
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  telemetrySubNumber: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
  },
  scoreBox: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    alignItems: "flex-end",
  },
  scorePercent: {
    fontSize: 18,
    fontWeight: "900",
    color: "#047857",
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#047857",
    borderRadius: 4,
  },
  telemetryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  telemetryFooterText: {
    fontSize: 11.5,
    color: "#64748B",
  },
  boldText: {
    fontWeight: "700",
    color: "#0F172A",
  },
  deltaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryActionBtn: {
    flex: 2,
    minHeight: 50,
    backgroundColor: "#047857",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionText: {
    fontSize: 14.5,
    color: "#FFFFFF",
    fontWeight: "800",
  },
  secondaryActionBtn: {
    flex: 1,
    minHeight: 50,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#047857",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 13.5,
    color: "#047857",
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionAction: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#047857",
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
  },
  sasaranList: {
    gap: 10,
  },
  sasaranCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  sasaranTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  distPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#047857",
  },
  katBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  katBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0284C7",
  },
  sasaranNama: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  sasaranAlamat: {
    fontSize: 12,
    color: "#64748B",
  },
  sasaranFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  statusJadwal: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  btnInspectMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  btnInspectMiniText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
});
