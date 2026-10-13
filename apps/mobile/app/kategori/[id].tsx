import { ArrowLeft, ArrowRight, Check, ClipboardCheck, FileText } from "@tamagui/lucide-icons-2";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FadeIn, ScalePress } from "../../src/components/motion/primitives";
import { api } from "../../src/lib/api";
import { C, katColor } from "../../src/lib/tokens";

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

export default function KategoriDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catId = Number(id);
  const router = useRouter();

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.categories });
  const cat = categories?.find((c) => c.id === catId);
  const kc = katColor(cat?.nama);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.templates(),
    enabled: !!cat,
  });

  const subs = cat?.subCategories ?? [];
  const forms = (Array.isArray(templates) ? templates : []).filter((t) =>
    subs.some((sub) => sub.id === t.subCategoryId),
  );

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* HERO — gradasi gelap aksen kategori */}
      <FadeIn>
        <View style={s.hero}>
          <LinearGradient
            colors={["#0C1B16", "#123527"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1.1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[s.heroBlob, { backgroundColor: kc.color }]} />

          <Pressable onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
            <ArrowLeft size={13} color="#fff" strokeWidth={2.4} />
            <Text style={s.backText}>Kategori</Text>
          </Pressable>

          <Text style={s.heroOverline}>KATEGORI FORMULIR</Text>
          <Text style={s.heroTitle} numberOfLines={2}>
            {cat?.nama || "Kategori"}
          </Text>
          <View style={s.heroMetaRow}>
            <View style={[s.heroChip, { backgroundColor: `${kc.color}30`, borderColor: `${kc.color}55` }]}>
              <FileText size={11} color={kc.soft} strokeWidth={2.2} />
              <Text style={[s.heroChipText, { color: kc.soft }]}>
                {isLoading ? "Memuat..." : `${forms.length} formulir`}
              </Text>
            </View>
          </View>

          <Steps active={1} onDark />
        </View>
      </FadeIn>

      {/* LIST — kartu menyelip ke hero */}
      <View style={s.listWrap}>
        {isLoading ? (
          <Text style={s.loadingText}>Memuat formulir...</Text>
        ) : forms.length ? (
          forms.map((f, i) => (
            <FadeIn key={f.id} delay={70 + i * 50}>
              <ScalePress onPress={() => router.push(`/inspection/sasaran/${f.id}`)}>
                <View style={s.formCard}>
                  <View style={[s.formIcon, { backgroundColor: `${kc.color}14` }]}>
                    <ClipboardCheck size={20} color={kc.color} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={s.formTitle} numberOfLines={2}>
                      {f.nama}
                    </Text>
                    {f.deskripsi ? (
                      <Text style={s.formDesc} numberOfLines={2}>
                        {f.deskripsi}
                      </Text>
                    ) : null}
                    <View style={s.formChips}>
                      <View style={[s.chip, { backgroundColor: `${kc.color}12` }]}>
                        <Text style={[s.chipText, { color: kc.color }]}>{f.requiredFieldCount} pertanyaan</Text>
                      </View>
                      {f.subCategoryName ? (
                        <View style={[s.chip, { backgroundColor: "rgba(28,25,23,0.05)" }]}>
                          <Text style={[s.chipText, { color: C.ink2 }]}>{f.subCategoryName}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={[s.goCircle, { backgroundColor: kc.color }]}>
                    <ArrowRight size={14} color="#fff" strokeWidth={2.6} />
                  </View>
                </View>
              </ScalePress>
            </FadeIn>
          ))
        ) : (
          <FadeIn delay={100}>
            <View style={s.emptyCard}>
              <View style={[s.emptyIcon, { backgroundColor: `${kc.color}12` }]}>
                <ClipboardCheck size={34} color={kc.color} strokeWidth={1.4} />
              </View>
              <Text style={s.emptyTitle}>Belum Ada Formulir</Text>
              <Text style={s.emptyText}>
                Kategori ini belum punya formulir inspeksi. Pilih kategori lain untuk memulai pemeriksaan.
              </Text>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  s.emptyCta,
                  { backgroundColor: kc.color },
                  pressed && { transform: [{ scale: 0.97 }] },
                ]}
              >
                <ArrowLeft size={13} color="#fff" strokeWidth={2.4} />
                <Text style={s.emptyCtaText}>Pilih Kategori Lain</Text>
              </Pressable>
            </View>
          </FadeIn>
        )}
      </View>

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgForm },
  content: { paddingBottom: 48 },

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
  heroTitle: {
    fontSize: 27,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.7,
    lineHeight: 32,
  },
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
  listWrap: { paddingHorizontal: 16, gap: 10 },
  loadingText: { fontSize: 14, color: C.muted, textAlign: "center", marginTop: 48 },

  formCard: {
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
  formIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  formTitle: { fontSize: 14.5, fontWeight: "800", color: C.ink, letterSpacing: -0.2, lineHeight: 19 },
  formDesc: { fontSize: 11.5, color: C.muted, lineHeight: 16 },
  formChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7 },
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
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 8,
    shadowColor: "#1B1917",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: C.ink, letterSpacing: -0.3 },
  emptyText: {
    fontSize: 12.5,
    color: C.ink2,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 280,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 12,
  },
  emptyCtaText: { fontSize: 13, fontWeight: "800", color: "#fff" },
});
