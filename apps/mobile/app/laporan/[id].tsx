import { Check, Share2 } from "@tamagui/lucide-icons-2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FadeIn } from "../../src/components/motion/primitives";
import { api } from "../../src/lib/api";
import { C } from "../../src/lib/tokens";

type Param = { id: number; nama: string; code: string; type: string; required: boolean; urutan: number; config: any };
type Val = { parameterId: number; subCategoryId: number | null; value: string };

const BG = C.bgForm;
const bulanNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function LaporanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const laporanId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["laporan-detail", laporanId],
    queryFn: () => api.laporanDetail(laporanId),
    enabled: !!laporanId,
  });

  const [edited, setEdited] = useState<Record<string, string>>({});
  const [catatan, setCatatan] = useState("");

  useMemo(() => {
    if (data) {
      const init: Record<string, string> = {};
      for (const v of data.values) {
        init[`${v.parameterId}_${v.subCategoryId ?? ""}`] = v.value;
      }
      setEdited(init);
      setCatatan(data.catatan || "");
    }
  }, [data]);

  const getValue = (paramId: number, subId: number | null) => edited[`${paramId}_${subId ?? ""}`] || "";

  const setValue = (paramId: number, subId: number | null, val: string) => {
    setEdited((p) => ({ ...p, [`${paramId}_${subId ?? ""}`]: val }));
  };

  const buildValues = (): Val[] => {
    const values: Val[] = [];
    for (const [key, val] of Object.entries(edited)) {
      if (!val) continue;
      const [paramId, subId] = key.split("_");
      values.push({ parameterId: Number(paramId), subCategoryId: subId ? Number(subId) : null, value: val });
    }
    return values;
  };

  const saveMutation = useMutation({
    mutationFn: () => api.saveLaporan(laporanId, { values: buildValues(), catatan, status: "DRAFT" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["laporan-detail", laporanId] });
      qc.invalidateQueries({ queryKey: ["laporan"] });
      Alert.alert("Berhasil", "Laporan disimpan.");
      router.back();
    },
    onError: (e: any) => Alert.alert("Gagal", e.message || "Terjadi kesalahan."),
  });

  const submitMutation = useMutation({
    mutationFn: () => api.saveLaporan(laporanId, { values: buildValues(), catatan, status: "SUBMITTED" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["laporan-detail", laporanId] });
      qc.invalidateQueries({ queryKey: ["laporan"] });
      Alert.alert("Berhasil", "Laporan disubmit.");
      router.back();
    },
    onError: (e: any) => Alert.alert("Gagal", e.message || "Terjadi kesalahan."),
  });

  if (isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.loadingText}>Memuat laporan...</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.loadingText}>Laporan tidak ditemukan.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <FadeIn>
          <View style={s.hero}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
              <Text style={s.backText}>‹ Kembali</Text>
            </Pressable>
            <Text style={s.heroOverline}>Laporan</Text>
            <Text style={s.heroTitle} numberOfLines={2}>
              {data.categoryName}
            </Text>
            <Text style={s.heroSub}>
              {bulanNames[data.bulan - 1]} {data.tahun}
            </Text>
            <View style={s.heroChips}>
              <View style={s.statusChip}>
                <Text style={s.statusText}>{data.status}</Text>
              </View>
              <Pressable
                style={s.shareChip}
                hitSlop={8}
                onPress={() =>
                  Share.share({
                    message: `Laporan ${data.categoryName} — ${bulanNames[data.bulan - 1]} ${data.tahun} (${data.status})`,
                  })
                }
              >
                <Share2 size={13} color={C.ink} strokeWidth={2.2} />
                <Text style={s.shareText}>Bagikan</Text>
              </Pressable>
            </View>
          </View>
        </FadeIn>

        {/* Form */}
        {data.isRowBased && data.subCategories.length > 0 ? (
          data.subCategories.map((sub: any, si: number) => (
            <FadeIn key={sub.id} delay={40 + si * 40}>
              <View style={s.section}>
                <Text style={s.sectionLabel}>{sub.nama.toUpperCase()}</Text>
                <View style={s.card}>
                  {data.parameters.map((param: Param, pi: number) => (
                    <View key={param.id}>
                      <ParamInput
                        param={param}
                        value={getValue(param.id, sub.id)}
                        onChange={(v) => setValue(param.id, sub.id, v)}
                      />
                      {pi < data.parameters.length - 1 ? <View style={s.divider} /> : null}
                    </View>
                  ))}
                </View>
              </View>
            </FadeIn>
          ))
        ) : (
          <FadeIn delay={40}>
            <View style={s.section}>
              <Text style={s.sectionLabel}>PARAMETER</Text>
              <View style={s.card}>
                {data.parameters.map((param: Param, pi: number) => (
                  <View key={param.id}>
                    <ParamInput
                      param={param}
                      value={getValue(param.id, null)}
                      onChange={(v) => setValue(param.id, null, v)}
                    />
                    {pi < data.parameters.length - 1 ? <View style={s.divider} /> : null}
                  </View>
                ))}
              </View>
            </View>
          </FadeIn>
        )}

        {/* Catatan */}
        <FadeIn delay={80}>
          <View style={s.section}>
            <Text style={s.sectionLabel}>CATATAN</Text>
            <View style={s.card}>
              <TextInput
                value={catatan}
                onChangeText={setCatatan}
                placeholder="Catatan laporan..."
                placeholderTextColor={C.muted}
                multiline
                style={s.catatanInput}
              />
            </View>
          </View>
        </FadeIn>

        {/* Buttons */}
        <View style={s.btnRow}>
          <Pressable
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            style={({ pressed }) => [s.draftBtn, (pressed || saveMutation.isPending) && { opacity: 0.7 }]}
          >
            <Text style={s.draftText}>{saveMutation.isPending ? "Menyimpan..." : "Simpan Draft"}</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert("Submit", "Kirim laporan untuk approval?", [
                { text: "Batal", style: "cancel" },
                { text: "Submit", onPress: () => submitMutation.mutate() },
              ])
            }
            disabled={submitMutation.isPending}
            style={({ pressed }) => [s.submitBtn, (pressed || submitMutation.isPending) && { opacity: 0.7 }]}
          >
            <Check size={16} color="#fff" strokeWidth={2.4} />
            <Text style={s.submitText}>{submitMutation.isPending ? "Menyimpan..." : "Submit"}</Text>
          </Pressable>
        </View>

        <View style={{ height: 130 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ParamInput({ param, value, onChange }: { param: Param; value: string; onChange: (v: string) => void }) {
  const isBoolean = param.type === "BOOLEAN";
  const isNumber = param.type === "NUMBER" || param.type === "DECIMAL";

  if (isBoolean) {
    const on = value === "true" || value === "TRUE" || value === "1" || value === "Ya";
    return (
      <View style={s.fieldRow}>
        <Text style={s.fieldLabel}>{param.nama.toUpperCase()}</Text>
        <View style={s.segRow}>
          <Pressable
            onPress={() => onChange("true")}
            style={({ pressed }) => [s.segOpt, on && s.segOptOn, pressed && { opacity: 0.7 }]}
          >
            <Text style={[s.segOptText, on && s.segOptTextOn]}>Ya</Text>
          </Pressable>
          <Pressable
            onPress={() => onChange("false")}
            style={({ pressed }) => [s.segOpt, !on && value ? s.segOptOff : null, pressed && { opacity: 0.7 }]}
          >
            <Text style={[s.segOptText, !on && value ? s.segOptTextOff : null]}>Tidak</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>
        {param.nama.toUpperCase()}
        {param.required ? " *" : ""}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={param.nama}
        placeholderTextColor={C.muted}
        keyboardType={isNumber ? "numeric" : "default"}
        style={s.input}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 130 },
  center: { alignItems: "center", justifyContent: "center" },
  hero: {
    backgroundColor: C.accentSoft,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  backText: { fontSize: 12, fontWeight: "600", color: C.ink },
  heroOverline: {
    fontSize: 11,
    fontWeight: "600",
    color: C.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTitle: { fontSize: 22, fontWeight: "900", color: C.ink, letterSpacing: -0.6, lineHeight: 26 },
  heroSub: { fontSize: 13, color: C.ink2, marginTop: 6 },
  heroChips: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  statusChip: { backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: "700", color: C.ink },
  shareChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  shareText: { fontSize: 11, fontWeight: "700", color: C.ink },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: C.muted, letterSpacing: 1, marginBottom: 8, marginLeft: 2 },
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
  divider: { height: 1, backgroundColor: C.hairline, marginHorizontal: 16 },
  fieldRow: { padding: 16 },
  fieldLabel: { fontSize: 10, fontWeight: "700", color: C.muted, letterSpacing: 0.8, marginBottom: 8 },
  input: {
    fontSize: 15,
    color: C.ink,
    padding: 0,
  },
  catatanInput: {
    fontSize: 15,
    color: C.ink,
    padding: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
  segRow: { flexDirection: "row", gap: 8 },
  segOpt: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.07)",
    backgroundColor: BG,
  },
  segOptOn: { borderColor: C.ok, backgroundColor: "rgba(22,163,74,0.12)" },
  segOptOff: { borderColor: C.err, backgroundColor: "rgba(220,38,38,0.1)" },
  segOptText: { fontSize: 15, fontWeight: "700", color: C.muted },
  segOptTextOn: { color: C.ok },
  segOptTextOff: { color: C.err },
  btnRow: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 16 },
  draftBtn: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  draftText: { fontSize: 14, fontWeight: "700", color: C.ink },
  submitBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: C.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  submitText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  loadingText: { fontSize: 14, color: C.muted },
});
