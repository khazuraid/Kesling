import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  FileCheck2,
  FileClock,
  Layers,
  MapPin,
  PenTool,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InspectionField } from "../../src/components/InspectionField";
import { LocationPicker } from "../../src/components/LocationPicker";
import { PhotoCapture, type PhotoItem } from "../../src/components/PhotoCapture";
import { SignaturePad } from "../../src/components/SignaturePad";
import { api } from "../../src/lib/api";
import { saveDraftSQLite } from "../../src/lib/sqlite-drafts";
import type { TemplateDetail, TemplateField } from "../../src/types";

export default function InspectionScreen() {
  const { id, sasaranId } = useLocalSearchParams<{ id: string; sasaranId?: string }>();
  const templateId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  // Wizard state: 1: Kuesioner, 2: Foto & GPS, 3: Tanda Tangan & Konfirmasi
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [values, setValues] = useState<Record<string, string>>({});
  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [selectedSasaranId, setSelectedSasaranId] = useState<number | undefined>(
    sasaranId ? Number(sasaranId) : undefined,
  );

  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [signature, setSignature] = useState<{ base64Data: string } | undefined>();
  const [signaturePetugas, setSignaturePetugas] = useState<{ base64Data: string } | undefined>();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // 1. Fetch Template
  const { data: template, isLoading } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => api.templateDetail(templateId),
    enabled: !!templateId,
  });

  // 2. Fetch Sasaran Details
  const { data: sasarans } = useQuery({
    queryKey: ["sasaran", template?.subCategoryId],
    queryFn: () => api.sasaran(template?.subCategoryId ?? undefined),
    enabled: !!template,
  });

  useEffect(() => {
    if (!sasarans || !sasaranId) return;
    const found = sasarans.find((s) => s.id === Number(sasaranId));
    if (found) {
      setSelectedSasaranId(found.id);
      setNama(found.nama);
      setAlamat(found.alamat || "");
      if (found.lat && found.lng) {
        setCoords({ lat: found.lat, lng: found.lng });
      }
    }
  }, [sasaranId, sasarans]);

  // Score Calculation
  const answered = template?.fields?.filter((f) => values[String(f.id)]).length ?? 0;
  const total = template?.fields?.length ?? 0;
  const percentComplete = total ? Math.round((answered / total) * 100) : 0;

  const currentScore = useMemo(() => {
    if (!template?.fields) return 0;
    let sc = 0;
    for (const f of template.fields) {
      const ans = values[String(f.id)];
      if (ans === "ya" || ans === "true") {
        sc += f.bobot || 1;
      }
    }
    return sc;
  }, [template, values]);

  // Grouping questions
  const groups = useMemo(() => {
    if (!template?.fields) return [];
    const map = new Map<string, TemplateField[]>();
    for (const f of template.fields) {
      const g = f.grup || "Komponen Pemeriksaan";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(f);
    }
    return Array.from(map.entries()).map(([name, fields]) => ({ name, fields }));
  }, [template]);

  useEffect(() => {
    if (groups.length > 0 && Object.keys(openGroups).length === 0) {
      const initial: Record<string, boolean> = {};
      for (const g of groups) initial[g.name] = true;
      setOpenGroups(initial);
    }
  }, [groups]);

  // Save Local Offline Draft
  const handleSaveDraft = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const localId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      await saveDraftSQLite({
        localId,
        templateId,
        templateName: template?.nama || "Inspeksi Lapangan",
        sasaranId: selectedSasaranId,
        namaSasaran: nama || "Sasaran Lapangan",
        alamatSasaran: alamat,
        values,
        signatureData: signature?.base64Data,
        signaturePetugasData: signaturePetugas?.base64Data,
        lat: coords?.lat,
        lng: coords?.lng,
        photos: photos.map((p) => ({
          uri: p.uri || "",
          mimeType: p.mimeType,
          timestamp: new Date().toISOString(),
          coords: coords ? `${coords.lat},${coords.lng}` : "",
        })),
        createdAt: new Date().toISOString(),
        status: "DRAFT",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Draft Berhasil Disimpan",
        "Data inspeksi tersimpan di database SQLite lokal HP Anda. Anda dapat melanjutkan atau menyinkronkannya kapan saja.",
        [{ text: "OK", onPress: () => router.replace("/drafts") }],
      );
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Gagal Menyimpan Draft", e?.message || "Kesalahan database SQLite.");
    }
  };

  // Submit to Cloud Server
  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        templateId,
        sasaranId: selectedSasaranId,
        nama,
        alamat,
        lat: coords?.lat,
        lng: coords?.lng,
        values,
        signature: signature?.base64Data,
        signaturePetugas: signaturePetugas?.base64Data,
        photos: photos.map((p) => ({
          base64: p.base64,
          mimeType: p.mimeType,
        })),
      };
      return api.submitInspection(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mobile-dashboard"] });
      qc.invalidateQueries({ queryKey: ["inspection-results"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Inspeksi Berhasil Disimpan",
        "Laporan IKL telah terkirim dan tercatat resmi di server Dinas Kesehatan.",
        [{ text: "Selesai", onPress: () => router.replace("/drafts") }],
      );
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Gagal Kirim ke Server",
        "Koneksi internet bermasalah. Simpan sebagai Draft Offline terlebih dahulu agar data Anda aman.",
        [
          { text: "Simpan Draft Offline", onPress: handleSaveDraft },
          { text: "Batal", style: "cancel" },
        ],
      );
    },
  });

  const handleSubmit = () => {
    if (!selectedSasaranId && !nama.trim()) {
      Alert.alert("Perhatian", "Nama sasaran wajib diisi.");
      return;
    }
    const missing = template?.fields?.filter((f) => f.isRequired && !values[String(f.id)]);
    if (missing && missing.length > 0) {
      Alert.alert("Pertanyaan Wajib", `Mohon jawab pertanyaan wajib: "${missing[0].pertanyaan}"`);
      setActiveTab(1);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={[s.root, s.centerBox]}>
        <ActivityIndicator size="large" color="#047857" />
        <Text style={s.centerText}>Memuat kuesioner inspeksi...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[s.root, { paddingTop: insets.top }]}
    >
      {/* 1. Sticky Civic Header */}
      <View style={s.headerBox}>
        <View style={s.headerTop}>
          <Pressable onPress={() => router.back()} style={s.btnBack} hitSlop={8}>
            <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={s.headerTitle}>
              {nama || template?.nama || "Inspeksi Lapangan"}
            </Text>
            <Text style={s.headerSub}>
              {answered}/{total} Terjawab • Skor Sementara: {currentScore}
            </Text>
          </View>
          <Pressable onPress={handleSaveDraft} style={s.btnSaveDraftTop}>
            <Save size={16} color="#047857" strokeWidth={2.2} />
            <Text style={s.btnSaveDraftTopText}>Draft</Text>
          </Pressable>
        </View>

        {/* Progress Bar */}
        <View style={s.progressBarTrack}>
          <View style={[s.progressBarFill, { width: `${percentComplete}%` }]} />
        </View>

        {/* 3-Step Wizard Navigation Tabs (48dp Touch Friendly) */}
        <View style={s.tabBar}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(1);
            }}
            style={[s.tabItem, activeTab === 1 && s.tabItemActive]}
          >
            <ClipboardCheck size={16} color={activeTab === 1 ? "#047857" : "#64748B"} strokeWidth={2.2} />
            <Text style={[s.tabText, activeTab === 1 && s.tabTextActive]}>1. Kuesioner</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(2);
            }}
            style={[s.tabItem, activeTab === 2 && s.tabItemActive]}
          >
            <Camera size={16} color={activeTab === 2 ? "#047857" : "#64748B"} strokeWidth={2.2} />
            <Text style={[s.tabText, activeTab === 2 && s.tabTextActive]}>2. Foto & GPS</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(3);
            }}
            style={[s.tabItem, activeTab === 3 && s.tabItemActive]}
          >
            <PenTool size={16} color={activeTab === 3 ? "#047857" : "#64748B"} strokeWidth={2.2} />
            <Text style={[s.tabText, activeTab === 3 && s.tabTextActive]}>3. Tanda Tangan</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Scrollable Body Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 120 }]}
      >
        {/* TAB 1: Kuesioner Lapangan */}
        {activeTab === 1 && (
          <View style={s.sectionWrap}>
            {groups.map((group) => {
              const isOpen = openGroups[group.name] !== false;
              const gAnswered = group.fields.filter((f) => values[String(f.id)]).length;
              return (
                <View key={group.name} style={s.groupBox}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setOpenGroups((prev) => ({
                        ...prev,
                        [group.name]: !isOpen,
                      }));
                    }}
                    style={s.groupHeader}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.groupTitle}>{group.name}</Text>
                      <Text style={s.groupSub}>
                        {gAnswered} dari {group.fields.length} pertanyaan terjawab
                      </Text>
                    </View>
                    {isOpen ? <ChevronUp size={20} color="#64748B" /> : <ChevronDown size={20} color="#64748B" />}
                  </Pressable>

                  {isOpen && (
                    <View style={s.fieldsWrap}>
                      {group.fields.map((f) => (
                        <InspectionField
                          key={f.id}
                          field={f}
                          value={values[String(f.id)]}
                          onChange={(val) => setValues((prev) => ({ ...prev, [String(f.id)]: val }))}
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 2: Foto Bukti & Koordinat GPS */}
        {activeTab === 2 && (
          <View style={s.sectionWrap}>
            {/* Location Tagging */}
            <View style={s.cardPanel}>
              <View style={s.panelTitleRow}>
                <MapPin size={18} color="#047857" strokeWidth={2.2} />
                <Text style={s.panelTitle}>Titik Koordinat RTK Lapangan</Text>
              </View>
              <Text style={s.panelDesc}>
                Kunci koordinat GPS saat berada tepat di lokasi sasaran untuk validitas data IKL.
              </Text>
              <LocationPicker value={coords} onChange={setCoords} />
            </View>

            {/* Watermark Photo Capture */}
            <View style={s.cardPanel}>
              <View style={s.panelTitleRow}>
                <Camera size={18} color="#047857" strokeWidth={2.2} />
                <Text style={s.panelTitle}>Foto Dokumentasi Lapangan</Text>
              </View>
              <Text style={s.panelDesc}>
                Foto otomatis dikompresi (~200KB) dan distempel tanggal, waktu WIB, serta koordinat GPS.
              </Text>
              <PhotoCapture photos={photos} onChange={setPhotos} max={6} coords={coords} sasaranName={nama} />
            </View>
          </View>
        )}

        {/* TAB 3: Tanda Tangan & Konfirmasi */}
        {activeTab === 3 && (
          <View style={s.sectionWrap}>
            {/* Ringkasan Evaluasi Kelaikan */}
            <View style={s.cardPanel}>
              <View style={s.panelTitleRow}>
                <FileCheck2 size={18} color="#047857" strokeWidth={2.2} />
                <Text style={s.panelTitle}>Evaluasi Kelaikan Sanitasi</Text>
              </View>
              <View style={s.evalBox}>
                <View style={s.evalRow}>
                  <Text style={s.evalLabel}>Total Pertanyaan</Text>
                  <Text style={s.evalVal}>{total} Butir</Text>
                </View>
                <View style={s.evalRow}>
                  <Text style={s.evalLabel}>Sudah Dijawab</Text>
                  <Text style={s.evalVal}>
                    {answered} ({percentComplete}%)
                  </Text>
                </View>
                <View style={s.evalRow}>
                  <Text style={s.evalLabel}>Skor Akhir</Text>
                  <Text style={[s.evalVal, { color: "#047857", fontWeight: "900" }]}>{currentScore} Poin</Text>
                </View>
              </View>
            </View>

            {/* Signature Petugas Sanitarian */}
            <View style={s.cardPanel}>
              <Text style={s.panelTitle}>Tanda Tangan Petugas Sanitarian</Text>
              <SignaturePad label="Bubuhkan tanda tangan Sanitarian di sini" onChange={setSignaturePetugas} />
            </View>

            {/* Signature Pengelola / Pemilik */}
            <View style={s.cardPanel}>
              <Text style={s.panelTitle}>Tanda Tangan Pengelola / Pemilik</Text>
              <SignaturePad label="Bubuhkan tanda tangan pemilik sasaran di sini" onChange={setSignature} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* 3. Sticky Bottom Action Bar (48dp Touch Compliant) */}
      <View style={[s.bottomActionBar, { paddingBottom: Math.max(16, insets.bottom) }]}>
        {activeTab > 1 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab((prev) => (prev - 1) as any);
            }}
            style={s.btnBottomPrev}
          >
            <Text style={s.btnBottomPrevText}>Kembali</Text>
          </Pressable>
        )}

        {activeTab < 3 ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab((prev) => (prev + 1) as any);
            }}
            style={s.btnBottomNext}
          >
            <Text style={s.btnBottomNextText}>Lanjutkan Langkah</Text>
            <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSubmit}
            disabled={mutation.isPending}
            style={[s.btnBottomSubmit, mutation.isPending && s.btnDisabled]}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Send size={18} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={s.btnBottomSubmitText}>Kirim Laporan Resmi</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  centerText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  headerBox: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 12,
  },
  btnBack: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11.5,
    color: "#047857",
    fontWeight: "700",
    marginTop: 1,
  },
  btnSaveDraftTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  btnSaveDraftTopText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "#F1F5F9",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#047857",
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: "#047857",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#047857",
    fontWeight: "800",
  },
  scrollContent: {
    padding: 16,
  },
  sectionWrap: {
    gap: 14,
  },
  groupBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  groupSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  fieldsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 12,
  },
  cardPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  panelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  panelDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginTop: -4,
  },
  evalBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  evalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  evalLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  evalVal: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  btnBottomPrev: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  btnBottomPrevText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#475569",
  },
  btnBottomNext: {
    flex: 2,
    minHeight: 50,
    backgroundColor: "#047857",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnBottomNextText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnBottomSubmit: {
    flex: 2,
    minHeight: 50,
    backgroundColor: "#047857",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnBottomSubmitText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
