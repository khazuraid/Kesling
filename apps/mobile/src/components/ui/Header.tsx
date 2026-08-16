import { ChevronLeft } from "@tamagui/lucide-icons-2";
import { useRouter } from "expo-router";
import { Text, XStack, YStack } from "tamagui";

export function PageHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <YStack paddingHorizontal="$4" paddingVertical="$5" gap="$1">
      {back ? (
        <XStack
          alignItems="center"
          gap="$1"
          marginBottom="$2"
          onPress={() => router.back()}
          pressStyle={{ opacity: 0.6 }}
        >
          <ChevronLeft size={22} color="$accent" />
          <Text fontSize="$3" color="$accent" fontWeight="500">
            Kembali
          </Text>
        </XStack>
      ) : null}
      <XStack alignItems="flex-end" justifyContent="space-between" gap="$2">
        <YStack flex={1} gap="$1">
          <Text fontSize={30} fontWeight="800" color="$fg" letterSpacing={-1.2}>
            {title}
          </Text>
          {subtitle ? (
            <Text fontSize="$3.5" color="$muted">
              {subtitle}
            </Text>
          ) : null}
        </YStack>
        {right}
      </XStack>
    </YStack>
  );
}
