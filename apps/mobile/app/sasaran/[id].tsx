import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  MapPin,
  Phone,
  Sparkles,
  Trash2,
  User,
} from "@tamagui/lucide-icons-2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { FadeIn, ScalePress } from "../../src/components/motion/primitives";
import { SaveButton, type SyncState } from "../../src/components/motion/SyncButton";
import { api } from "../../src/lib/api";
import { C } from "../../src/lib/tokens";

const BG = C.bgForm;

export default function SasaranDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const sasaranId = Number(id);

  const { data: sasaran } = useQuery({
    queryKey: ["sasaran-detail", sasaranId],
    queryFn: async () => {
      const all = await api.sasaran();
      return all.find((sv: any) => sv.id === sasaranId);
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories,
  });
  const { data: inspectionPage } = useQuery({
    queryKey: ["inspection-results", sasaranId],
    queryFn: () => api.inspectionResults(1, 100),
  });
  const inspections =
    (inspectionPage as any)?.items?.filter((x: any) => x.sasaranId === sasaranId || x.namaSasaran === sasaran?.nama) ??
    [];

  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [pemilik, setPemilik] = useState("");
  const [kontak, setKontak] = useState("");
  const [subCategoryId, setSubCategoryId] = useState<number | null>(null);
  const [pickCat, setPickCat] = useState(false);
  const [saveState, setSaveState] = useState<SyncState>("idle");

  useEffect(() => {
    if (sasaran) {
      setNama(sasaran.nama);
      setAlamat(sasaran.alamat || "");
      setPemilik(sasaran.pemilik || "");
      setKontak(sasaran.kontak || "");
      setSubCategoryId(sasaran.subCategoryId ?? null);
    }
  }, [sasaran]);

  const selected = useMemo(() => {
    if (!categories || !subCategoryId) return null;
    for (const cat of categories) {
      const sv = cat.subCategories.find((x) => x.id === subCategoryId);
      if (sv) return { category: cat.nama, sub: sv.nama };
    }
    return null;
  }, [categories, subCategoryId]);

  const mutation = useMutation({
    mutationFn: () =>
      api.updateSasaran(sasaranId, { nama, alamat, pemilik, kontak, subCategoryId: subCategoryId ?? undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sasaran"] });
      setSaveState("done");
      setTimeout(() => router.back(), 900);
    },
    onError: (e: any) => {
      setSaveState("idle");
      Alert.alert("Gagal", e.message || "Terjadi kesalahan.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteSasaran(sasaranId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sasaran"] });
      router.back();
    },
    onError: (e: any) => Alert.alert("Gagal", e.message || "Sasaran tidak dapat dihapus."),
  });

  const submit = () => {
    if (!nama.trim()) return Alert.alert("Perhatian", "Nama sasaran wajib diisi.");
    setSaveState("syncing");
    mutation.mutate();
  };

  const isPrio = sasaran?.prioritas === 1;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Hero — gelap, match */}
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
          <Text style={s.heroOverline}>SASARAN</Text>
          <Text style={s.heroTitle} numberOfLines={2}>
            {sasaran?.nama || "Edit Sasaran"}
          </Text>
          <Text style={s.heroSub} numberOfLines={1}>
            {selected ? `${selected.category} — ${selected.sub}` : "Perbarui data sasaran"}
          </Text>
          {isPrio ? (
            <View style={s.prioBanner}>
              <Sparkles size={13} color="#FCD34D" />
              <Text style={s.prioText}>Sasaran prioritas — wajib diperiksa lebih awal</Text>
            </View>
          ) : null}
        </View>
      </FadeIn>

      <View style={s.sheet}>
        {/* Info card */}
        <FadeIn delay={40}>
          <View style={s.section}>
            <Text style={s.sectionLabel}>DATA DASAR</Text>
            <View style={s.card}>
              <FieldRow icon={<User size={15} color={C.accent} />} label="NAMA SASARAN">
                <TextInput
                  value={nama}
                  onChangeText={setNama}
                  placeholder="Nama tempat usaha"
                  style={s.input}
                  placeholderTextColor={C.muted}
                />
              </FieldRow>
              <View style={s.divider} />
              <FieldRow icon={<MapPin size={15} color={C.accent} />} label="ALAMAT">
                <TextInput
                  value={alamat}
                  onChangeText={setAlamat}
                  placeholder="Alamat lengkap"
                  style={s.input}
                  placeholderTextColor={C.muted}
                />
              </FieldRow>
              <View style={s.divider} />
              <FieldRow icon={<User size={15} color={C.accent} />} label="PEMILIK">
                <TextInput
                  value={pemilik}
                  onChangeText={setPemilik}
                  placeholder="Nama pemilik"
                  style={s.input}
                  placeholderTextColor={C.muted}
                />
              </FieldRow>
              <View style={s.divider} />
              <FieldRow icon={<Phone size={15} color={C.accent} />} label="KONTAK">
                <TextInput
                  value={kontak}
                  onChangeText={setKontak}
                  placeholder="No HP"
                  style={s.input}
                  placeholderTextColor={C.muted}
                  keyboardType="phone-pad"
                />
              </FieldRow>
            </View>
          </View>
        </FadeIn>

        {/* Kategori picker */}
        <FadeIn delay={80}>
          <View style={s.section}>
            <Text style={s.sectionLabel}>KATEGORI</Text>
            <Pressable
              onPress={() => setPickCat(!pickCat)}
              style={({ pressed }) => [s.pickerBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.pickerLabel} numberOfLines={1}>
                {selected ? `${selected.category} — ${selected.sub}` : "Pilih kategori"}
              </Text>
              <ChevronDown size={18} color={C.muted} style={{ transform: [{ rotate: pickCat ? "180deg" : "0deg" }] }} />
            </Pressable>

            {pickCat ? (
              <View style={s.catList}>
                {(categories ?? []).map((cat) => (
                  <View key={cat.id} style={s.catGroup}>
                    <Text style={s.catGroupLabel}>{cat.nama}</Text>
                    <View style={s.catChips}>
                      {cat.subCategories.map((sv) => {
                        const active = sv.id === subCategoryId;
                        return (
                          <Pressable
                            key={sv.id}
                            onPress={() => {
                              setSubCategoryId(sv.id);
                              setPickCat(false);
                            }}
                            style={({ pressed }) => [s.catChip, active && s.catChipActive, pressed && { opacity: 0.7 }]}
                          >
                            <Text style={[s.catChipText, active && s.catChipTextActive]}>{sv.nama}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </FadeIn>

        {/* Riwayat pemeriksaan */}
        <FadeIn delay={120}>
          <View style={s.section}>
            <Text style={s.sectionLabel}>RIWAYAT PEMERIKSAAN</Text>
            <View style={s.card}>
              {inspections.length ? (
                inspections.map((ins: any) => (
                  <ScalePress key={ins.id} onPress={() => router.push(`/inspection/result/${ins.id}` as any)}>
                    <View style={s.histRow}>
                      <View style={s.histIcon}>
                        <ClipboardCheck size={16} color={C.ok} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.histTitle} numberOfLines={1}>
                          {ins.templateName}
                        </Text>
                        <Text style={s.histSub}>
                          {new Date(ins.tanggal).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                          {ins.skor != null ? ` · Skor ${ins.skor}` : ""}
                        </Text>
                      </View>
                      <View style={s.histBadge}>
                        <Text style={s.histBadgeText}>{ins.status}</Text>
                      </View>
                      <ChevronRight size={15} color={C.muted} strokeWidth={2.2} />
                    </View>
                  </ScalePress>
                ))
              ) : (
                <Text style={s.emptyHist}>Belum ada pemeriksaan untuk sasaran ini.</Text>
              )}
            </View>
          </View>
        </FadeIn>

        {/* Submit */}
        <FadeIn delay={140}>
          <SaveButton
            state={saveState}
            label="Simpan Perubahan"
            syncingLabel="Menyimpan..."
            doneLabel="Tersimpan"
            onPress={submit}
          />

          <Pressable
            onPress={() =>
              Alert.alert("Hapus Sasaran", `Hapus "${sasaran?.nama}"? Tindakan tidak bisa dibatalkan.`, [
                { text: "Batal", style: "cancel" },
                { text: "Hapus", style: "destructive", onPress: () => deleteMutation.mutate() },
              ])
            }
            style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.6 }]}
          >
            <Trash2 size={17} color={C.err} strokeWidth={2} />
            <Text style={s.deleteText}>Hapus Sasaran</Text>
          </Pressable>
        </FadeIn>
      </View>

      <View style={{ height: 130 }} />
    </ScrollView>
  );
}

function FieldRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <View style={s.fieldRow}>
      <View style={s.fieldIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.fieldLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 130 },
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
  prioBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(252,211,77,0.14)",
    borderWidth: 1,
    borderColor: "rgba(252,211,77,0.3)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 14,
    alignSelf: "flex-start",
  },
  prioText: { fontSize: 11.5, fontWeight: "700", color: "#FCD34D" },
  sheet: { paddingTop: 0 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: C.muted,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 2,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
    overflow: "hidden",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  fieldLabel: { fontSize: 10, fontWeight: "700", color: C.muted, letterSpacing: 0.8, marginBottom: 4 },
  input: { fontSize: 15, color: C.ink, padding: 0 },
  divider: { height: 1, backgroundColor: C.hairline, marginHorizontal: 14 },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  pickerLabel: { fontSize: 15, fontWeight: "600", color: C.ink, flex: 1, marginRight: 8 },
  catList: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    padding: 14,
    marginTop: 8,
  },
  catGroup: { marginBottom: 12 },
  catGroupLabel: { fontSize: 12, fontWeight: "800", color: C.muted, letterSpacing: 0.5, marginBottom: 8 },
  catChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.07)",
    backgroundColor: BG,
  },
  catChipActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  catChipText: { fontSize: 13, fontWeight: "500", color: C.ink },
  catChipTextActive: { fontWeight: "700", color: C.accent },
  histRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  histIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(22,163,74,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  histTitle: { fontSize: 14, fontWeight: "700", color: C.ink, letterSpacing: -0.2 },
  histSub: { fontSize: 12, color: C.muted, marginTop: 1 },
  histBadge: { backgroundColor: C.accentSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  histBadgeText: { fontSize: 10, fontWeight: "700", color: C.accent },
  emptyHist: { fontSize: 13, color: C.muted, textAlign: "center", paddingVertical: 16 },
  saveBtn: {
    backgroundColor: C.accent,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 15,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: C.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  saveText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.err,
    backgroundColor: "#FEF2F2",
  },
  deleteText: { fontSize: 14, fontWeight: "700", color: C.err },
});
