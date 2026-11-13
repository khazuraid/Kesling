import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Database,
  FileClock,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/lib/api";
import { syncAllDraftsOffline } from "../src/lib/offline-sync";
import { deleteDraftSQLite, getAllDraftsSQLite, type SQLiteDraftRow } from "../src/lib/sqlite-drafts";
import type { InspectionResult } from "../src/types";

type Tab = "draft" | "selesai";
const PER_PAGE = 10;

export default function DraftsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [drafts, setDrafts] = useState<SQLiteDraftRow[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<Tab>("draft");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await getAllDraftsSQLite();
      setDrafts(rows);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const {
    data: results,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["inspection-results"],
    queryFn: () => api.inspectionResults(1, 100),
    enabled: tab === "selesai",
    retry: false,
    staleTime: 60_000,
  });
  const items: InspectionResult[] = Array.isArray((results as any)?.results) ? (results as any).results : [];

  const handleSyncAll = async () => {
    if (drafts.length === 0 || syncing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSyncing(true);

    try {
      const res = await syncAllDraftsOffline();
      await load();
      if (res.synced > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Sinkronisasi Berhasil", `${res.synced} data inspeksi berhasil diunggah ke server cloud Dinkes.`);
      } else if (res.failed > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Sebagian Gagal",
          `${res.failed} data inspeksi belum berhasil disinkronkan. Periksa koneksi internet Anda.`,
        );
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Gagal Sinkronisasi", e?.message || "Koneksi ke server Dinkes terputus.");
    } finally {
      setSyncing(false);
    }
  };

  const confirmDelete = (d: SQLiteDraftRow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Hapus Draft Offline",
      `Hapus draft "${d.namaSasaran || d.templateName || "Inspeksi"}" dari memori HP? Data yang belum sinkron akan hilang permanen.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            await deleteDraftSQLite(d.localId);
            await load();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tab === "selesai") await refetch();
    else await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (tab === "draft") {
      return q
        ? drafts.filter(
            (d) =>
              d.templateName?.toLowerCase().includes(q) ||
              d.namaSasaran?.toLowerCase().includes(q) ||
              d.alamatSasaran?.toLowerCase().includes(q),
          )
        : drafts;
    }
    return q
      ? items.filter((r) => r.templateName?.toLowerCase().includes(q) || r.namaSasaran?.toLowerCase().includes(q))
      : items;
  }, [tab, search, drafts, items]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* 1. Header Bar */}
      <View style={s.topBar}>
        <View style={s.topBarRow}>
          <View>
            <Text style={s.topBarTitle}>Manajemen Inspeksi</Text>
            <Text style={s.topBarSub}>Database SQLite Offline & Riwayat Cloud</Text>
          </View>
          {tab === "draft" && drafts.length > 0 && (
            <Pressable onPress={handleSyncAll} disabled={syncing} style={[s.btnSyncAll, syncing && s.btnSyncDisabled]}>
              {syncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <UploadCloud size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={s.btnSyncText}>Sinkron ({drafts.length})</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* Tab Switcher (48dp Touch Friendly) */}
        <View style={s.tabWrap}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTab("draft");
              setPage(1);
            }}
            style={[s.tabItem, tab === "draft" && s.tabItemActive]}
          >
            <FileClock size={16} color={tab === "draft" ? "#FFFFFF" : "#64748B"} strokeWidth={2.2} />
            <Text style={[s.tabText, tab === "draft" && s.tabTextActive]}>Draft Offline</Text>
            <View style={[s.badgeCount, tab === "draft" ? s.badgeCountActive : s.badgeCountIdle]}>
              <Text style={[s.badgeCountText, tab === "draft" && s.badgeCountTextActive]}>{drafts.length}</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTab("selesai");
              setPage(1);
            }}
            style={[s.tabItem, tab === "selesai" && s.tabItemActive]}
          >
            <CheckCircle2 size={16} color={tab === "selesai" ? "#FFFFFF" : "#64748B"} strokeWidth={2.2} />
            <Text style={[s.tabText, tab === "selesai" && s.tabTextActive]}>Tersinkron Cloud</Text>
            <View style={[s.badgeCount, tab === "selesai" ? s.badgeCountActive : s.badgeCountIdle]}>
              <Text style={[s.badgeCountText, tab === "selesai" && s.badgeCountTextActive]}>{items.length}</Text>
            </View>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={s.searchRow}>
          <Search size={16} color="#64748B" strokeWidth={2.2} />
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
            placeholder="Cari nama sasaran, puskesmas, atau jenis form..."
            placeholderTextColor="#94A3B8"
            style={s.searchInput}
          />
        </View>
      </View>

      {/* 2. Content List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 110 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#047857" />}
      >
        {tab === "draft" ? (
          pageItems.length > 0 ? (
            pageItems.map((d: any) => (
              <View key={d.localId} style={s.draftCard}>
                <View style={s.draftCardHeader}>
                  <View style={s.badgeOffline}>
                    <Database size={12} color="#D97706" strokeWidth={2.4} />
                    <Text style={s.badgeOfflineText}>SQLite Local</Text>
                  </View>
                  <Text style={s.draftDate}>
                    {new Date(d.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>

                <Text style={s.cardSasaranNama}>{d.namaSasaran || "Sasaran Lapangan"}</Text>
                <Text style={s.cardTemplateName}>{d.templateName || `Formulir #${d.templateId}`}</Text>

                {d.alamatSasaran ? <Text style={s.cardAlamat}>{d.alamatSasaran}</Text> : null}

                <View style={s.draftCardFooter}>
                  <Pressable onPress={() => confirmDelete(d)} style={s.btnDeleteDraft} hitSlop={8}>
                    <Trash2 size={16} color="#DC2626" strokeWidth={2.2} />
                    <Text style={s.btnDeleteText}>Hapus</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.push(`/inspection/${d.templateId}?sasaranId=${d.sasaranId || ""}`)}
                    style={s.btnEditDraft}
                  >
                    <Text style={s.btnEditText}>Lanjutkan Isi</Text>
                    <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.4} />
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <View style={s.emptyBox}>
              <View style={s.emptyIconCircle}>
                <FileClock size={32} color="#047857" strokeWidth={1.8} />
              </View>
              <Text style={s.emptyTitle}>Tidak Ada Draft Offline</Text>
              <Text style={s.emptySubtitle}>Semua data inspeksi di HP telah tersinkronkan ke server pusat Dinkes.</Text>
            </View>
          )
        ) : isLoading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="small" color="#047857" />
            <Text style={s.loadingText}>Memuat riwayat cloud Dinkes...</Text>
          </View>
        ) : pageItems.length > 0 ? (
          pageItems.map((r: any) => (
            <Pressable key={r.id} onPress={() => router.push(`/inspection/result/${r.id}`)} style={s.resultCard}>
              <View style={s.resultCardTop}>
                <View style={s.badgeSynced}>
                  <CheckCircle2 size={12} color="#047857" strokeWidth={2.4} />
                  <Text style={s.badgeSyncedText}>Server Cloud</Text>
                </View>
                {r.skor != null && (
                  <View style={s.badgeScore}>
                    <Text style={s.badgeScoreText}>Skor {r.skor}</Text>
                  </View>
                )}
              </View>

              <Text style={s.cardSasaranNama}>{r.namaSasaran || "Sasaran"}</Text>
              <Text style={s.cardTemplateName}>{r.templateName || "Pemeriksaan"}</Text>

              <View style={s.resultCardBottom}>
                <Text style={s.resultDate}>
                  {r.tanggal
                    ? new Date(r.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </Text>
                <View style={s.btnDetail}>
                  <Text style={s.btnDetailText}>Detail IKL</Text>
                  <ChevronRight size={14} color="#047857" strokeWidth={2.4} />
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={s.emptyBox}>
            <View style={s.emptyIconCircle}>
              <CheckCircle2 size={32} color="#047857" strokeWidth={1.8} />
            </View>
            <Text style={s.emptyTitle}>Belum Ada Riwayat Selesai</Text>
            <Text style={s.emptySubtitle}>
              Hasil inspeksi yang telah disinkronkan akan tersimpan aman di server Dinkes.
            </Text>
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 12,
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  topBarSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  btnSyncAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#047857",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnSyncDisabled: {
    opacity: 0.6,
  },
  btnSyncText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  tabWrap: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 4,
    gap: 6,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
    minHeight: 46,
  },
  tabItemActive: {
    backgroundColor: "#047857",
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  badgeCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCountActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  badgeCountIdle: {
    backgroundColor: "#E2E8F0",
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
  },
  badgeCountTextActive: {
    color: "#FFFFFF",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  draftCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#FEF3C7",
    gap: 6,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  draftCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeOffline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeOfflineText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D97706",
  },
  draftDate: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  cardSasaranNama: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  cardTemplateName: {
    fontSize: 13,
    color: "#047857",
    fontWeight: "700",
  },
  cardAlamat: {
    fontSize: 12,
    color: "#64748B",
  },
  draftCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  btnDeleteDraft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  btnDeleteText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  btnEditDraft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#047857",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnEditText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  resultCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeSynced: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSyncedText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#047857",
  },
  badgeScore: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeScoreText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
  },
  resultCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  resultDate: {
    fontSize: 11.5,
    color: "#64748B",
  },
  btnDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  btnDetailText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: 12.5,
    color: "#64748B",
  },
});
