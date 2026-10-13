import { ArrowLeft, CheckCircle2, ChevronRight, FileClock, Search, Trash2 } from "@tamagui/lucide-icons-2";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
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
import { FadeIn, ListSkeleton, ScalePress } from "../src/components/motion/primitives";
import { SyncButton, type SyncState } from "../src/components/motion/SyncButton";
import { api } from "../src/lib/api";
import { type Draft, getDrafts, removeDraft } from "../src/lib/drafts";
import { C } from "../src/lib/tokens";
import type { InspectionResult } from "../src/types";

type Tab = "draft" | "selesai";
const PER_PAGE = 10;

export default function DraftsScreen() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [tab, setTab] = useState<Tab>("draft");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setDrafts(await getDrafts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const {
    data: results,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["inspection-results"],
    queryFn: () => api.inspectionResults(1, 100),
    enabled: tab === "selesai",
    retry: false,
    staleTime: 60_000,
  });
  const items: InspectionResult[] = Array.isArray((results as any)?.results) ? (results as any).results : [];

  const syncOne = async (d: Draft) => {
    try {
      await api.offlineSync({
        templateId: d.templateId,
        localId: d.localId,
        values: d.values,
        fieldValues: d.fieldValues,
        photos: d.photos,
        signature: d.signature,
        sasaranId: d.sasaranId,
        createdAt: d.createdAt,
      });
      await removeDraft(d.localId);
      return true;
    } catch {
      return false;
    }
  };

  const syncAll = async () => {
    setSyncState("syncing");
    let ok = 0;
    for (const d of drafts) {
      if (await syncOne(d)) ok++;
    }
    await load();
    setSyncState("done");
    setTimeout(() => setSyncState("idle"), 1600);
    if (ok < drafts.length) Alert.alert("Sinkron", `${ok} dari ${drafts.length} draft tersinkron.`);
  };

  const confirmDelete = (d: Draft) => {
    Alert.alert("Hapus Draft", `Hapus draft "${d.templateName || "Pemeriksaan"}"?`, [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => removeDraft(d.localId).then(load) },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (tab === "selesai") await refetch();
    else await load();
    setRefreshing(false);
  };

  const filled = (d: Draft) => Object.values(d.fieldValues || {}).filter((v) => v && v.trim() !== "").length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (tab === "draft") {
      return q
        ? drafts.filter((d) => d.templateName?.toLowerCase().includes(q) || d.values?.nama?.toLowerCase().includes(q))
        : drafts;
    }
    return q
      ? items.filter((r) => r.templateName?.toLowerCase().includes(q) || r.namaSasaran?.toLowerCase().includes(q))
      : items;
  }, [tab, search, drafts, items]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const emptyCard = (title: string, desc: string, IconComp: typeof FileClock) => (
    <FadeIn delay={120}>
      <View style={s.emptyCard}>
        <View style={s.emptyIcon}>
          <IconComp size={30} color={C.accent} strokeWidth={1.5} />
        </View>
        <Text style={s.emptyTitle}>{title}</Text>
        <Text style={s.emptyText}>{desc}</Text>
      </View>
    </FadeIn>
  );

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D9F99D" />}
    >
      {/* Hero — gelap, match periksa/kategori */}
      <FadeIn>
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
          <Text style={s.heroOverline}>PEMERIKSAAN</Text>
          <Text style={s.heroTitle}>Draft & Hasil</Text>
          <Text style={s.heroSub}>Lanjutkan isian offline atau lihat pemeriksaan selesai</Text>

          <View style={s.statRow}>
            <View style={s.statChip}>
              <Text style={[s.statValue, { color: "#FCD34D" }]}>{drafts.length}</Text>
              <Text style={s.statLabel}>Belum selesai</Text>
            </View>
            <View style={s.statChip}>
              <Text style={[s.statValue, { color: "#6EE7B7" }]}>{items.length}</Text>
              <Text style={s.statLabel}>Selesai</Text>
            </View>
            <View style={s.statChip}>
              <Text style={[s.statValue, { color: "#D9F99D" }]}>{drafts.length + items.length}</Text>
              <Text style={s.statLabel}>Total</Text>
            </View>
          </View>
        </View>
      </FadeIn>

      {/* Sheet menyelip hero */}
      <View style={s.sheet}>
        {/* Tabs */}
        <FadeIn delay={40}>
          <View style={s.tabWrap}>
            {(["draft", "selesai"] as Tab[]).map((t) => {
              const active = tab === t;
              const n = t === "draft" ? drafts.length : items.length;
              return (
                <Pressable
                  key={t}
                  style={[s.tabBtn, active && s.tabBtnActive]}
                  onPress={() => {
                    setTab(t);
                    setPage(1);
                  }}
                >
                  {t === "draft" ? (
                    <FileClock size={15} color={active ? "#fff" : C.muted} strokeWidth={2.2} />
                  ) : (
                    <CheckCircle2 size={15} color={active ? "#fff" : C.muted} strokeWidth={2.2} />
                  )}
                  <Text style={[s.tabText, active && s.tabTextActive]}>{t === "draft" ? "Draft" : "Selesai"}</Text>
                  <View style={[s.tabBadge, active ? s.tabBadgeActive : s.tabBadgeIdle]}>
                    <Text style={[s.tabBadgeText, active && s.tabBadgeTextActive]}>{n}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </FadeIn>

        {/* Search */}
        <FadeIn delay={80}>
          <View style={s.searchWrap}>
            <Search size={16} color={C.muted} strokeWidth={2.2} />
            <TextInput
              style={s.searchInput}
              placeholder="Cari pemeriksaan atau sasaran..."
              placeholderTextColor={C.muted}
              value={search}
              onChangeText={(v) => {
                setSearch(v);
                setPage(1);
              }}
            />
          </View>
        </FadeIn>

        {/* Sync all */}
        {tab === "draft" && drafts.length > 0 ? (
          <FadeIn delay={100}>
            <SyncButton
              state={syncState}
              label={`Sinkronkan Semua (${drafts.length})`}
              syncingLabel="Menyinkron..."
              doneLabel="Tersinkron"
              onPress={syncAll}
            />
          </FadeIn>
        ) : null}

        {/* List */}
        <View style={s.listCol}>
          {tab === "draft" ? (
            pageItems.length > 0 ? (
              pageItems.map((d, i) => (
                <FadeIn key={d.localId} delay={110 + i * 45}>
                  <ScalePress onPress={() => router.push(`/draft/edit/${d.localId}` as any)}>
                    <View style={s.card}>
                      <View style={[s.cardIcon, { backgroundColor: "rgba(217,119,6,0.12)" }]}>
                        <FileClock size={20} color={C.warn} strokeWidth={1.8} />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={s.cardTitle} numberOfLines={1}>
                          {d.templateName || `Pemeriksaan #${d.templateId}`}
                        </Text>
                        <Text style={s.cardSub} numberOfLines={1}>
                          {d.values?.nama || "-"} ·{" "}
                          {new Date(d.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </Text>
                        <View style={s.cardChips}>
                          <View style={[s.chip, { backgroundColor: "rgba(217,119,6,0.10)" }]}>
                            <Text style={[s.chipText, { color: C.warn }]}>{filled(d)} field terisi</Text>
                          </View>
                        </View>
                      </View>
                      <Pressable style={s.delBtn} hitSlop={8} onPress={() => confirmDelete(d)}>
                        <Trash2 size={16} color={C.err} strokeWidth={2} />
                      </Pressable>
                      <View style={[s.goCircle, { backgroundColor: C.accent }]}>
                        <ChevronRight size={14} color="#fff" strokeWidth={2.6} />
                      </View>
                    </View>
                  </ScalePress>
                </FadeIn>
              ))
            ) : (
              emptyCard(
                "Tidak ada draft",
                search
                  ? "Tidak ada draft yang cocok dengan pencarian."
                  : "Draft pemeriksaan offline akan muncul di sini.",
                FileClock,
              )
            )
          ) : isLoading ? (
            <ListSkeleton rows={4} />
          ) : error ? (
            emptyCard("Gagal memuat", "Periksa koneksi lalu tarik ke bawah untuk coba lagi.", FileClock)
          ) : pageItems.length > 0 ? (
            pageItems.map((r, i) => (
              <FadeIn key={r.id} delay={110 + i * 45}>
                <ScalePress onPress={() => router.push(`/inspection/result/${r.id}`)}>
                  <View style={s.card}>
                    <View style={[s.cardIcon, { backgroundColor: "rgba(22,163,74,0.12)" }]}>
                      <CheckCircle2 size={20} color={C.ok} strokeWidth={1.8} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={s.cardTitle} numberOfLines={1}>
                        {r.templateName || "Pemeriksaan"}
                      </Text>
                      <Text style={s.cardSub} numberOfLines={1}>
                        {r.namaSasaran || "-"} ·{" "}
                        {r.tanggal
                          ? new Date(r.tanggal).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </Text>
                      {r.skor != null ? (
                        <View style={s.cardChips}>
                          <View style={[s.chip, { backgroundColor: "rgba(22,163,74,0.10)" }]}>
                            <Text style={[s.chipText, { color: C.ok }]}>Skor {r.skor}</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                    <View style={[s.goCircle, { backgroundColor: C.ok }]}>
                      <ChevronRight size={14} color="#fff" strokeWidth={2.6} />
                    </View>
                  </View>
                </ScalePress>
              </FadeIn>
            ))
          ) : (
            emptyCard(
              "Belum ada pemeriksaan",
              search ? "Tidak ada hasil yang cocok." : "Pemeriksaan yang sudah selesai akan muncul di sini.",
              CheckCircle2,
            )
          )}
        </View>

        {/* Paging */}
        {totalPages > 1 ? (
          <View style={s.pagingRow}>
            <Pressable
              style={[s.pageBtn, safePage <= 1 && s.pageBtnDisabled]}
              disabled={safePage <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Text style={s.pageBtnText}>‹ Sebelumnya</Text>
            </Pressable>
            <Text style={s.pageText}>
              {safePage} / {totalPages}
            </Text>
            <Pressable
              style={[s.pageBtn, safePage >= totalPages && s.pageBtnDisabled]}
              disabled={safePage >= totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <Text style={s.pageBtnText}>Berikutnya ›</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={{ height: 130 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgForm },
  content: { paddingBottom: 130 },

  hero: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 28 : 60,
    paddingBottom: 32,
    overflow: "hidden",
  },
  heroBlob: {
    position: "absolute",
    top: -80,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#00A876",
    opacity: 0.14,
  },
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
    marginBottom: 20,
  },
  backText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  heroOverline: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  heroTitle: { fontSize: 27, fontWeight: "900", color: "#fff", letterSpacing: -0.7, lineHeight: 32 },
  heroSub: { fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginTop: 6, lineHeight: 18 },
  statRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  statChip: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  statValue: { fontSize: 18, fontWeight: "800", lineHeight: 18, fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 3, lineHeight: 12 },

  sheet: { paddingHorizontal: 16, gap: 12, paddingTop: 16 },

  tabWrap: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  tabBtnActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
    shadowColor: C.accent,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  tabText: { fontSize: 13, fontWeight: "700", color: C.muted },
  tabTextActive: { color: "#fff" },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  tabBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  tabBadgeIdle: { backgroundColor: "rgba(0,0,0,0.07)" },
  tabBadgeText: { fontSize: 10, fontWeight: "800", color: C.muted },
  tabBadgeTextActive: { color: "#fff" },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    borderRadius: 999,
    paddingHorizontal: 16,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.ink, paddingVertical: 0 },

  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: C.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  syncBtnDisabled: { opacity: 0.6 },
  syncText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  listCol: { gap: 10, marginTop: 4 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#1B1917",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14.5, fontWeight: "800", color: C.ink, letterSpacing: -0.2, lineHeight: 19 },
  cardSub: { fontSize: 11.5, color: C.muted, lineHeight: 16 },
  cardChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipText: { fontSize: 10, fontWeight: "700" },
  goCircle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  delBtn: {
    width: 34,
    height: 34,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 8,
    shadowColor: "#1B1917",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginTop: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(0,168,118,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: C.ink, letterSpacing: -0.3 },
  emptyText: { fontSize: 12.5, color: C.ink2, textAlign: "center", lineHeight: 19, maxWidth: 280 },
  loadingText: { fontSize: 14, color: C.muted, textAlign: "center", marginTop: 40 },

  pagingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 8 },
  pageText: { fontSize: 13, fontWeight: "600", color: C.muted },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, fontWeight: "700", color: C.ink },
});
