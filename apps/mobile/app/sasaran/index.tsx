import { ArrowLeft, MapPin, Plus, Search, X } from "@tamagui/lucide-icons-2";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { FadeIn, ListSkeleton, ScalePress } from "../../src/components/motion/primitives";
import { api } from "../../src/lib/api";
import { cacheGet, cacheSet, cacheTimestamp } from "../../src/lib/cache";
import { C, katColor } from "../../src/lib/tokens";
import type { Sasaran } from "../../src/types";

const STATUS_CHIPS = ["Semua", "Selesai", "Terjadwal", "Belum"] as const;

export default function SasaranList() {
  const router = useRouter();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [kategori, setKategori] = useState<string>("Semua");
  const [status, setStatus] = useState<string>("Semua");
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sasaran"],
    queryFn: async () => {
      const fresh = await api.sasaran();
      cacheSet("sasaran", fresh);
      return fresh;
    },
    initialData: undefined as never,
    initialDataUpdatedAt: 0,
    retryOnMount: false,
  });

  const [cacheAt, setCacheAt] = useState<number | null>(null);
  useEffect(() => {
    cacheGet<Sasaran[]>("sasaran").then((cached) => {
      if (cached?.length) qc.setQueryData(["sasaran"], cached);
    });
    cacheTimestamp("sasaran").then(setCacheAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kategoriList = useMemo(() => {
    const set = new Set<string>();
    for (const sv of data || []) set.add(sv.kategoriNama || sv.kategori?.nama || "Lainnya");
    return ["Semua", ...Array.from(set)];
  }, [data]);

  const filtered = useMemo(() => {
    const list = data || [];
    const byKat =
      kategori === "Semua"
        ? list
        : list.filter((sv: any) => (sv.kategoriNama || sv.kategori?.nama || "Lainnya") === kategori);
    const byStatus =
      status === "Semua"
        ? byKat
        : status === "Belum"
          ? byKat.filter((sv: any) => !sv.lastInspection)
          : status === "Terjadwal"
            ? byKat.filter((sv: any) => sv.lastInspection?.status === "TERJADWAL")
            : byKat.filter((sv: any) => sv.lastInspection?.status === "SELESAI");
    if (!q) return byStatus;
    const ql = q.toLowerCase();
    return byStatus.filter((sv: any) => sv.nama?.toLowerCase().includes(ql) || sv.alamat?.toLowerCase().includes(ql));
  }, [data, q, kategori, status]);

  const stats = useMemo(() => {
    const list = data || [];
    return {
      done: list.filter((v: any) => v.lastInspection?.status || v.sudahDiperiksa).length,
      todo: list.filter((v: any) => !(v.lastInspection?.status || v.sudahDiperiksa)).length,
    };
  }, [data]);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await refetch();
            setRefreshing(false);
          }}
          tintColor="#D9F99D"
        />
      }
    >
      {/* Hero — gelap, match periksa/kategori/drafts */}
      <FadeIn>
        <View style={s.hero}>
          <LinearGradient
            colors={["#0C1B16", "#123527"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1.1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.heroBlob} />
          <View style={s.heroTop}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
              <ArrowLeft size={13} color="#fff" strokeWidth={2.4} />
              <Text style={s.backText}>Kembali</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/sasaran/new")} hitSlop={8} style={s.addBtn}>
              <Plus size={13} color="#06281E" strokeWidth={2.8} />
              <Text style={s.addText}>Tambah</Text>
            </Pressable>
          </View>
          <Text style={s.heroOverline}>DATA MASTER</Text>
          <Text style={s.heroTitle}>Sasaran</Text>

          <View style={s.statRow}>
            <View style={s.statChip}>
              <Text style={[s.statValue, { color: "#D9F99D" }]}>{data?.length ?? 0}</Text>
              <Text style={s.statLabel}>Terdaftar</Text>
            </View>
            <View style={s.statChip}>
              <Text style={[s.statValue, { color: "#6EE7B7" }]}>{stats.done}</Text>
              <Text style={s.statLabel}>Diperiksa</Text>
            </View>
            <View style={s.statChip}>
              <Text style={[s.statValue, { color: "#FCD34D" }]}>{stats.todo}</Text>
              <Text style={s.statLabel}>Belum</Text>
            </View>
          </View>

          <View style={s.searchWrap}>
            <Search size={15} color="rgba(255,255,255,0.5)" strokeWidth={2.2} />
            <TextInput
              style={s.searchInput}
              placeholder="Cari nama atau alamat..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={q}
              onChangeText={setQ}
            />
            {q ? (
              <Pressable onPress={() => setQ("")} hitSlop={8}>
                <X size={15} color="rgba(255,255,255,0.5)" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </FadeIn>

      {/* Sheet menyelip hero */}
      <View style={s.sheet}>
        {/* Filter chips kategori */}
        <FadeIn delay={40}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterContent}>
            {kategoriList.map((k) => {
              const active = k === kategori;
              const kc = k === "Semua" ? null : katColor(k);
              return (
                <Pressable
                  key={k}
                  onPress={() => setKategori(k)}
                  style={[
                    s.chip,
                    active
                      ? { backgroundColor: kc ? kc.color : C.accent, borderColor: kc ? kc.color : C.accent }
                      : null,
                  ]}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{k}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </FadeIn>

        {/* Filter segmented status */}
        <View style={s.segWrap}>
          {STATUS_CHIPS.map((st) => {
            const active = st === status;
            return (
              <Pressable key={st} onPress={() => setStatus(st)} style={[s.seg, active && s.segActive]}>
                <Text style={[s.segText, active && s.segTextActive]}>{st}</Text>
              </Pressable>
            );
          })}
        </View>

        {cacheAt ? (
          <Text style={s.cacheText}>
            Data per{" "}
            {new Date(cacheAt).toLocaleString("id-ID", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {isLoading ? " · menyegarkan..." : ""}
          </Text>
        ) : null}

        {/* List */}
        <View style={s.listCol}>
          {isLoading ? (
            <ListSkeleton rows={4} />
          ) : filtered.length === 0 ? (
            <FadeIn delay={80}>
              <View style={s.emptyCard}>
                <View style={s.emptyIcon}>
                  <Search size={30} color={C.accent} strokeWidth={1.5} />
                </View>
                <Text style={s.emptyTitle}>Tidak ditemukan</Text>
                <Text style={s.emptyText}>Coba ubah filter atau kata kunci pencarian.</Text>
              </View>
            </FadeIn>
          ) : (
            filtered.map((sv: any, i: number) => {
              const done = !!sv.lastInspection?.status || sv.sudahDiperiksa;
              const prio = sv.prioritas === 1;
              const katNama = sv.kategoriNama || sv.kategori?.nama || "Lainnya";
              const kc = katColor(katNama);
              return (
                <FadeIn key={sv.id} delay={Math.min(70 + i * 45, 500)}>
                  <ScalePress onPress={() => router.push(`/sasaran/${sv.id}` as any)}>
                    <View style={s.card}>
                      <View style={[s.cardIcon, { backgroundColor: `${kc.color}14` }]}>
                        <Text style={[s.cardIconText, { color: kc.color }]}>{(sv.nama || "?")[0].toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={s.cardTitle} numberOfLines={1}>
                          {sv.nama}
                        </Text>
                        {sv.alamat ? (
                          <View style={s.addrRow}>
                            <MapPin size={10} color={C.muted} />
                            <Text style={s.addrText} numberOfLines={1}>
                              {sv.alamat}
                            </Text>
                          </View>
                        ) : null}
                        <View style={s.cardChips}>
                          <View style={[s.chipSm, { backgroundColor: `${kc.color}12` }]}>
                            <Text style={[s.chipSmText, { color: kc.color }]} numberOfLines={1}>
                              {katNama}
                            </Text>
                          </View>
                          <View
                            style={[
                              s.chipSm,
                              { backgroundColor: done ? "rgba(22,163,74,0.10)" : "rgba(217,119,6,0.10)" },
                            ]}
                          >
                            <Text style={[s.chipSmText, { color: done ? C.ok : C.warn }]}>
                              {done ? "Diperiksa" : "Belum"}
                            </Text>
                          </View>
                          {prio ? (
                            <View style={[s.chipSm, { backgroundColor: "rgba(220,38,38,0.08)" }]}>
                              <Text style={[s.chipSmText, { color: C.err }]}>Prioritas</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <View style={[s.goCircle, { backgroundColor: kc.color }]}>
                        <ArrowLeft
                          size={14}
                          color="#fff"
                          strokeWidth={2.6}
                          style={{ transform: [{ rotate: "180deg" }] }}
                        />
                      </View>
                    </View>
                  </ScalePress>
                </FadeIn>
              );
            })
          )}
        </View>
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
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
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
  },
  backText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#BEF264",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  addText: { fontSize: 12, fontWeight: "800", color: "#06281E" },
  heroOverline: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  heroTitle: { fontSize: 27, fontWeight: "900", color: "#fff", letterSpacing: -0.7, lineHeight: 32 },
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

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 14,
    marginTop: 16,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: "#fff", paddingVertical: 0 },

  sheet: { paddingHorizontal: 16, gap: 12, paddingTop: 16 },

  filterContent: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
  },
  chipText: { fontSize: 12, fontWeight: "700", color: C.muted },
  chipTextActive: { color: "#fff" },

  segWrap: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  seg: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  segActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
    shadowColor: C.accent,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  segText: { fontSize: 12, fontWeight: "700", color: C.muted },
  segTextActive: { color: "#fff" },

  cacheText: { fontSize: 11, color: C.muted, paddingHorizontal: 4 },

  listCol: { gap: 10, marginTop: 2 },
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
  cardIconText: { fontSize: 18, fontWeight: "900" },
  cardTitle: { fontSize: 14.5, fontWeight: "800", color: C.ink, letterSpacing: -0.2, lineHeight: 19 },
  addrRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  addrText: { fontSize: 11.5, color: C.muted, flexShrink: 1 },
  cardChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  chipSm: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipSmText: { fontSize: 10, fontWeight: "700" },
  goCircle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },

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
});
