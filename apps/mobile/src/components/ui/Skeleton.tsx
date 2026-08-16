import { Text, XStack, YStack } from "tamagui";

export function Skeleton({
  width = "100%",
  height = 16,
  radius = 8,
}: {
  width?: number | string;
  height?: number;
  radius?: number;
}) {
  return (
    <YStack width={width as any} height={height} borderRadius={radius} bg="$border" animation="quick" opacity={0.6} />
  );
}

export function ListSkeleton({ rows = 6, height = 64 }: { rows?: number; height?: number }) {
  return (
    <YStack gap="$3" paddingHorizontal="$4">
      {Array.from({ length: rows }).map((_, i) => (
        <XStack
          key={i}
          alignItems="center"
          gap="$3"
          padding="$3"
          bg="$card"
          borderRadius={16}
          borderWidth={1}
          borderColor="$border"
        >
          <Skeleton width={40} height={40} radius={12} />
          <YStack flex={1} gap="$1.5">
            <Skeleton width="70%" height={14} />
            <Skeleton width="40%" height={11} />
          </YStack>
        </XStack>
      ))}
    </YStack>
  );
}

export function StatSkeleton({ count = 2 }: { count?: number }) {
  return (
    <XStack gap="$3" mx="$4" mb="$3">
      {Array.from({ length: count }).map((_, i) => (
        <YStack
          key={i}
          flex={1}
          padding="$4"
          bg="$card"
          borderRadius={16}
          borderWidth={1}
          borderColor="$border"
          gap="$2"
        >
          <Skeleton width="60%" height={11} />
          <Skeleton width="40%" height={28} />
        </YStack>
      ))}
    </XStack>
  );
}
