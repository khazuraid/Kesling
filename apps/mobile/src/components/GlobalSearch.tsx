import { ClipboardCheck, Database, Search, X } from "@tamagui/lucide-icons-2";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { api, getActiveToken } from "../lib/api";

/**
 * Fullscreen global search: sasaran + inspeksi, client-side filter.
 * ponytail: no backend search endpoint — fine until lists exceed ~1000.
 */
export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

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

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.searchRow}>
          <Search size={20} color="#8A8580" />
          <TextInput
            style={styles.input}
            placeholder="Cari sasaran atau inspeksi..."
            placeholderTextColor="#8A8580"
            autoFocus
            value={q}
            onChangeText={setQ}
          />
          {q ? (
            <Pressable onPress={() => setQ("")} hitSlop={8}>
              <X size={18} color="#8A8580" />
            </Pressable>
          ) : null}
          <Pressable onPress={onClose} hitSlop={8} style={{ marginLeft: 8 }}>
            <Text style={styles.cancel}>Tutup</Text>
          </Pressable>
        </View>

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
            {sasaranHits.length > 0 ? <Text style={styles.section}>SASARAN</Text> : null}
            {sasaranHits.map((s, i) => (
              <Animated.View key={s.id} entering={FadeInDown.delay(i * 40)}>
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: "#F7F5F2" }]}
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

            {inspectHits.length > 0 ? <Text style={styles.section}>INSPEKSI</Text> : null}
            {inspectHits.map((r: any, i: number) => (
              <Animated.View key={r.id} entering={FadeInDown.delay(i * 40)}>
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: "#F7F5F2" }]}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F5F2", paddingTop: 60 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    paddingHorizontal: 14,
    height: 48,
  },
  input: { flex: 1, fontSize: 15, color: "#1F1D1B" },
  cancel: { color: "#00A876", fontWeight: "700", fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hint: { textAlign: "center", color: "#8A8580", marginTop: 40, fontSize: 14 },
  section: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8A8580",
    letterSpacing: 1,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E6F6F0",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#1F1D1B" },
  rowSub: { fontSize: 12.5, color: "#8A8580", marginTop: 2 },
});
