import { Check, ChevronLeft, ClipboardCheck, MapPin, Plus } from "@tamagui/lucide-icons-2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Input, ScrollView, Spinner, Text, XStack, YStack } from "tamagui";
import { InspectionField } from "../../src/components/InspectionField";
import { SuccessCheck } from "../../src/components/motion/SuccessCheck";
import { PhotoCapture, type PhotoItem } from "../../src/components/PhotoCapture";
import { SignaturePad } from "../../src/components/SignaturePad";
import { CardGroup, ListRow, SectionLabel } from "../../src/components/ui";
import { AppButton } from "../../src/components/ui/Button";
import { EmptyState } from "../../src/components/ui/States";
import { api } from "../../src/lib/api";
import { cacheGet, cacheSet } from "../../src/lib/cache";
import { saveDraft } from "../../src/lib/drafts";
import type { TemplateDetail } from "../../src/types";

export default function InspectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const templateId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [selectedSasaranId, setSelectedSasaranId] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [signature, setSignature] = useState<{ base64Data: string } | undefined>();

  const progressSv = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressSv.value}%`,
  }));

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

  // hydrate from cache once (offline-first)
  useEffect(() => {
    if (!templateId) return;
    cacheGet<TemplateDetail>(`template_${templateId}`).then((cached) => {
      if (cached) qc.setQueryData(["template", templateId], cached);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const { data: sasarans, refetch: refetchSasaran } = useQuery({
    queryKey: ["sasaran"],
    queryFn: () => api.sasaran(),
  });

  useFocusEffect(() => {
    refetchSasaran();
  });

  const answered = template?.fields.filter((f) => values[String(f.id)]).length ?? 0;
  const total = template?.fields.length ?? 0;
  const progress = total ? Math.round((answered / total) * 100) : 0;
  useEffect(() => {
    progressSv.value = withSpring(progress, { damping: 18, stiffness: 120 });
  }, [progress]);

  const mutation = useMutation({
    mutationFn: async () => {
      try {
        return await api.offlineSync({
          templateId,
          localId: `${Date.now()}`,
          values: { nama: nama || "Tanpa Nama", alamat: alamat || "-" },
          fieldValues: values,
          photos,
          signature,
          sasaranId: selectedSasaranId,
        });
      } catch (e: any) {
        await saveDraft({
          localId: `${Date.now()}`,
          templateId,
          templateName: template?.nama,
          values: { nama: nama || "Tanpa Nama", alamat: alamat || "-" },
          fieldValues: values,
          createdAt: new Date().toISOString(),
        });
        return { id: 0, status: "DRAFT", syncedAt: "" };
      }
    },
    onSuccess: (data) => {
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
    const missing = template?.fields.filter((f) => f.isRequired && !values[String(f.id)]);
    if (missing?.length) {
      Alert.alert("Perhatian", `Jawab pertanyaan wajib: ${missing[0].pertanyaan}`);
      return;
    }
    if (!nama.trim()) {
      Alert.alert("Perhatian", "Pilih atau isi nama sasaran.");
      return;
    }
    mutation.mutate();
  };

  if (isLoading) {
    return (
      <YStack flex={1} bg="$bg" alignItems="center" justifyContent="center">
        <Spinner color="$accent" size="large" />
      </YStack>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView flex={1} bg="$bg" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <YStack bg="$accent" pt="$6" pb="$6" px="$4">
          <XStack alignItems="center" gap="$1" mb="$3" onPress={() => router.back()} pressStyle={{ opacity: 0.7 }}>
            <ChevronLeft color="white" size={24} />
            <Text color="white" fontSize="$4" fontWeight="500">
              Kembali
            </Text>
          </XStack>
          <XStack alignItems="center" gap="$3">
            <YStack
              w={48}
              h={48}
              borderRadius={14}
              bg="rgba(255,255,255,0.2)"
              alignItems="center"
              justifyContent="center"
            >
              <ClipboardCheck size={26} color="white" />
            </YStack>
            <YStack flex={1}>
              <Text color="white" fontSize={22} fontWeight="800" letterSpacing={-0.5}>
                {template?.nama}
              </Text>
              {template?.deskripsi ? (
                <Text color="rgba(255,255,255,0.85)" fontSize="$3" numberOfLines={2}>
                  {template.deskripsi}
                </Text>
              ) : null}
            </YStack>
          </XStack>
          {/* Progress */}
          <YStack mt="$4" gap="$1.5">
            <XStack justifyContent="space-between">
              <Text color="rgba(255,255,255,0.85)" fontSize="$2.5" fontWeight="700" letterSpacing={0.5}>
                PROGRES
              </Text>
              <Text color="white" fontSize="$2.5" fontWeight="700">
                {answered}/{total}
              </Text>
            </XStack>
            <YStack height={6} borderRadius={3} bg="rgba(255,255,255,0.25)" overflow="hidden">
              <Animated.View style={[{ height: 6, backgroundColor: "white", borderRadius: 3 }, progressStyle]} />
            </YStack>
          </YStack>
        </YStack>

        {/* Content */}
        <YStack px="$4" mt="$4">
          {/* Step 1: Pilih Sasaran */}
          <SectionLabel>1 · PILIH SASARAN</SectionLabel>
          {sasarans?.length ? (
            <YStack gap="$2" mb="$3">
              {sasarans.map((s) => {
                const selected = s.id === selectedSasaranId;
                return (
                  <YStack
                    key={s.id}
                    p="$3.5"
                    bg="$card"
                    borderRadius={16}
                    borderWidth={1.5}
                    borderColor={selected ? "$accent" : "$border"}
                    onPress={() => pickSasaran(s)}
                    pressStyle={{ opacity: 0.7 }}
                  >
                    <XStack alignItems="center" gap="$3">
                      <YStack w={40} h={40} borderRadius={12} bg="$bg" alignItems="center" justifyContent="center">
                        <MapPin size={18} color="$success" />
                      </YStack>
                      <YStack flex={1} gap="$0.5">
                        <Text fontSize="$4" fontWeight="600" color="$fg">
                          {s.nama}
                        </Text>
                        {s.alamat ? (
                          <Text fontSize="$2.5" color="$muted" numberOfLines={1}>
                            {s.alamat}
                          </Text>
                        ) : null}
                      </YStack>
                      {selected ? (
                        <YStack
                          w={26}
                          h={26}
                          borderRadius={13}
                          bg="$accent"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Check color="white" size={15} />
                        </YStack>
                      ) : (
                        <YStack w={26} h={26} borderRadius={13} borderWidth={1.5} borderColor="$border" />
                      )}
                    </XStack>
                  </YStack>
                );
              })}
            </YStack>
          ) : (
            <EmptyState
              icon={<MapPin size={32} color="$muted" />}
              title="Belum ada sasaran"
              description="Tambahkan sasaran untuk mulai inspeksi."
            />
          )}

          <AppButton
            label="Sasaran Baru"
            variant="secondary"
            size="sm"
            icon={<Plus size={18} color="$accent" />}
            onPress={() => router.push(`/sasaran/new?sub=${template?.subCategoryId}`)}
          />

          {/* Step 2: Identitas */}
          <SectionLabel>2 · IDENTITAS SASARAN</SectionLabel>
          <YStack bg="$card" borderRadius={16} borderWidth={1} borderColor="$border" p="$4" gap="$3" mb="$4">
            <FieldInput label="Nama Sasaran" value={nama} onChange={setNama} placeholder="Nama tempat" />
            <FieldInput label="Alamat" value={alamat} onChange={setAlamat} placeholder="Alamat" />
          </YStack>

          {/* Step 3: Jawaban */}
          <SectionLabel>3 · JAWABAN PEMERIKSAAN</SectionLabel>
          <YStack gap="$3" mb="$5">
            {template?.fields.map((field) => (
              <InspectionField
                key={field.id}
                field={field}
                value={values[String(field.id)] || ""}
                onChange={(v) => setValues((p) => ({ ...p, [String(field.id)]: v }))}
              />
            ))}
            {!template?.fields.length ? (
              <YStack bg="$card" borderRadius={16} borderWidth={1} borderColor="$border" p="$4">
                <Text color="$muted" fontSize="$3.5">
                  Template ini tidak memiliki pertanyaan.
                </Text>
              </YStack>
            ) : null}
          </YStack>

          <SectionLabel>4 · FOTO BUKTI</SectionLabel>
          <YStack bg="$card" borderRadius={16} borderWidth={1} borderColor="$border" p="$4" mb="$4">
            <PhotoCapture photos={photos} onChange={setPhotos} max={6} />
          </YStack>

          <SectionLabel>5 · TANDA TANGAN PEMILIK</SectionLabel>
          <YStack bg="$card" borderRadius={16} borderWidth={1} borderColor="$border" p="$4" mb="$4">
            <SignaturePad onChange={setSignature} />
          </YStack>

          <AppButton
            label={mutation.isPending ? "Menyimpan..." : "Simpan Pemeriksaan"}
            onPress={mutation.isPending ? undefined : submit}
            disabled={mutation.isPending}
          />
          <YStack h="$8" />
        </YStack>
      </ScrollView>
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

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <YStack gap="$1.5">
      <Text fontSize="$2.5" color="$muted" fontWeight="700" textTransform="uppercase" letterSpacing={0.5}>
        {label}
      </Text>
      <Input
        bg="$bg"
        borderRadius={12}
        borderWidth={1}
        borderColor="$border"
        px="$3"
        py="$2.5"
        fontSize="$4"
        color="$fg"
        placeholder={placeholder}
        placeholderTextColor="$muted"
        value={value}
        onChangeText={onChange}
      />
    </YStack>
  );
}
