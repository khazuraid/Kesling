import { CalendarDays, ClipboardCheck, Database, FileText, Plus } from "@tamagui/lucide-icons-2";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Text, XStack, YStack } from "tamagui";
import { CardGroup, ListRow, PageHeader, SectionLabel } from "../../src/components/ui";
import { StatusBadge } from "../../src/components/ui/Badge";
import { Screen } from "../../src/components/ui/Screen";
import { ListSkeleton, StatSkeleton } from "../../src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "../../src/components/ui/States";
import { api } from "../../src/lib/api";

export default function Beranda() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.dashboard,
  });
  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications(),
  });

  return (
    <Screen onRefresh={refetch}>
      <PageHeader title="Beranda" subtitle="Ringkasan aktivitas pemeriksaan" />

      {/* Hari libur mendatang */}
      {notifData?.liburMendatang?.length ? (
        <YStack mx="$4" mb="$4" gap="$2">
          {notifData.liburMendatang.map((l) => (
            <YStack
              key={l.tanggal}
              bg={l.sumber === "custom" ? "$accentSoft" : "$dangerSoft"}
              borderRadius={16}
              borderWidth={1}
              borderColor={l.sumber === "custom" ? "$accent" : "$danger"}
              p="$3.5"
              flexDirection="row"
              alignItems="center"
              gap="$3"
              onPress={() => router.push("/notifications")}
              pressStyle={{ opacity: 0.85 }}
            >
              <YStack
                w={40}
                h={40}
                borderRadius={12}
                bg={l.sumber === "custom" ? "$accent" : "$danger"}
                alignItems="center"
                justifyContent="center"
              >
                <CalendarDays size={20} color="white" />
              </YStack>
              <YStack flex={1} gap={2}>
                <Text
                  fontSize="$2"
                  color={l.sumber === "custom" ? "$accent" : "$danger"}
                  fontWeight="800"
                  letterSpacing={0.5}
                >
                  HARI LIBUR
                </Text>
                <Text fontSize="$3.5" fontWeight="700" color="$fg">
                  {l.keterangan}
                </Text>
                <Text fontSize="$2.5" color="$muted">
                  {l.hari}
                </Text>
              </YStack>
            </YStack>
          ))}
        </YStack>
      ) : null}

      {/* Stats */}
      {isLoading ? (
        <StatSkeleton count={2} />
      ) : error ? (
        <ErrorState message="Gagal memuat data dashboard." onRetry={refetch} />
      ) : (
        <XStack gap="$3" mx="$4" mb="$4">
          <YStack flex={1} p="$4" bg="$card" borderRadius={16} borderWidth={1} borderColor="$border">
            <Text fontSize="$2.5" color="$muted" fontWeight="700" letterSpacing={0.5}>
              PEMERIKSAAN
            </Text>
            <Text fontSize={32} fontWeight="800" color="$accent" mt="$1">
              {data?.userInspectionsCount ?? 0}
            </Text>
          </YStack>
          <YStack flex={1} p="$4" bg="$card" borderRadius={16} borderWidth={1} borderColor="$border">
            <Text fontSize="$2.5" color="$muted" fontWeight="700" letterSpacing={0.5}>
              SASARAN
            </Text>
            <Text fontSize={32} fontWeight="800" color="$success" mt="$1">
              {data?.sasaranCount ?? 0}
            </Text>
          </YStack>
        </XStack>
      )}

      {/* Quick actions */}
      <SectionLabel>Aksi Cepat</SectionLabel>
      <XStack gap="$3" mx="$4" mb="$4">
        <YStack
          flex={1}
          bg="$accent"
          borderRadius={16}
          p="$4"
          gap="$2"
          onPress={() => router.push("/(tabs)/periksa")}
          pressStyle={{ opacity: 0.85, scale: 0.98 }}
        >
          <YStack
            w={36}
            h={36}
            borderRadius={10}
            bg="rgba(255,255,255,0.2)"
            alignItems="center"
            justifyContent="center"
          >
            <Plus size={20} color="white" />
          </YStack>
          <Text fontSize="$4" fontWeight="700" color="white">
            Pemeriksaan
          </Text>
          <Text fontSize="$2.5" color="rgba(255,255,255,0.8)">
            Mulai inspeksi
          </Text>
        </YStack>
        <YStack
          flex={1}
          bg="$success"
          borderRadius={16}
          p="$4"
          gap="$2"
          onPress={() => router.push("/(tabs)/data")}
          pressStyle={{ opacity: 0.85, scale: 0.98 }}
        >
          <YStack
            w={36}
            h={36}
            borderRadius={10}
            bg="rgba(255,255,255,0.2)"
            alignItems="center"
            justifyContent="center"
          >
            <Database size={20} color="white" />
          </YStack>
          <Text fontSize="$4" fontWeight="700" color="white">
            Data
          </Text>
          <Text fontSize="$2.5" color="rgba(255,255,255,0.8)">
            Kelola sasaran
          </Text>
        </YStack>
      </XStack>

      {/* Recent inspections */}
      <SectionLabel>Terbaru</SectionLabel>
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : !data?.recentInspections?.length ? (
        <EmptyState
          icon={<ClipboardCheck size={32} color="$muted" />}
          title="Belum ada pemeriksaan"
          description="Mulai inspeksi pertama Anda dari menu Pemeriksaan."
          actionLabel="Mulai Periksa"
          onAction={() => router.push("/(tabs)/periksa")}
        />
      ) : (
        <CardGroup>
          {data.recentInspections.map((ins, i) => (
            <ListRow
              key={ins.id}
              title={ins.namaSasaran}
              subtitle={ins.templateName}
              value={new Date(ins.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
              icon={
                <YStack w={36} h={36} borderRadius={10} bg="$accentSoft" alignItems="center" justifyContent="center">
                  <FileText size={18} color="$accent" />
                </YStack>
              }
              onPress={() => router.push(`/inspection/result/${ins.id}`)}
              last={i === data.recentInspections.length - 1}
            />
          ))}
        </CardGroup>
      )}
      <YStack h="$8" />
    </Screen>
  );
}
