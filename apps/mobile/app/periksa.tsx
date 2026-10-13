import { ArrowLeft, Check, ChevronRight, ClipboardCheck, FileText } from "@tamagui/lucide-icons-2";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FadeIn, ListSkeleton, ScalePress } from "../src/components/motion/primitives";
import { api } from "../src/lib/api";
import { C, katColor } from "../src/lib/tokens";

const katMeta = (nama: string) => {
  const k = katColor(nama);
  return { color: k.color, colorL: k.soft };
};

// steps wizard: Kategori → Formulir → Sasaran → Isi Form
function Steps({ active, onDark }: { active: number; onDark?: boolean }) {
  const steps = ["Kategori", "Formulir", "Sasaran", "Isi Form"];
  return (
    <View style={s.stepsRow}>
      {steps.map((st, i) => {
        const done = i < active;
        const now = i === active;
        return (
          <View key={st} style={s.stepItem}>
            <View style={s.stepInner}>
              <View
                style={[
                  s.stepDot,
                  now && s.stepDotNow,
                  done && s.stepDotDone,
                  !now && !done && (onDark ? s.stepDotTodoDark : s.stepDotTodo),
                ]}
              >
                {done ? (
                  <Check size={9} color="#fff" strokeWidth={3.5} />
                ) : (
                  <Text style={[s.stepNum, { color: now ? "#06281E" : onDark ? "rgba(255,255,255,0.55)" : C.muted }]}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  s.stepLabel,
                  {
                    fontWeight: now ? "800" : "500",
                    color: now ? "#fff" : done ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)",
                  },
                ]}
              >
                {st}
              </Text>
            </View>
            {i < steps.length - 1 ? (
              <View style={[s.stepLine, done && { backgroundColor: "rgba(255,255,255,0.5)" }]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export default function Periksa() {
  const router = useRouter();

  const {
    data: categories,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories,
    retry: 1,
    staleTime: 30_000,
  });
  const { data: templates } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.templates(),
    staleTime: 30_000,
  });
  const cats = Array.isArray(categories) ? categories : [];
  const tpls = Array.isArray(templates) ? templates : [];
  const kats = cats.map((c) => {
    const subIds = new Set((c.subCategories ?? []).map((s) => s.id));
    return {
      id: c.id,
      label: c.nama,
      subCount: tpls.filter((t) => subIds.has(t.subCategoryId)).length,
      ...katMeta(c.nama),
    };
  });
  const totalForm = kats.reduce((a, k) => a + k.subCount, 0);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Hero — match kategori/[id] */}
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
          <Text style={s.heroOverline}>PEMERIKSAAN BARU</Text>
          <Text style={s.heroTitle}>Pilih Kategori</Text>
          <View style={s.heroMetaRow}>
            <View
              style={[s.heroChip, { backgroundColor: "rgba(190,242,100,0.18)", borderColor: "rgba(190,242,100,0.35)" }]}
            >
              <FileText size={11} color="#D9F99D" strokeWidth={2.2} />
              <Text style={[s.heroChipText, { color: "#D9F99D" }]}>
                {kats.length} kategori · {totalForm} formulir
              </Text>
            </View>
          </View>
          <Steps active={0} onDark />
        </View>
      </FadeIn>

      {/* Grid kategori 2 kolom — kartu menyelip ke hero */}
      <View style={s.grid}>
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : isError ? (
          <View style={s.emptyCard}>
            <ClipboardCheck size={40} color={C.muted} strokeWidth={1.5} />
            <Text style={s.emptyText}>Gagal memuat. Coba lagi nanti.</Text>
          </View>
        ) : kats.length === 0 ? (
          <View style={s.emptyCard}>
            <ClipboardCheck size={40} color={C.muted} strokeWidth={1.5} />
            <Text style={s.emptyText}>Belum ada kategori inspeksi</Text>
          </View>
        ) : (
          <View style={s.listCol}>
            {kats.map((k, i) => (
              <FadeIn key={k.id} delay={70 + i * 50}>
                <ScalePress onPress={() => router.push(`/kategori/${k.id}`)}>
                  <View style={s.katCard}>
                    <View style={[s.katIcon, { backgroundColor: `${k.color}14` }]}>
                      <ClipboardCheck size={20} color={k.color} strokeWidth={1.8} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={s.katTitle} numberOfLines={2}>
                        {k.label}
                      </Text>
                      <View style={s.katChips}>
                        <View style={[s.chip, { backgroundColor: `${k.color}12` }]}>
                          <Text style={[s.chipText, { color: k.color }]}>{k.subCount} formulir</Text>
                        </View>
                      </View>
                    </View>
                    <View style={[s.goCircle, { backgroundColor: k.color }]}>
                      <ChevronRight size={14} color="#fff" strokeWidth={2.6} />
                    </View>
                  </View>
                </ScalePress>
              </FadeIn>
            ))}
          </View>
        )}
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgForm },
  content: { paddingBottom: 60 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 28 : 60,
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
    marginBottom: 22,
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
  heroMetaRow: { flexDirection: "row", marginTop: 12 },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  heroChipText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },

  // steps
  stepsRow: { flexDirection: "row", alignItems: "center", marginTop: 24 },
  stepItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepDot: {
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotNow: { backgroundColor: "#fff" },
  stepDotDone: { backgroundColor: "rgba(255,255,255,0.28)" },
  stepDotTodo: { backgroundColor: "rgba(0,0,0,0.08)" },
  stepDotTodoDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  stepNum: { fontSize: 10, fontWeight: "800" },
  stepLabel: { fontSize: 10.5, letterSpacing: 0.1 },
  stepLine: { width: 14, height: 1, backgroundColor: "rgba(255,255,255,0.16)", marginHorizontal: 2 },

  // list menyelip hero
  grid: { padding: 16 },
  listCol: { gap: 10 },
  katCard: {
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
  katIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  katTitle: { fontSize: 14.5, fontWeight: "800", color: C.ink, letterSpacing: -0.2, lineHeight: 19 },
  katChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipText: { fontSize: 10, fontWeight: "700" },
  goCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 32,
    alignItems: "center",
    gap: 10,
    shadowColor: "#1B1917",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyText: { fontSize: 14, color: C.muted, textAlign: "center" },
  loadingText: { fontSize: 14, color: C.muted, textAlign: "center", marginTop: 40 },
});
