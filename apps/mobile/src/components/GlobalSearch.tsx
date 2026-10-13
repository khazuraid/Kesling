import { ChevronRight, ClipboardCheck, Database, Search, X } from "@tamagui/lucide-icons-2";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "../lib/api";
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
      .then((v: string | null) => {
        if (!v) return setRecent([]);
        try {
          const parsed = JSON.parse(v);
          setRecent(Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : []);
        } catch {
          setRecent([]);
        }
      })
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
        {/* Hero — gelap, match pola */}
        <View style={styles.hero}>
          <LinearGradient
            colors={["#0C1B16", "#123527"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1.1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroBlob} />
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroOverline}>PENCARIAN</Text>
              <Text style={styles.heroTitle}>Cari Data</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={15} color="#fff" strokeWidth={2.6} />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <Search size={17} color="rgba(255,255,255,0.55)" strokeWidth={2.2} />
            <TextInput
              style={styles.input}
              placeholder="Cari sasaran atau inspeksi..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              autoFocus
              value={q}
              onChangeText={setQ}
            />
            {q ? (
              <Pressable onPress={() => setQ("")} hitSlop={8} style={styles.clearBtn}>
                <X size={13} color="#fff" strokeWidth={2.6} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Sheet menyelip hero */}
        <View style={styles.sheet}>
          {/* Segmented tabs */}
          <View style={styles.tabs}>
            {(["Semua", "Sasaran", "Inspeksi"] as const).map((t) => {
              const active = tab === t;
              return (
                <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, active && styles.tabActive]}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Recent searches */}
          {ql.length < 2 && recent.length > 0 ? (
            <View>
              <Text style={styles.section}>TERAKHIR DICARI</Text>
              <View style={styles.recentWrap}>
                {recent.map((r) => (
                  <Pressable key={r} onPress={() => setQ(r)} style={styles.recentChip}>
                    <Search size={12} color={pal.sub} />
                    <Text style={styles.recentText}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* Rekomendasi — top sasaran saat query kosong */}
          {ql.length < 2 && !loading ? (
            <View>
              <Text style={styles.section}>SERING DIPERIKSA</Text>
              {(sasaranQ.data || []).slice(0, 4).map((s, i) => (
                <Animated.View key={s.id} entering={FadeInDown.delay(i * 40)}>
                  <Pressable
                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: pal.accentSoft }]}
                    onPress={() => {
                      onClose();
                      router.push(`/sasaran/${s.id}`);
                    }}
                  >
                    <View style={[styles.icon, { backgroundColor: pal.accentSoft }]}>
                      <Database size={18} color={pal.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{s.nama}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {s.alamat || "—"}
                      </Text>
                    </View>
                    <ChevronRight size={15} color={pal.sub} />
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          ) : null}

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={pal.accent} />
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
                      <View style={[styles.icon, { backgroundColor: pal.accentSoft }]}>
                        <Database size={18} color={pal.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{s.nama}</Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {s.alamat || "—"}
                        </Text>
                      </View>
                      <ChevronRight size={15} color={pal.sub} />
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
                      <View style={[styles.icon, { backgroundColor: pal.accentSoft }]}>
                        <ClipboardCheck size={18} color={pal.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{r.namaSasaran || r.templateName || `#${r.id}`}</Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {r.templateName} · {new Date(r.tanggal || r.createdAt).toLocaleDateString("id-ID")}
                        </Text>
                      </View>
                      <ChevronRight size={15} color={pal.sub} />
                    </Pressable>
                  </Animated.View>
                ))}
            </Animated.ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const mkStyles = (pal: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: pal.bg },
    hero: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === "web" ? 24 : 60,
      paddingBottom: 24,
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
    heroTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
    heroOverline: {
      fontSize: 10.5,
      fontWeight: "700",
      color: "rgba(255,255,255,0.55)",
      letterSpacing: 1.4,
      marginBottom: 6,
    },
    heroTitle: { fontSize: 27, fontWeight: "900", color: "#fff", letterSpacing: -0.7, lineHeight: 32 },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "rgba(255,255,255,0.12)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: "rgba(255,255,255,0.10)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.14)",
      borderRadius: 999,
      paddingHorizontal: 16,
      height: 46,
    },
    input: { flex: 1, fontSize: 14, color: "#fff", paddingVertical: 0 },
    clearBtn: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    sheet: { flex: 1, marginTop: -28, paddingTop: 4 },
    // tabs segmented
    tabs: {
      flexDirection: "row",
      gap: 4,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 12,
      backgroundColor: "rgba(0,0,0,0.06)",
      borderRadius: 16,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: pal.card,
      borderWidth: 1,
      borderColor: pal.border,
    },
    tabActive: {
      backgroundColor: pal.accent,
      borderColor: pal.accent,
    },
    tabText: { fontSize: 12, fontWeight: "700", color: pal.sub },
    tabTextActive: { color: "#fff" },
    // recent chips dengan ikon
    recentWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16 },
    recentChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
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
      borderRadius: 20,
      borderWidth: 1,
      borderColor: pal.border,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    rowTitle: { fontSize: 14.5, fontWeight: "800", color: pal.text, letterSpacing: -0.2 },
    rowSub: { fontSize: 11.5, color: pal.sub, marginTop: 2 },
  });
