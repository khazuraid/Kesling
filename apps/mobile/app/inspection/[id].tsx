import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  MapPin,
  Plus,
} from "@tamagui/lucide-icons-2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
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
import { InspectionField } from "../../src/components/InspectionField";
import { FadeIn } from "../../src/components/motion/primitives";
import { SuccessCheck } from "../../src/components/motion/SuccessCheck";
import { PhotoCapture, type PhotoItem } from "../../src/components/PhotoCapture";
import { SignaturePad } from "../../src/components/SignaturePad";
import { api } from "../../src/lib/api";
import { cacheGet, cacheSet } from "../../src/lib/cache";
import { saveDraft } from "../../src/lib/drafts";
import { C } from "../../src/lib/tokens";
import type { TemplateDetail, TemplateField } from "../../src/types";

const BG = C.bgForm;

export default function InspectionScreen() {
  const { id, sasaranId } = useLocalSearchParams<{ id: string; sasaranId?: string }>();
  const templateId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [selectedSasaranId, setSelectedSasaranId] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [signature, setSignature] = useState<{ base64Data: string } | undefined>();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const [signaturePetugas, setSignaturePetugas] = useState<{ base64Data: string } | undefined>();

  const progressSv = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressSv.value}%` }));

  const { data: template, isLoading } = useQuery({
    queryKey: ["template", templateId],
    queryFn: async () => {
      const fresh = await api.templateDetail(templateId);
      cacheSet(`template_${templateId}`, fresh);
      return fresh;
    },
    enabled: !!templateId,
    retryOnMount: false,
  });

  useEffect(() => {
    if (!templateId) return;
    cacheGet<TemplateDetail>(`template_${templateId}`).then((cached) => {
      if (cached) qc.setQueryData(["template", templateId], cached);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const { data: sasarans, refetch: refetchSasaran } = useQuery({
    queryKey: ["sasaran", template?.subCategoryId],
    queryFn: () => api.sasaran(template?.subCategoryId ?? undefined),
    enabled: !!template,
  });

  useFocusEffect(() => {
    refetchSasaran();
  });

  // alur baru: sasaran sudah dipilih di layar sebelumnya → prefill
  useEffect(() => {
    if (!sasarans || !sasaranId) return;
    const found = sasarans.find((s) => s.id === Number(sasaranId));
    if (found) pickSasaran(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sasaranId, sasarans]);

  const answered = template?.fields?.filter((f) => values[String(f.id)]).length ?? 0;
  const total = template?.fields?.length ?? 0;
  const progress = total ? Math.round((answered / total) * 100) : 0;
  useEffect(() => {
    progressSv.value = withSpring(progress, { damping: 18, stiffness: 120 });
  }, [progress]);

  // checklist grouped by field.grup (web parity); default: first group open
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
      // one id per submission: online attempt and offline fallback must share it,
      // else a timed-out-but-successful request + later draft sync = duplicate
      const localId = `insp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      try {
        return await api.offlineSync({
          templateId,
          localId,
          values: { nama: nama || "Tanpa Nama", alamat: alamat || "-" },
          fieldValues: values,
          photos,
          signature,
          signaturePetugas,
          sasaranId: selectedSasaranId,
        });
      } catch {
        await saveDraft({
          localId,
          templateId,
          templateName: template?.nama,
          values: { nama: nama || "Tanpa Nama", alamat: selectedSasaran?.alamat || alamat || "-" },
          fieldValues: values,
          createdAt: new Date().toISOString(),
          sasaranId: selectedSasaranId,
          photos,
          signature,
          signaturePetugas,
        });
        return { id: 0, status: "DRAFT", syncedAt: "" };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["inspection-results"] });
      setShowSuccess(true);
    },
    onError: (e: any) => {
      Alert.alert("Gagal", e.message || "Sinkronisasi gagal.");
    },
  });

  const pickSasaran = (s: { id: number; nama: string; alamat: string }) => {
    setSelectedSasaranId(s.id);
    setNama(s.nama);
    setAlamat(s.alamat || "");
  };

  const submit = () => {
    if (!selectedSasaranId && !nama.trim()) {
      Alert.alert("Perhatian", "Pilih sasaran (Data Dasar) terlebih dahulu.");
      return;
    }
    const missing = template?.fields?.filter((f) => f.isRequired && !values[String(f.id)]);
    if (missing?.length) {
      Alert.alert("Perhatian", `Jawab pertanyaan wajib: ${missing[0].pertanyaan}`);
      return;
    }
    mutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.loadingText}>Memuat formulir...</Text>
      </View>
    );
  }

  const selectedSasaran = sasarans?.find((s) => s.id === selectedSasaranId);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={s.root}>
        {/* Header — gelap, selaras hero wizard */}
        <View style={s.header}>
          <LinearGradient
            colors={["#0C1B16", "#123527"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1.2 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
              <ArrowLeft size={16} color="#fff" strokeWidth={2.4} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle} numberOfLines={1}>
                {template?.nama}
              </Text>
              <View style={s.headerMeta}>
                <View style={s.subChip}>
                  <Text style={s.subChipText}>{template?.subCategoryName || "Umum"}</Text>
                </View>
                <Text style={s.countText}>
                  {answered}/{total} terjawab · {progress}%
                </Text>
              </View>
            </View>
          </View>
          {/* progress thin */}
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, progressStyle]} />
          </View>
        </View>

        <RNScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {/* SASARAN — pick first */}
          {!selectedSasaran ? (
            <View style={s.section}>
              <View style={s.sectionLabelRow}>
                <MapPin size={14} color={C.accent} strokeWidth={2.2} />
                <Text style={s.sectionLabel}>PILIH DATA DASAR</Text>
              </View>
              {sasarans?.length ? (
                sasarans.map((s, i) => (
                  <FadeIn key={s.id} delay={i * 40}>
                    <Pressable
                      onPress={() => pickSasaran(s)}
                      style={({ pressed }) => [
                        s.sasaranCard,
                        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      <View style={s.sasaranIcon}>
                        <MapPin size={17} color={C.ok} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.sasaranNama} numberOfLines={1}>
                          {s.nama}
                        </Text>
                        {s.alamat ? (
                          <Text style={s.sasaranAlamat} numberOfLines={1}>
                            {s.alamat}
                          </Text>
                        ) : null}
                      </View>
                      <ChevronRight size={18} color={C.muted} strokeWidth={2.2} />
                    </Pressable>
                  </FadeIn>
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
                <View style={s.selectedCheck}>
                  <Check color="#fff" size={13} strokeWidth={3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.selectedLabel}>SASARAN TERPILIH</Text>
                  <Text style={s.selectedNama} numberOfLines={1}>
                    {selectedSasaran?.nama || nama}
                  </Text>
                  {selectedSasaran?.alamat ? (
                    <Text style={s.selectedAlamat} numberOfLines={1}>
                      {selectedSasaran.alamat}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => {
                    setSelectedSasaranId(null);
                    setNama("");
                    setAlamat("");
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [s.gantiBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={s.gantiText}>Ganti</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* CHECKLIST — accordion per grup */}
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

          {!template?.fields?.length ? (
            <View style={s.section}>
              <View style={s.emptyInline}>
                <Text style={s.emptyInlineText}>Template ini tidak memiliki pertanyaan.</Text>
              </View>
            </View>
          ) : null}

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
              <SignaturePad onChange={setSignature} />
            </View>
          </View>

          {/* TTD PETUGAS */}
          <View style={[s.section, { marginTop: 20 }]}>
            <Text style={s.sectionLabel}>TANDA TANGAN PETUGAS</Text>
            <View style={s.card}>
              <SignaturePad onChange={setSignaturePetugas} label="Tanda tangan petugas di sini" />
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
            <Text style={s.submitText}>{mutation.isPending ? "Mengirim..." : "Kirim Pemeriksaan"}</Text>
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
    paddingTop: Platform.OS === "web" ? 20 : 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: "hidden",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16.5, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  subChip: {
    backgroundColor: "rgba(0,200,137,0.22)",
    borderWidth: 1,
    borderColor: "rgba(0,200,137,0.4)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  subChipText: { fontSize: 10, fontWeight: "800", color: "#7CF5CE" },
  countText: { fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: "600" },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
    marginTop: 12,
  },
  progressFill: { height: 4, backgroundColor: "#00C489", borderRadius: 2 },
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
    padding: 12,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  selectedCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedLabel: { fontSize: 9.5, fontWeight: "800", color: C.accent, letterSpacing: 0.9 },
  selectedNama: { fontSize: 14.5, fontWeight: "800", color: C.ink, letterSpacing: -0.2, marginTop: 2 },
  selectedAlamat: { fontSize: 11.5, color: C.muted, marginTop: 1 },
  gantiBtn: {
    backgroundColor: BG,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  gantiText: { fontSize: 11.5, fontWeight: "800", color: C.ink2 },
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
