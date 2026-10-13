import { Check, ChevronDown, ChevronRight, ChevronUp, ClipboardCheck, MapPin, Plus } from "@tamagui/lucide-icons-2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView as RNScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InspectionField } from "../../../src/components/InspectionField";
import { SuccessCheck } from "../../../src/components/motion/SuccessCheck";
import { PhotoCapture, type PhotoItem } from "../../../src/components/PhotoCapture";
import { SignaturePad } from "../../../src/components/SignaturePad";
import { api } from "../../../src/lib/api";
import { type Draft, getDrafts, removeDraft } from "../../../src/lib/drafts";
import { C } from "../../../src/lib/tokens";
import type { TemplateField } from "../../../src/types";

const BG = C.bgForm;

export default function DraftEditScreen() {
  const { localId } = useLocalSearchParams<{ localId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [nama, setNama] = useState("");
  const [selectedSasaranId, setSelectedSasaranId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [signature, setSignature] = useState<{ base64Data: string } | undefined>();
  const [signaturePetugas, setSignaturePetugas] = useState<{ base64Data: string } | undefined>();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const progressSv = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressSv.value}%` }));

  // load draft
  useEffect(() => {
    getDrafts().then((list) => {
      const d = list.find((x) => x.localId === localId);
      if (!d) {
        Alert.alert("Tidak ditemukan", "Draft sudah dihapus.", [{ text: "OK", onPress: () => router.back() }]);
        return;
      }
      setDraft(d);
      setValues(d.fieldValues || {});
      setNama(d.values?.nama || "");
      setSelectedSasaranId((d as any).sasaranId ?? null);
      setPhotos(d.photos || []);
      setSignature(d.signature);
      setSignaturePetugas((d as any).signaturePetugas);
    });
  }, [localId]);

  const { data: template, isLoading } = useQuery({
    queryKey: ["template", draft?.templateId],
    queryFn: () => api.templateDetail(draft?.templateId),
    enabled: !!draft,
  });

  const { data: sasarans } = useQuery({
    queryKey: ["sasaran", template?.subCategoryId],
    queryFn: () => api.sasaran(template?.subCategoryId ?? undefined),
    enabled: !!template,
  });

  const answered = template?.fields?.filter((f) => values[String(f.id)]).length ?? 0;
  const total = template?.fields?.length ?? 0;
  const progress = total ? Math.round((answered / total) * 100) : 0;
  useEffect(() => {
    progressSv.value = withSpring(progress, { damping: 18, stiffness: 120 });
  }, [progress]);

  const groups = useMemo(() => {
    const g = new Map<string, TemplateField[]>();
    if (template?.fields) {
      template.fields.forEach((f) => {
        const key = f.grup || "PEMERIKSAAN";
        g.set(key, [...(g.get(key) || []), f]);
      });
    }
    return [...g.entries()];
  }, [template]);
  const groupOpen = (key: string, idx: number) => openGroups[key] ?? idx === 0;
  const toggleGroup = (key: string) => setOpenGroups((p) => ({ ...p, [key]: !groupOpen(key, -1) }));

  const mutation = useMutation({
    mutationFn: async () => {
      await api.offlineSync({
        templateId: draft?.templateId,
        localId: draft?.localId,
        values: { nama: nama || draft?.values?.nama || "Tanpa Nama", alamat: draft?.values?.alamat || "-" },
        fieldValues: values,
        photos,
        signature,
        signaturePetugas,
        sasaranId: selectedSasaranId,
      });
      await removeDraft(draft?.localId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["inspection-results"] });
      setShowSuccess(true);
    },
    onError: (e: any) => Alert.alert("Gagal", e.message || "Sinkronisasi gagal."),
  });

  const pickSasaran = (s: { id: number; nama: string; alamat: string }) => {
    setSelectedSasaranId(s.id);
    setNama(s.nama);
  };

  const submit = () => {
    if (!selectedSasaranId && !nama.trim()) {
      Alert.alert("Perhatian", "Pilih sasaran atau isi nama dulu.");
      return;
    }
    const missing = template?.fields?.filter((f) => f.isRequired && !values[String(f.id)]);
    if (missing?.length) {
      Alert.alert("Perhatian", `Jawab pertanyaan wajib: ${missing[0].pertanyaan}`);
      return;
    }
    mutation.mutate();
  };

  if (!draft || isLoading || !template) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.loadingText}>Memuat draft...</Text>
      </View>
    );
  }

  const selectedSasaran = sasarans?.find((s) => s.id === selectedSasaranId);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={s.root}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
              <Text style={s.backText}>‹</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle} numberOfLines={1}>
                {template.nama}
              </Text>
              <View style={s.headerMeta}>
                <View style={s.draftChip}>
                  <Text style={s.draftChipText}>DRAFT</Text>
                </View>
                <Text style={s.countText}>
                  {answered}/{total} terjawab
                </Text>
              </View>
            </View>
          </View>
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, progressStyle]} />
          </View>
        </View>

        <RNScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {/* SASARAN */}
          {!selectedSasaran ? (
            <View style={s.section}>
              <View style={s.sectionLabelRow}>
                <MapPin size={14} color={C.accent} strokeWidth={2.2} />
                <Text style={s.sectionLabel}>PILIH DATA DASAR</Text>
              </View>
              {sasarans?.length ? (
                sasarans.map((sa) => (
                  <Pressable
                    key={sa.id}
                    onPress={() => pickSasaran(sa)}
                    style={({ pressed }) => [s.sasaranCard, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
                  >
                    <View style={s.sasaranIcon}>
                      <MapPin size={17} color={C.ok} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sasaranNama} numberOfLines={1}>
                        {sa.nama}
                      </Text>
                      {sa.alamat ? (
                        <Text style={s.sasaranAlamat} numberOfLines={1}>
                          {sa.alamat}
                        </Text>
                      ) : null}
                    </View>
                    <ChevronRight size={18} color={C.muted} strokeWidth={2.2} />
                  </Pressable>
                ))
              ) : (
                <View style={s.emptyInline}>
                  <MapPin size={28} color={C.muted} strokeWidth={1.5} />
                  <Text style={s.emptyInlineText}>Belum ada sasaran untuk kategori ini.</Text>
                </View>
              )}
              <Pressable
                onPress={() => router.push(`/sasaran/new?sub=${template?.subCategoryId}`)}
                style={({ pressed }) => [s.addSasaranBtn, pressed && { opacity: 0.7 }]}
              >
                <Plus size={18} color={C.accent} strokeWidth={2.4} />
                <Text style={s.addSasaranText}>Tambah Sasaran Baru</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.section}>
              <View style={s.selectedCard}>
                <View style={s.selectedHeader}>
                  <View style={s.selectedCheck}>
                    <Check color="#fff" size={16} strokeWidth={2.5} />
                  </View>
                  <Text style={s.selectedLabel}>SASARAN TERPILIH</Text>
                </View>
                <Text style={s.selectedNama}>{selectedSasaran?.nama || nama}</Text>
                {selectedSasaran?.alamat ? <Text style={s.selectedAlamat}>{selectedSasaran.alamat}</Text> : null}
                <Pressable
                  onPress={() => {
                    setSelectedSasaranId(null);
                    setNama("");
                  }}
                  style={({ pressed }) => [s.gantiBtn, pressed && { opacity: 0.6 }]}
                >
                  <Text style={s.gantiText}>Ganti</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* CHECKLIST accordion */}
          {groups.map(([grup, fields], gi) => {
            const open = groupOpen(grup, gi);
            const done = fields.filter((f) => values[String(f.id)]).length;
            const allDone = done === fields.length;
            return (
              <View key={grup} style={[s.section, { marginTop: gi === 0 ? 16 : 10 }]}>
                <View style={[s.groupCard, allDone && open && { borderWidth: 1.5, borderColor: C.ok }]}>
                  <Pressable
                    onPress={() => toggleGroup(grup)}
                    style={({ pressed }) => [s.groupHeader, pressed && { opacity: 0.7 }]}
                  >
                    <View style={[s.groupIcon, allDone && { backgroundColor: "rgba(22,163,74,0.12)" }]}>
                      {allDone ? (
                        <Check size={15} color={C.ok} strokeWidth={2.5} />
                      ) : (
                        <ClipboardCheck size={15} color={C.accent} strokeWidth={2} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.groupTitle} numberOfLines={1}>
                        {grup.toUpperCase()}
                      </Text>
                      <Text style={[s.groupSub, allDone && { color: C.ok }]}>
                        {done}/{fields.length} terjawab
                      </Text>
                    </View>
                    {open ? (
                      <ChevronUp size={18} color={C.muted} strokeWidth={2.2} />
                    ) : (
                      <ChevronDown size={18} color={C.muted} strokeWidth={2.2} />
                    )}
                  </Pressable>
                  {open ? (
                    <View style={s.groupBody}>
                      {fields.map((field) => (
                        <InspectionField
                          key={field.id}
                          field={field}
                          value={values[String(field.id)] || ""}
                          onChange={(v) => setValues((p) => ({ ...p, [String(field.id)]: v }))}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}

          {/* FOTO */}
          <View style={[s.section, { marginTop: 20 }]}>
            <Text style={s.sectionLabel}>FOTO BUKTI</Text>
            <View style={s.card}>
              <PhotoCapture photos={photos} onChange={setPhotos} max={6} />
            </View>
          </View>

          {/* TTD */}
          <View style={[s.section, { marginTop: 20 }]}>
            <Text style={s.sectionLabel}>TANDA TANGAN PEMILIK</Text>
            <View style={s.card}>
              <SignaturePad onChange={setSignature} initial={signature?.base64Data ?? null} />
            </View>
          </View>

          {/* TTD PETUGAS */}
          <View style={[s.section, { marginTop: 20 }]}>
            <Text style={s.sectionLabel}>TANDA TANGAN PETUGAS</Text>
            <View style={s.card}>
              <SignaturePad
                onChange={setSignaturePetugas}
                label="Tanda tangan petugas di sini"
                initial={signaturePetugas?.base64Data ?? null}
              />
            </View>
          </View>
          <View style={{ height: 24 }} />
        </RNScrollView>

        {/* Sticky bottom bar */}
        <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            onPress={mutation.isPending ? undefined : submit}
            disabled={mutation.isPending}
            style={({ pressed }) => [s.submitBtn, (pressed || mutation.isPending) && { opacity: 0.8 }]}
          >
            <Text style={s.submitText}>{mutation.isPending ? "Menyinkron..." : "Simpan & Sinkronkan"}</Text>
          </Pressable>
        </View>
      </View>

      <SuccessCheck
        visible={showSuccess}
        onComplete={() => {
          setShowSuccess(false);
          router.back();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 22, color: C.ink, fontWeight: "600", marginTop: -2 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.ink, letterSpacing: -0.3 },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  draftChip: { backgroundColor: "rgba(217,119,6,0.12)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  draftChipText: { fontSize: 10, fontWeight: "700", color: C.warn },
  countText: { fontSize: 11, color: C.muted, fontWeight: "600" },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.07)",
    overflow: "hidden",
    marginTop: 12,
  },
  progressFill: { height: 4, backgroundColor: C.accent, borderRadius: 2 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginLeft: 2 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: C.muted, letterSpacing: 0.8 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  sasaranCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  sasaranIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sasaranNama: { fontSize: 14, fontWeight: "700", color: C.ink, letterSpacing: -0.2 },
  sasaranAlamat: { fontSize: 12, color: C.muted, marginTop: 1 },
  emptyInline: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyInlineText: { fontSize: 13, color: C.muted, textAlign: "center" },
  addSasaranBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.accentSoft,
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
  },
  addSasaranText: { fontSize: 14, fontWeight: "700", color: C.accent, flex: 1 },
  selectedCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.accent,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  selectedHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  selectedCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedLabel: { fontSize: 10, fontWeight: "800", color: C.accent, letterSpacing: 0.8 },
  selectedNama: { fontSize: 17, fontWeight: "800", color: C.ink, letterSpacing: -0.3 },
  selectedAlamat: { fontSize: 13, color: C.muted, marginTop: 3 },
  gantiBtn: {
    alignSelf: "flex-start",
    backgroundColor: BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 12,
  },
  gantiText: { fontSize: 12, fontWeight: "700", color: C.muted },
  groupCard: {
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
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  groupIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  groupTitle: { fontSize: 14, fontWeight: "800", color: C.ink, letterSpacing: -0.2 },
  groupSub: { fontSize: 11, color: C.muted, fontWeight: "600", marginTop: 1 },
  groupBody: { paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
  bottomBar: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  submitBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 14,
    shadowColor: C.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  submitText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  loadingText: { fontSize: 14, color: C.muted },
});
