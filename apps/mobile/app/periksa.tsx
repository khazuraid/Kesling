import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/lib/api";

export default function PeriksaWizardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedKat, setSelectedKat] = useState<any>(null);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [searchSasaran, setSearchSasaran] = useState("");

  // 1. Fetch Kategori & Template
  const { data: kategoris, isLoading: loadKat } = useQuery({
    queryKey: ["kategori-list"],
    queryFn: () => api.categories(),
  });

  const { data: allTemplates, isLoading: loadTpl } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.templates(),
    enabled: !!selectedKat,
  });

  const templates = (allTemplates || []).filter((t: any) =>
    selectedKat?.id ? t.subCategoryId === selectedKat.id || t.categoryId === selectedKat.id : true,
  );

  // 2. Fetch Sasaran Terdaftar
  const { data: sasarans, isLoading: loadSasaran } = useQuery({
    queryKey: ["sasaran-picker", selectedKat?.id],
    queryFn: () => api.sasaran(selectedKat?.id),
    enabled: !!selectedKat,
  });

  const stepNumber = !selectedKat ? 1 : !selectedForm ? 2 : 3;

  const handleSelectKategori = (k: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedKat(k);
    setSelectedForm(null);
  };

  const handleSelectForm = (t: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedForm(t);
  };

  const handlePickSasaran = (sId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/inspection/${selectedForm.id}?sasaranId=${sId}`);
  };

  const handleCreateNewSasaran = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/inspection/${selectedForm.id}`);
  };

  const filteredSasaran = (sasarans || []).filter((s: any) =>
    searchSasaran
      ? s.nama?.toLowerCase().includes(searchSasaran.toLowerCase()) ||
        s.alamat?.toLowerCase().includes(searchSasaran.toLowerCase())
      : true,
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* 1. Header & Stepper */}
      <View style={s.topBar}>
        <View style={s.topBarNav}>
          <Pressable
            onPress={() => {
              if (selectedForm) setSelectedForm(null);
              else if (selectedKat) setSelectedKat(null);
              else router.back();
            }}
            style={s.btnBack}
            hitSlop={8}
          >
            <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
          </Pressable>
          <View>
            <Text style={s.topBarTitle}>Mulai Inspeksi (IKL)</Text>
            <Text style={s.topBarSub}>
              Langkah {stepNumber} dari 3:{" "}
              {stepNumber === 1 ? "Pilih Kategori" : stepNumber === 2 ? "Pilih Formulir" : "Pilih / Input Sasaran"}
            </Text>
          </View>
        </View>

        {/* Stepper Wizard Indicator */}
        <View style={s.stepperRow}>
          {["Kategori", "Formulir", "Sasaran"].map((step, idx) => {
            const isDone = idx + 1 < stepNumber;
            const isNow = idx + 1 === stepNumber;
            return (
              <View key={step} style={s.stepWrap}>
                <View style={[s.stepCircle, isNow && s.stepCircleNow, isDone && s.stepCircleDone]}>
                  {isDone ? (
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  ) : (
                    <Text style={[s.stepNum, isNow && s.stepNumNow]}>{idx + 1}</Text>
                  )}
                </View>
                <Text style={[s.stepLabel, isNow && s.stepLabelNow, isDone && s.stepLabelDone]}>{step}</Text>
                {idx < 2 && <View style={s.stepLine} />}
              </View>
            );
          })}
        </View>
      </View>

      {/* 2. Step Views */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scrollContent, { paddingBottom: 60 }]}>
        {/* STEP 1: Pilih Kategori */}
        {stepNumber === 1 && (
          <View style={s.stepSection}>
            <Text style={s.sectionPrompt}>Pilih kategori fasilitas / tempat yang akan diinspeksi:</Text>

            {loadKat ? (
              <ActivityIndicator size="small" color="#047857" style={{ marginTop: 24 }} />
            ) : (
              <View style={s.categoryGrid}>
                {(kategoris || []).map((k: any) => (
                  <Pressable key={k.id} onPress={() => handleSelectKategori(k)} style={s.categoryCard}>
                    <View style={s.categoryIconBox}>
                      <ClipboardCheck size={24} color="#047857" strokeWidth={2.2} />
                    </View>
                    <View style={s.categoryMeta}>
                      <Text style={s.categoryNama}>{k.nama}</Text>
                      <Text style={s.categoryKode}>{k.kode || "IKL DINKES"}</Text>
                    </View>
                    <ChevronRight size={18} color="#94A3B8" strokeWidth={2.4} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* STEP 2: Pilih Formulir */}
        {stepNumber === 2 && (
          <View style={s.stepSection}>
            <View style={s.selectedBadgeRow}>
              <Text style={s.selectedBadgeLabel}>Kategori Terpilih:</Text>
              <View style={s.selectedPill}>
                <Text style={s.selectedPillText}>{selectedKat.nama}</Text>
              </View>
            </View>

            <Text style={s.sectionPrompt}>Pilih instrumen standar pemeriksaan (form IKL):</Text>

            {loadTpl ? (
              <ActivityIndicator size="small" color="#047857" style={{ marginTop: 24 }} />
            ) : (
              <View style={s.formList}>
                {(templates || []).map((t: any) => (
                  <Pressable key={t.id} onPress={() => handleSelectForm(t)} style={s.formCard}>
                    <View style={s.formCardTop}>
                      <View style={s.formIcon}>
                        <FileText size={20} color="#047857" strokeWidth={2.2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.formNama}>{t.nama}</Text>
                        <Text style={s.formStandar}>Permenkes No. 2 Tahun 2023 • {t.kategori || "Sanitasi"}</Text>
                      </View>
                      <ChevronRight size={18} color="#94A3B8" strokeWidth={2.4} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* STEP 3: Pilih atau Input Sasaran Baru */}
        {stepNumber === 3 && (
          <View style={s.stepSection}>
            <View style={s.selectedBadgeRow}>
              <View style={s.selectedPill}>
                <Text style={s.selectedPillText}>{selectedForm.nama}</Text>
              </View>
            </View>

            {/* Quick Action: Sasaran Baru */}
            <Pressable onPress={handleCreateNewSasaran} style={s.btnNewSasaran}>
              <View style={s.btnNewSasaranIcon}>
                <Sparkles size={18} color="#FFFFFF" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.btnNewSasaranTitle}>Input Sasaran Baru di Lapangan</Text>
                <Text style={s.btnNewSasaranSub}>Nama tempat belum terdaftar di data dasar Dinkes</Text>
              </View>
              <ChevronRight size={16} color="#047857" strokeWidth={2.4} />
            </Pressable>

            {/* Search Existing Sasaran */}
            <View style={s.searchBarWrap}>
              <Search size={16} color="#64748B" strokeWidth={2.2} />
              <TextInput
                value={searchSasaran}
                onChangeText={setSearchSasaran}
                placeholder="Cari sasaran terdaftar..."
                placeholderTextColor="#94A3B8"
                style={s.searchBarInput}
              />
            </View>

            <Text style={s.sasaranListTitle}>Pilih dari Sasaran Terdaftar ({filteredSasaran.length}):</Text>

            {loadSasaran ? (
              <ActivityIndicator size="small" color="#047857" style={{ marginTop: 24 }} />
            ) : filteredSasaran.length > 0 ? (
              <View style={s.sasaranGrid}>
                {filteredSasaran.map((item: any) => (
                  <Pressable key={item.id} onPress={() => handlePickSasaran(item.id)} style={s.sasaranItemCard}>
                    <View style={s.sasaranItemHeader}>
                      <MapPin size={14} color="#047857" strokeWidth={2.2} />
                      <Text style={s.sasaranItemNama}>{item.nama}</Text>
                    </View>
                    <Text style={s.sasaranItemAlamat} numberOfLines={2}>
                      {item.alamat || "Kota Cirebon"}
                    </Text>
                    <View style={s.sasaranItemFooter}>
                      <Text style={s.sasaranItemPkm}>{item.puskesmas?.nama || "Puskesmas Kejaksan"}</Text>
                      <View style={s.btnPickBadge}>
                        <Text style={s.btnPickBadgeText}>Pilih</Text>
                        <ChevronRight size={12} color="#047857" strokeWidth={2.4} />
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={s.emptySasaranBox}>
                <Text style={s.emptySasaranText}>
                  Tidak ada sasaran terdaftar yang cocok. Anda dapat langsung menggunakan tombol "Input Sasaran Baru" di
                  atas.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 14,
  },
  topBarNav: {
    flexDirection: "row",
    alignItems: "center",
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
  topBarTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  topBarSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  stepWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    position: "relative",
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleNow: {
    backgroundColor: "#047857",
  },
  stepCircleDone: {
    backgroundColor: "#10B981",
  },
  stepNum: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
  },
  stepNumNow: {
    color: "#FFFFFF",
  },
  stepLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#94A3B8",
  },
  stepLabelNow: {
    color: "#047857",
    fontWeight: "800",
  },
  stepLabelDone: {
    color: "#0F172A",
    fontWeight: "700",
  },
  stepLine: {
    width: 20,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginLeft: 6,
  },
  scrollContent: {
    padding: 16,
  },
  stepSection: {
    gap: 14,
  },
  sectionPrompt: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  categoryGrid: {
    gap: 10,
  },
  categoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  categoryIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  categoryMeta: {
    flex: 1,
    gap: 2,
  },
  categoryNama: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  categoryKode: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
  },
  selectedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedBadgeLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  selectedPill: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  selectedPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  formList: {
    gap: 10,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  formCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  formIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  formNama: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  formStandar: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  btnNewSasaran: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  btnNewSasaranIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#047857",
    alignItems: "center",
    justifyContent: "center",
  },
  btnNewSasaranTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#047857",
  },
  btnNewSasaranSub: {
    fontSize: 11.5,
    color: "#065F46",
    marginTop: 1,
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
    gap: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  sasaranListTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
    marginTop: 4,
  },
  sasaranGrid: {
    gap: 10,
  },
  sasaranItemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  sasaranItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sasaranItemNama: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  sasaranItemAlamat: {
    fontSize: 12,
    color: "#64748B",
  },
  sasaranItemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  sasaranItemPkm: {
    fontSize: 11,
    color: "#047857",
    fontWeight: "700",
  },
  btnPickBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  btnPickBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  emptySasaranBox: {
    padding: 20,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
  },
  emptySasaranText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
});
