import { ClipboardCheck, Database, Search, X } from "@tamagui/lucide-icons-2";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { api, getActiveToken } from "../lib/api";
import { type Palette, usePalette } from "../lib/theme";

/**
 * Fullscreen global search: sasaran + inspeksi, client-side filter.
 * ponytail: no backend search endpoint — fine until lists exceed ~1000.
 */
export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pal = usePalette();
  const styles = mkStyles(pal);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [tab, setTab] = useState<"Semua" | "Sasaran" | "Inspeksi">("Semua");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    AsyncStorage.getItem("kesling_recent_search")
      .then((v: string | null) => setRecent(v ? JSON.parse(v) : []))
      .catch(() => {});
  }, [open]);

  const pushRecent = (term: string) => {
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, 3);
    setRecent(next);
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    AsyncStorage.setItem("kesling_recent_search", JSON.stringify(next)).catch(() => {});
  };

  useEffect(() => {
    if (debounced.length >= 2) pushRecent(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const sasaranQ = useQuery({
    queryKey: ["search-sasaran"],
    queryFn: () => api.sasaran(),
    enabled: open,
    staleTime: 60_000,
  });
  const resultsQ = useQuery({
    queryKey: ["search-results"],
    queryFn: () => api.inspectionResults(1, 100),
    enabled: open,
    staleTime: 60_000,
  });

  const ql = debounced.toLowerCase();
  const sasaranHits = useMemo(
    () =>
      ql.length < 2
        ? []
        : (sasaranQ.data || []).filter(
            (s) => s.nama.toLowerCase().includes(ql) || (s.alamat || "").toLowerCase().includes(ql),
          ),
    [sasaranQ.data, ql],
  );
  const inspectHits = useMemo(
    () =>
      ql.length < 2
        ? []
        : (resultsQ.data?.results || []).filter(
            (r: any) =>
              (r.namaSasaran || "").toLowerCase().includes(ql) || (r.templateName || "").toLowerCase().includes(ql),
          ),
    [resultsQ.data, ql],
  );

  const loading = sasaranQ.isLoading || resultsQ.isLoading;

  const showSasaran = tab !== "Inspeksi";
  const showInspeksi = tab !== "Sasaran";

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.searchRow}>
          <Search size={20} color={pal.sub} />
          <TextInput
            style={styles.input}
            placeholder="Cari sasaran atau inspeksi..."
            placeholderTextColor={pal.sub}
            autoFocus
            value={q}
            onChangeText={setQ}
          />
          {q ? (
            <Pressable onPress={() => setQ("")} hitSlop={8}>
              <X size={18} color={pal.sub} />
            </Pressable>
          ) : null}
          <Pressable onPress={onClose} hitSlop={8} style={{ marginLeft: 8 }}>
            <Text style={styles.cancel}>Tutup</Text>
          </Pressable>
        </View>

        {/* Segmented tabs */}
        <View style={styles.tabs}>
          {(["Semua", "Sasaran", "Inspeksi"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        {/* Recent searches */}
        {ql.length < 2 && recent.length > 0 ? (
          <View>
            <Text style={styles.section}>TERAKHIR</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16 }}>
              {recent.map((r) => (
                <Pressable key={r} onPress={() => setQ(r)} style={styles.recentChip}>
                  <Text style={styles.recentText}>{r}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#00A876" />
          </View>
        ) : ql.length < 2 ? (
          <Text style={styles.hint}>Ketik minimal 2 huruf untuk mencari.</Text>
        ) : sasaranHits.length + inspectHits.length === 0 ? (
          <Text style={styles.hint}>Tidak ditemukan hasil untuk "{debounced}".</Text>
        ) : (
          <Animated.ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {showSasaran && sasaranHits.length > 0 ? <Text style={styles.section}>SASARAN</Text> : null}
            {showSasaran &&
              sasaranHits.map((s, i) => (
                <Animated.View key={s.id} entering={FadeInDown.delay(i * 40)}>
                  <Pressable
                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: pal.accentSoft }]}
                    onPress={() => {
                      onClose();
                      router.push(`/sasaran/${s.id}`);
                    }}
                  >
                    <View style={styles.icon}>
                      <Database size={18} color="#00A876" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{s.nama}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {s.alamat || "—"}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}

            {showInspeksi && inspectHits.length > 0 ? <Text style={styles.section}>INSPEKSI</Text> : null}
            {showInspeksi &&
              inspectHits.map((r: any, i: number) => (
                <Animated.View key={r.id} entering={FadeInDown.delay(i * 40)}>
                  <Pressable
                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: pal.accentSoft }]}
                    onPress={() => {
                      onClose();
                      router.push(`/inspection/result/${r.id}`);
                    }}
                  >
                    <View style={styles.icon}>
                      <ClipboardCheck size={18} color="#00A876" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{r.namaSasaran || r.templateName || `#${r.id}`}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {r.templateName} · {new Date(r.tanggal || r.createdAt).toLocaleDateString("id-ID")}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
          </Animated.ScrollView>
        )}
      </View>
    </Modal>
  );
}

const mkStyles = (pal: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: pal.bg, paddingTop: 60 },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: pal.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: pal.border,
      paddingHorizontal: 14,
      height: 48,
    },
    input: { flex: 1, fontSize: 15, color: pal.text },
    cancel: { color: pal.accent, fontWeight: "700", fontSize: 14 },
    tabs: {
      flexDirection: "row",
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: pal.card,
      borderWidth: 1,
      borderColor: pal.border,
    },
    tabActive: { backgroundColor: pal.accentSoft, borderColor: pal.accent },
    tabText: { fontSize: 12, fontWeight: "600", color: pal.sub },
    tabTextActive: { color: pal.accent },
    recentChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: pal.card,
      borderWidth: 1,
      borderColor: pal.border,
    },
    recentText: { fontSize: 12, color: pal.sub, fontWeight: "600" },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    hint: { textAlign: "center", color: pal.sub, marginTop: 40, fontSize: 14 },
    section: {
      fontSize: 11,
      fontWeight: "800",
      color: pal.sub,
      letterSpacing: 1,
      marginHorizontal: 20,
      marginTop: 16,
      marginBottom: 6,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: pal.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: pal.border,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: pal.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    rowTitle: { fontSize: 15, fontWeight: "600", color: pal.text },
    rowSub: { fontSize: 12.5, color: pal.sub, marginTop: 2 },
  });
