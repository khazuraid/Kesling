import { ArrowLeft, ArrowRight, Check, ClipboardCheck, MapPin, Plus, Search } from "@tamagui/lucide-icons-2";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { FadeIn, ScalePress } from "../../../src/components/motion/primitives";
import { api } from "../../../src/lib/api";
import { C, katColor } from "../../../src/lib/tokens";

function Steps({ active }: { active: number }) {
  const steps = ["Kategori", "Formulir", "Sasaran", "Isi Form"];
  return (
    <View style={s.stepsRow}>
      {steps.map((st, i) => {
        const done = i < active;
        const now = i === active;
        return (
          <View key={st} style={s.stepItem}>
            <View style={s.stepInner}>
              <View style={[s.stepDot, now && s.stepDotNow, done && s.stepDotDone, !now && !done && s.stepDotTodo]}>
                {done ? (
                  <Check size={9} color="#fff" strokeWidth={3.5} />
                ) : (
                  <Text style={[s.stepNum, { color: now ? "#06281E" : "rgba(255,255,255,0.55)" }]}>{i + 1}</Text>
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

export default function PilihSasaranScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const tid = Number(templateId);
  const router = useRouter();
  const [query, setQuery] = useState("");

  const { data: template } = useQuery({
    queryKey: ["template", tid],
    queryFn: () => api.templateDetail(tid),
    enabled: !!tid,
  });

  const { data: sasarans, isLoading } = useQuery({
    queryKey: ["sasaran", template?.subCategoryId],
    queryFn: () => api.sasaran(template?.subCategoryId ?? undefined),
    enabled: !!template,
  });

  const kc = katColor(template?.subCategoryName ?? template?.nama);
  const list = (sasarans ?? []).filter((sa) => sa.nama.toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content} stickyHeaderIndices={[1]}>
        {/* HERO — gradasi gelap, steps onDark */}
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
              <Text style={s.backText}>Formulir</Text>
            </Pressable>

            <Text style={s.heroOverline}>PILIH SASARAN</Text>
            <Text style={s.heroTitle}>Lokasi Inspeksi</Text>
            <View style={s.heroMetaRow}>
              <View style={[s.heroChip, { backgroundColor: `${kc.color}30`, borderColor: `${kc.color}55` }]}>
                <ClipboardCheck size={11} color={kc.soft} strokeWidth={2.2} />
                <Text style={[s.heroChipText, { color: kc.soft }]} numberOfLines={1}>
                  {template?.nama ?? "Formulir"}
                </Text>
              </View>
            </View>

            <Steps active={2} />
          </View>
        </FadeIn>

        {/* SEARCH — sticky, menyelip hero */}
        <View style={s.searchBar}>
          <View style={s.searchWrap}>
            <Search size={15} color={C.muted} strokeWidth={2.2} />
            <TextInput
              style={s.searchInput}
              placeholder="Cari sasaran..."
              placeholderTextColor={C.muted}
              value={query}
              onChangeText={setQuery}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Text style={s.searchClear}>Hapus</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* LIST */}
        <View style={s.listWrap}>
          <Text style={s.countText}>
            {isLoading
              ? "MEMUAT..."
              : `${list.length} SASARAN${template?.subCategoryName ? ` · ${template.subCategoryName.toUpperCase()}` : ""}`}
          </Text>

          {isLoading ? (
            [0, 1, 2].map((i) => <View key={i} style={s.skelRow} />)
          ) : list.length ? (
            list.map((sa, i) => (
              <FadeIn key={sa.id} delay={60 + i * 40}>
                <ScalePress onPress={() => router.push(`/inspection/${tid}?sasaranId=${sa.id}` as any)}>
                  <View style={s.row}>
                    <View style={[s.rowIcon, { backgroundColor: `${kc.color}14` }]}>
                      <MapPin size={17} color={kc.color} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.rowNama} numberOfLines={1}>
                        {sa.nama}
                      </Text>
                      {sa.alamat ? (
                        <Text style={s.rowAlamat} numberOfLines={1}>
                          {sa.alamat}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[s.goCircle, { backgroundColor: kc.color }]}>
                      <ArrowRight size={13} color="#fff" strokeWidth={2.6} />
                    </View>
                  </View>
                </ScalePress>
              </FadeIn>
            ))
          ) : (
            <FadeIn delay={80}>
              <View style={s.emptyCard}>
                <View style={[s.emptyIcon, { backgroundColor: `${kc.color}12` }]}>
                  <MapPin size={30} color={kc.color} strokeWidth={1.5} />
                </View>
                <Text style={s.emptyTitle}>{query ? "Tidak Ditemukan" : "Belum Ada Sasaran"}</Text>
                <Text style={s.emptyText}>
                  {query
                    ? `Tidak ada sasaran cocok dengan "${query}".`
                    : "Belum ada sasaran terdaftar untuk kategori ini."}
                </Text>
              </View>
            </FadeIn>
          )}

          {/* Tambah sasaran */}
          <Pressable
            onPress={() => router.push(`/sasaran/new?sub=${template?.subCategoryId}`)}
            style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.75 }]}
          >
            <View style={s.addIcon}>
              <Plus size={16} color="#fff" strokeWidth={2.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.addTitle}>Tambah Sasaran Baru</Text>
              <Text style={s.addSub}>Daftarkan lokasi inspeksi baru</Text>
            </View>
            <ChevronRightSmall />
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function ChevronRightSmall() {
  return (
    <View style={{ opacity: 0.35 }}>
      <ArrowRight size={14} color="#fff" strokeWidth={2.4} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgForm },
  content: { paddingBottom: 40 },

  hero: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 28 : 60,
    paddingBottom: 72,
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
    maxWidth: 280,
  },
  heroChipText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },

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
  stepDotTodo: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  stepNum: { fontSize: 10, fontWeight: "800" },
  stepLabel: { fontSize: 10.5, letterSpacing: 0.1 },
  stepLine: {
    width: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
    marginHorizontal: 2,
  },

  searchBar: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#1B1917",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.ink, paddingVertical: 0 },
  searchClear: { fontSize: 11, fontWeight: "700", color: C.accent },

  listWrap: { paddingHorizontal: 16, gap: 9 },
  countText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: C.muted,
    letterSpacing: 0.9,
    marginBottom: 2,
    paddingLeft: 2,
  },
  skelRow: {
    height: 68,
    borderRadius: 18,
    backgroundColor: "rgba(28,25,23,0.06)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 13,
    shadowColor: "#1B1917",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  rowNama: { fontSize: 14.5, fontWeight: "800", color: C.ink, letterSpacing: -0.2 },
  rowAlamat: { fontSize: 11.5, color: C.muted },
  goCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 7,
    shadowColor: "#1B1917",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: C.ink, letterSpacing: -0.3 },
  emptyText: {
    fontSize: 12.5,
    color: C.ink2,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 280,
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#123527",
    borderRadius: 18,
    padding: 14,
    marginTop: 6,
  },
  addIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  addTitle: { fontSize: 13.5, fontWeight: "800", color: "#fff", letterSpacing: -0.1 },
  addSub: { fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 },
});
