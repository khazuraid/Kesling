import { ArrowLeft, ChevronDown } from "@tamagui/lucide-icons-2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { FadeIn } from "../../src/components/motion/primitives";
import { SaveButton, type SyncState } from "../../src/components/motion/SyncButton";
import { api } from "../../src/lib/api";
import { C } from "../../src/lib/tokens";

const BG = C.bgForm;

export default function SasaranNew() {
  const router = useRouter();
  const qc = useQueryClient();
  const { sub } = useLocalSearchParams<{ sub?: string }>();

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.categories });

  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [pemilik, setPemilik] = useState("");
  const [kontak, setKontak] = useState("");
  const [subCategoryId, setSubCategoryId] = useState<number | null>(sub ? Number(sub) : null);
  const [pickCat, setPickCat] = useState(false);
  const [saveState, setSaveState] = useState<SyncState>("idle");

  useEffect(() => {
    if (sub && !nama) setSubCategoryId(Number(sub));
  }, [sub]);

  const selected = useMemo(() => {
    if (!categories || !subCategoryId) return null;
    for (const cat of categories) {
      const sv = cat.subCategories.find((x) => x.id === subCategoryId);
      if (sv) return { category: cat.nama, sub: sv.nama };
    }
    return null;
  }, [categories, subCategoryId]);

  const mutation = useMutation({
    mutationFn: () => api.createSasaran({ nama, alamat, pemilik, kontak, subCategoryId: subCategoryId as number }),
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

  const submit = () => {
    if (!nama.trim()) return Alert.alert("Perhatian", "Nama wajib diisi.");
    if (!subCategoryId) return Alert.alert("Perhatian", "Pilih kategori dulu.");
    setSaveState("syncing");
    mutation.mutate();
  };

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
          <Text style={s.heroOverline}>DATA MASTER</Text>
          <Text style={s.heroTitle}>Sasaran Baru</Text>
          <Text style={s.heroSub}>Lengkapi data tempat yang akan diperiksa</Text>
        </View>
      </FadeIn>

      <View style={s.sheet}>
        {/* Kategori — inline picker 2 level */}
        <FadeIn delay={40}>
          <View style={s.section}>
            <Text style={s.sectionLabel}>KATEGORI *</Text>
            <Pressable
              onPress={() => setPickCat(!pickCat)}
              style={({ pressed }) => [s.pickerBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={[s.pickerLabel, !selected && { color: C.muted }]} numberOfLines={1}>
                {selected ? `${selected.category} — ${selected.sub}` : "Pilih kategori"}
              </Text>
              <ChevronDown size={18} color={C.muted} style={{ transform: [{ rotate: pickCat ? "180deg" : "0deg" }] }} />
            </Pressable>

            {pickCat && (
              <View style={s.catList}>
                {(categories ?? []).map((cat) => (
                  <View key={cat.id} style={s.catGroup}>
                    <Text style={s.catLabel}>{cat.nama}</Text>
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
            )}
          </View>
        </FadeIn>

        {/* Data dasar */}
        <FadeIn delay={80}>
          <View style={s.section}>
            <Text style={s.sectionLabel}>DATA DASAR</Text>
            <View style={s.card}>
              <Field label="NAMA *" value={nama} onChange={setNama} placeholder="Nama tempat/sarana" />
              <View style={s.divider} />
              <Field label="ALAMAT" value={alamat} onChange={setAlamat} placeholder="Alamat lengkap" />
              <View style={s.divider} />
              <Field label="PEMILIK" value={pemilik} onChange={setPemilik} placeholder="Nama pemilik" />
              <View style={s.divider} />
              <Field label="KONTAK" value={kontak} onChange={setKontak} placeholder="No HP" keyboard="phone-pad" />
            </View>
          </View>
        </FadeIn>

        <FadeIn delay={120}>
          <SaveButton
            state={saveState}
            label="Simpan Sasaran"
            syncingLabel="Menyimpan..."
            doneLabel="Tersimpan"
            onPress={submit}
          />
        </FadeIn>
      </View>

      <View style={{ height: 130 }} />
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: "phone-pad" | "default";
}) {
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        keyboardType={keyboard ?? "default"}
        style={s.input}
      />
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
  catLabel: { fontSize: 12, fontWeight: "800", color: C.muted, letterSpacing: 0.5, marginBottom: 8 },
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
  fieldRow: { padding: 16 },
  fieldLabel: { fontSize: 10, fontWeight: "700", color: C.muted, letterSpacing: 0.8, marginBottom: 8 },
  input: { fontSize: 15, color: C.ink, padding: 0 },
  divider: { height: 1, backgroundColor: C.hairline, marginHorizontal: 16 },
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
});
