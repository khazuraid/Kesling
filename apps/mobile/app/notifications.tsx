import { Bell, CalendarDays, CheckCheck, Clock } from "@tamagui/lucide-icons-2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Text, XStack, YStack } from "tamagui";
import { CardGroup, PageHeader, SectionLabel } from "../src/components/ui";
import { AppButton } from "../src/components/ui/Button";
import { Screen } from "../src/components/ui/Screen";
import { ListSkeleton } from "../src/components/ui/Skeleton";
import { EmptyState } from "../src/components/ui/States";
import { api } from "../src/lib/api";

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  return `${day} hari lalu`;
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications(),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.markNotifRead(undefined, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOneMutation = useMutation({
    mutationFn: (id: number) => api.markNotifRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <Screen onRefresh={onRefresh}>
      <PageHeader title="Notifikasi" subtitle="Pengingat & informasi puskesmas" back />

      {/* Hari libur mendatang */}
      {data && data.liburMendatang.length > 0 ? (
        <>
          <SectionLabel>Hari Libur Mendatang</SectionLabel>
          <YStack mx="$4" mb="$3" gap="$2">
            {data.liburMendatang.map((l) => (
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
        </>
      ) : null}

      {/* Deadline rencana ≤3 hari */}
      {data && (data as any).deadlineRencana?.length > 0 ? (
        <>
          <SectionLabel>Deadline Pemeriksaan</SectionLabel>
          <YStack mx="$4" mb="$3" gap="$2">
            {(data as any).deadlineRencana.map((r: any) => (
              <YStack
                key={r.id}
                bg="$warningSoft"
                borderRadius={16}
                borderWidth={1}
                borderColor="$warning"
                p="$3.5"
                flexDirection="row"
                alignItems="center"
                gap="$3"
              >
                <YStack w={40} h={40} borderRadius={12} bg="$warning" alignItems="center" justifyContent="center">
                  <Clock size={20} color="white" />
                </YStack>
                <YStack flex={1} gap={2}>
                  <Text fontSize="$2" color="$warning" fontWeight="800" letterSpacing={0.5}>
                    BATAS WAKTU
                  </Text>
                  <Text fontSize="$3.5" fontWeight="700" color="$fg">
                    {r.sasaranNama}
                  </Text>
                  <Text fontSize="$2.5" color="$muted">
                    {new Date(r.tanggal + "T00:00:00").toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </Text>
                </YStack>
              </YStack>
            ))}
          </YStack>
        </>
      ) : null}

      {data && data.unreadCount > 0 ? (
        <YStack mx="$4" mb="$3">
          <AppButton
            label={`Tandai Semua Dibaca (${data.unreadCount})`}
            variant="secondary"
            size="sm"
            icon={<CheckCheck size={16} color="$accent" />}
            onPress={() => markAllMutation.mutate()}
          />
        </YStack>
      ) : null}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : data && data.notifications.length > 0 ? (
        <>
          <SectionLabel>{data.notifications.length} Notifikasi</SectionLabel>
          <CardGroup>
            {data.notifications.map((n, i) => (
              <YStack key={n.id}>
                <YStack
                  px="$4"
                  py="$3"
                  onPress={() => !n.isRead && markOneMutation.mutate(n.id)}
                  pressStyle={{ opacity: 0.5 }}
                >
                  <XStack gap="$3" width="100%" alignItems="flex-start">
                    <YStack
                      w={36}
                      h={36}
                      borderRadius={10}
                      bg={n.isRead ? "$bg" : "$accent"}
                      alignItems="center"
                      justifyContent="center"
                      mt="$0.5"
                    >
                      <Bell size={16} color={n.isRead ? "$muted" : "white"} />
                    </YStack>
                    <YStack flex={1} gap="$1">
                      <XStack alignItems="center" gap="$2">
                        <Text fontSize="$3.5" fontWeight={n.isRead ? "500" : "700"} color="$fg" flex={1}>
                          {n.title}
                        </Text>
                        {!n.isRead ? <YStack w={8} h={8} borderRadius={4} bg="$accent" /> : null}
                      </XStack>
                      <Text fontSize="$3" color="$muted">
                        {n.message}
                      </Text>
                      <Text fontSize="$2" color="$muted">
                        {timeAgo(n.createdAt)}
                      </Text>
                    </YStack>
                  </XStack>
                </YStack>
                {i < data.notifications.length - 1 ? <YStack height={0.5} bg="$border" mx="$4" /> : null}
              </YStack>
            ))}
          </CardGroup>
        </>
      ) : (
        <EmptyState
          icon={<Bell size={32} color="$muted" />}
          title="Tidak Ada Notifikasi"
          description="Notifikasi deadline laporan dan rencana bulanan akan muncul di sini."
        />
      )}
      <YStack h="$8" />
    </Screen>
  );
}
