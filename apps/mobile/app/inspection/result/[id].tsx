import { ArrowLeft, CalendarDays, Check, Share2, Trash2, X } from "@tamagui/lucide-icons-2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GaugeChart } from "../../../src/components/motion/GaugeChart";
import { FadeIn } from "../../../src/components/motion/primitives";
import { api, getActiveToken } from "../../../src/lib/api";
import { shareInspectionPdf } from "../../../src/lib/exportPdf";
import { C } from "../../../src/lib/tokens";

const BG = C.bgForm;

export default function InspectionResultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const resultId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();
  const [sharing, setSharing] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/drafts"));

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["inspection-detail", resultId],
    queryFn: () => api.inspectionDetail(resultId),
    enabled: !!resultId,
  });

  const del = useMutation({
    mutationFn: () => api.deleteInspection(resultId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-results"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      Alert.alert("Berhasil", "Hasil pemeriksaan dihapus.");
      router.back();
    },
    onError: (e: any) => Alert.alert("Gagal", String(e?.message ?? e)),
  });

  const groups = useMemo(() => {
    const g = new Map<string, Array<{ pertanyaan: string; value: string | number | null }>>();
    (data?.values || []).forEach((v) => {
      // no grup on detail values — fallback single group, matching web parity
      const key = "JAWABAN PEMERIKSAAN";
      g.set(key, [...(g.get(key) || []), v]);
    });
    return [...g.entries()];
  }, [data]);

  if (isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.loadingText}>Memuat hasil...</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        <View style={s.hero}>
          <LinearGradient
            colors={["#0C1B16", "#123527"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1.1 }}
            style={StyleSheet.absoluteFill}
          />
          <Pressable onPress={back} hitSlop={10} style={s.backBtn}>
            <ArrowLeft size={13} color="#fff" strokeWidth={2.4} />
            <Text style={s.backText}>Draft</Text>
          </Pressable>
          <Text style={s.heroOverline}>HASIL PEMERIKSAAN</Text>
          <Text style={s.heroName}>Detail</Text>
        </View>
        <View style={s.emptyCard}>
          <Text style={s.emptyTitle}>Gagal memuat data pemeriksaan.</Text>
          <Pressable style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Coba Lagi</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const onShare = async () => {
    setSharing(true);
    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Sesi berakhir. Login ulang.");
      await shareInspectionPdf(resultId, token);
    } catch (e: any) {
      Alert.alert("Gagal", e?.message || "Tidak dapat mengekspor PDF.");
    } finally {
      setSharing(false);
    }
  };

  const statusColor =
    data.status === "SELESAI" || data.status === "MEMENUHI" ? C.ok : data.status === "TERJADWAL" ? C.warn : "#00A876";
  const isYa = (v: string) => /^(ya|memenuhi|tidak ada|baik)$/i.test(String(v).trim());

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Hero — gelap gradient, match periksa/kategori/drafts */}
      <FadeIn>
        <View style={s.hero}>
          <LinearGradient
            colors={["#0C1B16", "#123527"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1.1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.heroBlob} />
          <Pressable onPress={back} hitSlop={10} style={s.backBtn}>
            <ArrowLeft size={13} color="#fff" strokeWidth={2.4} />
            <Text style={s.backText}>Draft</Text>
          </Pressable>
          <Text style={s.heroOverline}>HASIL PEMERIKSAAN</Text>
          <Text style={s.heroName} numberOfLines={2}>
            {data.templateName}
          </Text>
          <View style={s.heroMetaRow}>
            <CalendarDays size={11} color="rgba(255,255,255,0.55)" />
            <Text style={s.heroMeta}>
              {new Date(data.tanggal).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              · {data.namaSasaran || "-"}
            </Text>
          </View>

          <View style={s.gaugeCard}>
            {data.skor != null ? (
              <GaugeChart value={data.skor} size={168} strokeWidth={13} />
            ) : (
              <Text style={s.noScore}>{data.status}</Text>
            )}
            <View style={[s.tagChip, { backgroundColor: statusColor }]}>
              <Text style={s.tagText}>{data.status}</Text>
            </View>
          </View>
        </View>
      </FadeIn>

      <View style={s.body}>
        {/* Sasaran */}
        <FadeIn delay={40}>
          <View style={s.section}>
            <Text style={s.sectionLabel}>SASARAN</Text>
            <View style={s.card}>
              <ListRow title="Nama" value={data.namaSasaran || "-"} />
              <View style={s.divider} />
              <ListRow title="Alamat" value={data.alamatSasaran || "-"} />
              <View style={s.divider} />
              <ListRow title="Status" value={data.status} />
            </View>
          </View>
        </FadeIn>

        {/* Catatan */}
        {data.catatan ? (
          <FadeIn delay={60}>
            <View style={s.section}>
              <Text style={s.sectionLabel}>CATATAN</Text>
              <View style={s.card}>
                <Text style={s.catatanText}>{data.catatan}</Text>
              </View>
            </View>
          </FadeIn>
        ) : null}

        {/* Jawaban grouped — Ya/Tidak pills */}
        {groups.map(([label, vals], gi) => (
          <FadeIn key={label} delay={80 + gi * 40}>
            <View style={s.section}>
              <Text style={s.sectionLabel}>{label.toUpperCase()}</Text>
              <View style={s.card}>
                {vals.length ? (
                  vals.map((v, i) => {
                    const yes = isYa(String(v.value ?? ""));
                    return (
                      <View key={i}>
                        <View style={s.qRow}>
                          <View
                            style={[s.qIcon, { backgroundColor: yes ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.08)" }]}
                          >
                            {yes ? (
                              <Check size={12} color={C.ok} strokeWidth={2.5} />
                            ) : (
                              <X size={12} color={C.err} strokeWidth={2.5} />
                            )}
                          </View>
                          <Text style={s.qText}>{v.pertanyaan}</Text>
                          <Text style={[s.qVal, { color: yes ? C.ok : C.err }]} numberOfLines={2}>
                            {String(v.value ?? "-")}
                          </Text>
                        </View>
                        {i < vals.length - 1 ? <View style={s.divider} /> : null}
                      </View>
                    );
                  })
                ) : (
                  <Text style={s.catatanText}>Tidak ada jawaban</Text>
                )}
              </View>
            </View>
          </FadeIn>
        ))}

        {/* Actions */}
        <FadeIn delay={160}>
          <View style={s.actionRow}>
            <Pressable
              onPress={onShare}
              disabled={sharing}
              style={({ pressed }) => [s.shareBtn, (pressed || sharing) && { opacity: 0.7 }]}
            >
              <Share2 size={15} color="#00A876" strokeWidth={2.2} />
              <Text style={s.shareText}>{sharing ? "Menyiapkan..." : "Ekspor PDF"}</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Alert.alert("Hapus", "Hapus hasil pemeriksaan ini?", [
                  { text: "Batal", style: "cancel" },
                  { text: "Hapus", style: "destructive", onPress: () => del.mutate() },
                ])
              }
              style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.6 }]}
            >
              <Trash2 size={17} color={C.err} strokeWidth={2} />
            </Pressable>
          </View>
        </FadeIn>
      </View>

      <View style={{ height: 130 }} />
    </ScrollView>
  );
}

