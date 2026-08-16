import { Share2, Trash2 } from "@tamagui/lucide-icons-2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { ScrollView, Spinner, Text, XStack, YStack } from "tamagui";
import { GaugeChart } from "../../../src/components/motion/GaugeChart";
import { CardGroup, ListRow, PageHeader, SectionLabel } from "../../../src/components/ui";
import { StatusBadge } from "../../../src/components/ui/Badge";
import { Screen } from "../../../src/components/ui/Screen";
import { ErrorState } from "../../../src/components/ui/States";
import { api, getActiveToken } from "../../../src/lib/api";
import { shareInspectionPdf } from "../../../src/lib/exportPdf";

export default function InspectionResultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const resultId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();
  const [sharing, setSharing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["inspection-detail", resultId],
    queryFn: () => api.inspectionDetail(resultId),
    enabled: !!resultId,
  });

  const del = useMutation({
    mutationFn: () => api.deleteInspection(resultId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-results"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      Alert.alert("Berhasil", "Hasil pemeriksaan dihapus.");
      router.back();
    },
    onError: (e: any) => Alert.alert("Gagal", e.message),
  });

  if (isLoading) {
    return (
      <YStack flex={1} bg="$bg" alignItems="center" justifyContent="center">
        <Spinner color="$accent" size="large" />
      </YStack>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        <PageHeader title="Detail" back />
        <ErrorState message="Gagal memuat data pemeriksaan." onRetry={refetch} />
      </Screen>
    );
  }

  const onShare = async () => {
    setSharing(true);
    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Sesi berakhir. Login ulang.");
      await shareInspectionPdf(resultId, token);
    } catch (e: any) {
      Alert.alert("Gagal", e?.message || "Tidak dapat mengekspor PDF.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen>
      <PageHeader
        title={data.templateName}
        subtitle={new Date(data.tanggal).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        back
        right={<StatusBadge status={data.status} />}
      />

      <XStack mx="$4" mb="$3" gap="$2">
        <XStack
          flex={1}
          bg="$card"
          borderWidth={1}
          borderColor="$border"
          borderRadius={14}
          paddingVertical="$3"
          alignItems="center"
          justifyContent="center"
          gap="$2"
          onPress={onShare}
          pressStyle={{ opacity: 0.7 }}
          opacity={sharing ? 0.6 : 1}
        >
          <Share2 size={16} color="$accent" />
          <Text fontSize="$3.5" fontWeight="600" color="$fg">
            {sharing ? "Menyiapkan..." : "Ekspor PDF"}
          </Text>
        </XStack>
      </XStack>

      {data.skor != null ? (
        <XStack
          mx="$4"
          mb="$3"
          bg="$card"
          borderWidth={1}
          borderColor="$border"
          borderRadius={14}
          alignItems="center"
          justifyContent="center"
          paddingVertical="$2"
        >
          <GaugeChart value={data.skor} size={170} strokeWidth={14} />
        </XStack>
      ) : null}

      <SectionLabel>Sasaran</SectionLabel>
      <CardGroup>
        <ListRow title="Nama" value={data.namaSasaran || "-"} />
        <ListRow title="Alamat" value={data.alamatSasaran || "-"} />
        <ListRow title="Status" value={data.status} last />
      </CardGroup>

      {data.catatan ? (
        <>
          <SectionLabel>Catatan</SectionLabel>
          <CardGroup>
            <YStack px="$4" py="$3.5">
              <Text fontSize="$4" color="$fg">
                {data.catatan}
              </Text>
            </YStack>
          </CardGroup>
        </>
      ) : null}

      <SectionLabel>Jawaban</SectionLabel>
      <CardGroup>
        {data.values.map((v, i) => (
          <ListRow key={i} title={v.pertanyaan} value={String(v.value ?? "-")} last={i === data.values.length - 1} />
        ))}
        {!data.values.length ? (
          <YStack p="$4">
            <Text color="$muted" fontSize="$3.5">
              Tidak ada jawaban
            </Text>
          </YStack>
        ) : null}
      </CardGroup>

      <SectionLabel>Aksi</SectionLabel>
      <CardGroup>
        <ListRow
          title="Hapus Hasil"
          danger
          icon={<Trash2 size={18} color="$danger" />}
          last
          onPress={() =>
            Alert.alert("Hapus", "Hapus hasil pemeriksaan ini?", [
              { text: "Batal", style: "cancel" },
              { text: "Hapus", style: "destructive", onPress: () => del.mutate() },
            ])
          }
        />
      </CardGroup>
      <YStack h="$8" />
    </Screen>
  );
}
