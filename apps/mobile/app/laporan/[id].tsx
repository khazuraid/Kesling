import { Check, ChevronLeft, Share2 } from "@tamagui/lucide-icons-2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Share } from "react-native";
import { Button, Card, Input, ScrollView, Spinner, Text, XStack, YStack } from "tamagui";
import { SectionLabel } from "../../src/components/ui";
import { AppButton } from "../../src/components/ui/Button";
import { api } from "../../src/lib/api";

type Param = { id: number; nama: string; code: string; type: string; required: boolean; urutan: number; config: any };
type Val = { parameterId: number; subCategoryId: number | null; value: string };

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

  // Local state for values — keyed by `${paramId}_${subId|''}`
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [catatan, setCatatan] = useState("");

  // Initialize from server data
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

  const getValue = (paramId: number, subId: number | null) => {
    return edited[`${paramId}_${subId ?? ""}`] || "";
  };

  const setValue = (paramId: number, subId: number | null, val: string) => {
    setEdited((p) => ({ ...p, [`${paramId}_${subId ?? ""}`]: val }));
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const values: Val[] = [];
      for (const [key, val] of Object.entries(edited)) {
        if (!val) continue;
        const [paramId, subId] = key.split("_");
        values.push({
          parameterId: Number(paramId),
          subCategoryId: subId ? Number(subId) : null,
          value: val,
        });
      }
      return api.saveLaporan(laporanId, { values, catatan, status: "DRAFT" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["laporan-detail", laporanId] });
      qc.invalidateQueries({ queryKey: ["laporan"] });
      Alert.alert("Berhasil", "Laporan disimpan.");
      router.back();
    },
    onError: (e: any) => Alert.alert("Gagal", e.message || "Terjadi kesalahan."),
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const values: Val[] = [];
      for (const [key, val] of Object.entries(edited)) {
        if (!val) continue;
        const [paramId, subId] = key.split("_");
        values.push({
          parameterId: Number(paramId),
          subCategoryId: subId ? Number(subId) : null,
          value: val,
        });
      }
      return api.saveLaporan(laporanId, { values, catatan, status: "SUBMITTED" });
    },
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
      <YStack flex={1} bg="$bg" alignItems="center" justifyContent="center">
        <Spinner color="$accent" />
      </YStack>
    );
  }

  if (isError || !data) {
    return (
      <YStack flex={1} bg="$bg" alignItems="center" justifyContent="center" gap="$3">
        <Text color="$muted">Laporan tidak ditemukan.</Text>
      </YStack>
    );
  }

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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView flex={1} bg="$bg" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <YStack bg="$accent" pt="$4" pb="$6" paddingHorizontal="$4">
          <Button unstyled alignSelf="flex-start" onPress={() => router.back()} chromeless mb="$2">
            <XStack alignItems="center" gap="$1">
              <ChevronLeft color="white" size={24} />
              <Text color="white" fontSize="$4" fontWeight="500">
                Kembali
              </Text>
            </XStack>
          </Button>
          <Text color="white" fontSize={22} fontWeight="800" letterSpacing={-0.5}>
            {data.categoryName}
          </Text>
          <Text color="rgba(255,255,255,0.85)" fontSize="$3">
            {bulanNames[data.bulan - 1]} {data.tahun}
          </Text>
          <XStack mt="$2" gap="$2" alignItems="center">
            <YStack bg="rgba(255,255,255,0.2)" px="$3" py="$1" borderRadius={8}>
              <Text color="white" fontSize="$2.5" fontWeight="600">
                {data.status}
              </Text>
            </YStack>
            <Button
              unstyled
              chromeless
              onPress={() =>
                Share.share({
                  message: `Laporan ${data.categoryName} — ${bulanNames[data.bulan - 1]} ${data.tahun} (${data.status})`,
                })
              }
              ml="auto"
              hitSlop={8}
            >
              <XStack bg="rgba(255,255,255,0.2)" px="$3" py="$1" borderRadius={8} gap="$1.5" alignItems="center">
                <Share2 size={14} color="white" />
                <Text color="white" fontSize="$2.5" fontWeight="600">
                  Bagikan
                </Text>
              </XStack>
            </Button>
          </XStack>
        </YStack>

        <YStack paddingHorizontal="$4" marginTop="$4">
          {/* Form: if rowBased, group by subCategory; if not, flat params */}
          {data.isRowBased && data.subCategories.length > 0 ? (
            data.subCategories.map((sub) => (
              <YStack key={sub.id} mb="$4">
                <SectionLabel>{sub.nama}</SectionLabel>
                <YStack bg="$card" borderRadius={16} borderWidth={1} borderColor="$border" p="$4" gap="$3">
                  {data.parameters.map((param) => (
                    <ParamInput
                      key={param.id}
                      param={param}
                      value={getValue(param.id, sub.id)}
                      onChange={(v) => setValue(param.id, sub.id, v)}
                    />
                  ))}
                </YStack>
              </YStack>
            ))
          ) : (
            <YStack bg="$card" borderRadius={16} borderWidth={1} borderColor="$border" p="$4" gap="$3" mb="$4">
              {data.parameters.map((param) => (
                <ParamInput
                  key={param.id}
                  param={param}
                  value={getValue(param.id, null)}
                  onChange={(v) => setValue(param.id, null, v)}
                />
              ))}
            </YStack>
          )}

          {/* Catatan */}
          <SectionLabel>Catatan</SectionLabel>
          <YStack bg="$card" borderRadius={16} borderWidth={1} borderColor="$border" p="$4" mb="$4">
            <Input
              value={catatan}
              onChangeText={setCatatan}
              placeholder="Catatan laporan..."
              placeholderTextColor="$muted"
              color="$fg"
              multiline
              minHeight={80}
              bg="$bg"
              borderWidth={1}
              borderColor="$border"
              borderRadius={12}
              px="$3"
              py="$2.5"
              fontSize="$4"
            />
          </YStack>

          {/* Buttons */}
          <AppButton
            label={saveMutation.isPending ? "Menyimpan..." : "Simpan Draft"}
            onPress={saveMutation.isPending ? undefined : () => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            mb="$3"
          />
          <AppButton
            label={submitMutation.isPending ? "Menyimpan..." : "Submit"}
            variant="secondary"
            onPress={
              submitMutation.isPending
                ? undefined
                : () => {
                    Alert.alert("Submit", "Kirim laporan untuk approval?", [
                      { text: "Batal", style: "cancel" },
                      { text: "Submit", onPress: () => submitMutation.mutate() },
                    ]);
                  }
            }
            disabled={submitMutation.isPending}
            mb="$8"
          />
        </YStack>
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
      <YStack gap="$1.5">
        <Text fontSize="$2.5" color="$muted" fontWeight="600">
          {param.nama.toUpperCase()}
        </Text>
        <XStack gap="$2">
          <YStack
            flex={1}
            py="$2.5"
            alignItems="center"
            borderRadius={12}
            borderWidth={1.5}
            borderColor={on ? "$success" : "$border"}
            backgroundColor={on ? "rgba(52,199,89,0.12)" : "$bg"}
            onPress={() => onChange("true")}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text fontSize="$4" fontWeight="700" color={on ? "$success" : "$muted"}>
              Ya
            </Text>
          </YStack>
          <YStack
            flex={1}
            py="$2.5"
            alignItems="center"
            borderRadius={12}
            borderWidth={1.5}
            borderColor={!on && value ? "$danger" : "$border"}
            backgroundColor={!on && value ? "rgba(255,59,48,0.12)" : "$bg"}
            onPress={() => onChange("false")}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text fontSize="$4" fontWeight="700" color={!on && value ? "$danger" : "$muted"}>
              Tidak
            </Text>
          </YStack>
        </XStack>
      </YStack>
    );
  }

  return (
    <YStack gap="$1.5">
      <Text fontSize="$2.5" color="$muted" fontWeight="600">
        {param.nama.toUpperCase()}
        {param.required ? " *" : ""}
      </Text>
      <Input
        value={value}
        onChangeText={onChange}
        placeholder={param.nama}
        placeholderTextColor="$muted"
        color="$fg"
        bg="$bg"
        borderWidth={1}
        borderColor="$border"
        borderRadius={12}
        px="$3"
        py="$2.5"
        fontSize="$4"
        keyboardType={isNumber ? "numeric" : "default"}
      />
    </YStack>
  );
}
