import { Plus, Search } from "@tamagui/lucide-icons-2";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { FadeIn } from "../../src/components/motion/primitives";
import { api } from "../../src/lib/api";
import { cacheGet, cacheSet, cacheTimestamp } from "../../src/lib/cache";
import type { Sasaran } from "../../src/types";

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
    // stale-while-revalidate: show cache instantly when offline
    retryOnMount: false,
  });

  // hydrate from cache once (offline-first)
  const [cacheAt, setCacheAt] = useState<number | null>(null);
  useEffect(() => {
    cacheGet<Sasaran[]>("sasaran").then((cached) => {
      if (cached && cached.length) qc.setQueryData(["sasaran"], cached);
    });
    cacheTimestamp("sasaran").then(setCacheAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kategoriList = useMemo(() => {
    const set = new Set<string>();
    for (const s of data || []) set.add(s.kategoriNama || s.kategori?.nama || "Lainnya");
    return ["Semua", ...Array.from(set)];
  }, [data]);

  const filtered = useMemo(() => {
    const list = data || [];
    const byKat =
      kategori === "Semua"
        ? list
        : list.filter((s: any) => (s.kategoriNama || s.kategori?.nama || "Lainnya") === kategori);
    const byStatus =
      status === "Semua"
        ? byKat
        : status === "Belum"
          ? byKat.filter((s: any) => !s.lastInspection)
          : status === "Terjadwal"
            ? byKat.filter((s: any) => s.lastInspection?.status === "TERJADWAL")
            : byKat.filter((s: any) => s.lastInspection?.status === "SELESAI");
    if (!q) return byStatus;
    const ql = q.toLowerCase();
    return byStatus.filter((s: any) => s.nama?.toLowerCase().includes(ql) || s.alamat?.toLowerCase().includes(ql));
  }, [data, q, kategori, status]);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backBtn}>‹ Kembali</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Data Sasaran</Text>
        <Pressable onPress={() => router.push("/sasaran/new")} hitSlop={8}>
          <Plus size={24} color="#00A876" />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Search size={16} color="#8A8580" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama atau alamat..."
          placeholderTextColor="#8A8580"
          value={q}
          onChangeText={setQ}
        />
      </View>

      {/* Filter chips status */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 8 }}
      >
        {["Semua", "Selesai", "Terjadwal", "Belum"].map((st) => {
          const active = st === status;
          return (
            <Pressable key={st} onPress={() => setStatus(st)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{st}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Filter chips kategori */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      >
        {kategoriList.map((k) => {
          const active = k === kategori;
          return (
            <Pressable key={k} onPress={() => setKategori(k)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{k}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Offline cache timestamp */}
      {cacheAt ? (
        <Text style={{ fontSize: 11, color: "#8A8580", paddingHorizontal: 16, paddingBottom: 4 }}>
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

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refetch();
              setRefreshing(false);
            }}
            tintColor="#00A876"
          />
        }
      >
        {isLoading ? (
          <Text style={styles.emptyText}>Memuat sasaran...</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>Tidak ada sasaran{q ? ` untuk "${q}"` : ""}.</Text>
        ) : (
          filtered.map((s: any, i: number) => (
            <FadeIn key={s.id} delay={Math.min(i * 30, 300)}>
              <Pressable
                onPress={() => router.push(`/sasaran/${s.id}` as any)}
                style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }], opacity: 0.8 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {s.nama}
                  </Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {s.kategoriNama || s.kategori?.nama || "—"} · {s.alamat || "Tanpa alamat"}
                  </Text>
                </View>
                {s.prioritas === 1 ? <Text style={styles.prioBadge}>⚡</Text> : null}
              </Pressable>
            </FadeIn>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F5F2" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { fontSize: 15, color: "#00A876", fontWeight: "600" },
  pageTitle: { fontSize: 20, fontWeight: "800", color: "#1F1D1B" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECE7E1",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#1F1D1B", padding: 0 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECE7E1",
  },
  chipActive: { backgroundColor: "#E6F6F0", borderColor: "#00A876" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#8A8580" },
  chipTextActive: { color: "#00A876" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECE7E1",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#1F1D1B" },
  cardSub: { fontSize: 12, color: "#8A8580", marginTop: 2 },
  prioBadge: { fontSize: 14 },
  emptyText: { fontSize: 14, color: "#8A8580", textAlign: "center", marginTop: 40 },
});