function ListRow({ title, value }: { title: string; value: string }) {
  return (
    <View style={s.listRow}>
      <Text style={s.listKey} numberOfLines={2}>
        {title}
      </Text>
      <Text style={s.listVal} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 130 },
  center: { alignItems: "center", justifyContent: "center" },
  hero: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 28 : 60,
    paddingBottom: 40,
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
  heroName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.6,
    lineHeight: 29,
  },
  heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  heroMeta: { fontSize: 11.5, color: "rgba(255,255,255,0.6)" },
  gaugeCard: {
    alignItems: "center",
    alignSelf: "center",
    marginTop: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 18,
  },
  noScore: { fontSize: 20, fontWeight: "800", color: "#fff", paddingVertical: 40 },
  tagChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5, marginTop: 12 },
  tagText: { fontSize: 11, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  body: { paddingTop: 8 },
  section: { marginTop: 16 },
  sectionWrap: { paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: C.muted,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 18,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  divider: { height: 1, backgroundColor: C.hairline, marginHorizontal: 14 },
  listRow: { paddingHorizontal: 14, paddingVertical: 13, flexDirection: "row", gap: 12 },
  listKey: { flex: 1, fontSize: 13, fontWeight: "500", color: C.ink2 },
  listVal: { flex: 1.2, fontSize: 13, fontWeight: "700", color: C.ink, textAlign: "right" },
  catatanText: { fontSize: 14, color: C.ink, padding: 16, lineHeight: 21 },
  qRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  qIcon: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  qText: { flex: 1, fontSize: 13, color: C.ink2, lineHeight: 17 },
  qVal: { fontSize: 12, fontWeight: "700", maxWidth: 90, textAlign: "right" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 20, marginHorizontal: 16 },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: "rgba(37,99,235,0.2)",
    borderRadius: 14,
    paddingVertical: 13,
  },
  shareText: { fontSize: 14, fontWeight: "700", color: "#00A876" },
  deleteBtn: {
    width: 50,
    backgroundColor: "rgba(220,38,38,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(220,38,38,0.15)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    padding: 32,
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    marginHorizontal: 16,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: C.ink },
  retryBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  loadingText: { fontSize: 14, color: C.muted },
});
