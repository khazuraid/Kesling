import { CloudUpload, FileClock, Trash2 } from "@tamagui/lucide-icons-2";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { CardGroup, PageHeader, SectionLabel } from "../src/components/ui";
import { AppButton } from "../src/components/ui/Button";
import { Screen } from "../src/components/ui/Screen";
import { EmptyState } from "../src/components/ui/States";
import { api } from "../src/lib/api";
import { type Draft, getDrafts, removeDraft } from "../src/lib/drafts";

export default function DraftsScreen() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setDrafts(await getDrafts());
  }, []);

  useFocusEffect(() => {
    load();
  });

  const syncOne = async (d: Draft) => {
    try {
      await api.offlineSync({
        templateId: d.templateId,
        localId: d.localId,
        values: d.values,
        fieldValues: d.fieldValues,
      });
      await removeDraft(d.localId);
      return true;
    } catch {
      return false;
    }
  };

  const syncAll = async () => {
    setSyncing(true);
    let ok = 0;
    for (const d of drafts) {
      if (await syncOne(d)) ok++;
    }
    setSyncing(false);
    await load();
    Alert.alert("Sinkron", `${ok} dari ${drafts.length} draft tersinkron.`);
  };

  return (
    <Screen>
      <PageHeader title="Draft Offline" subtitle={`${drafts.length} draft tersimpan`} back />

      {drafts.length > 0 ? (
        <YStack mx="$4" mb="$3">
          <AppButton
            label={syncing ? "Menyinkron..." : "Sinkronkan Semua"}
            icon={<CloudUpload size={18} color="white" />}
            onPress={syncing ? undefined : syncAll}
            disabled={syncing}
          />
        </YStack>
      ) : null}

      {drafts.length > 0 ? (
        <>
          <SectionLabel>Draft</SectionLabel>
          <CardGroup>
            {drafts.map((d, i) => (
              <YStack key={d.localId}>
                <YStack
                  px="$4"
                  py="$3.5"
                  onPress={() => syncOne(d).then((ok) => (ok ? load() : null))}
                  pressStyle={{ opacity: 0.5 }}
                >
                  <XStack alignItems="center" gap="$3">
                    <YStack
                      w={36}
                      h={36}
                      borderRadius={10}
                      bg="$warningSoft"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <FileClock size={18} color="$warning" />
                    </YStack>
                    <YStack flex={1} gap="$0.5">
                      <Text fontSize="$4" fontWeight="500" color="$fg">
                        {d.templateName || `Pemeriksaan #${d.templateId}`}
                      </Text>
                      <Text fontSize="$2.5" color="$muted">
                        {new Date(d.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </Text>
                    </YStack>
                    <YStack onPress={() => removeDraft(d.localId).then(load)} pressStyle={{ opacity: 0.5 }} p="$1">
                      <Trash2 color="$danger" size={18} />
                    </YStack>
                  </XStack>
                </YStack>
                {i < drafts.length - 1 ? <YStack height={0.5} bg="$border" mx="$4" /> : null}
              </YStack>
            ))}
          </CardGroup>
        </>
      ) : (
        <EmptyState
          icon={<FileClock size={32} color="$muted" />}
          title="Tidak ada draft"
          description="Draft pemeriksaan offline akan muncul di sini."
        />
      )}
      <YStack h="$8" />
    </Screen>
  );
}
