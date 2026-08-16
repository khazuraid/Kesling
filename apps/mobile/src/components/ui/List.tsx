import { ChevronRight } from "@tamagui/lucide-icons-2";
import { Separator, Text, XStack, YStack } from "tamagui";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      paddingHorizontal="$4"
      paddingVertical="$2"
      fontSize="$2.5"
      fontWeight="700"
      color="$muted"
      textTransform="uppercase"
      letterSpacing={0.5}
    >
      {children}
    </Text>
  );
}

export function ListRow({
  title,
  subtitle,
  value,
  icon,
  onPress,
  last,
  danger,
}: {
  title: string;
  subtitle?: string;
  value?: string | number;
  icon?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
}) {
  return (
    <>
      <YStack
        paddingHorizontal="$4"
        paddingVertical="$3.5"
        onPress={onPress}
        disabled={!onPress}
        pressStyle={{ opacity: 0.5 }}
      >
        <XStack alignItems="center" gap="$3">
          {icon ? (
            <YStack w={36} h={36} borderRadius={10} bg="$bg" alignItems="center" justifyContent="center">
              {icon}
            </YStack>
          ) : null}
          <YStack flex={1} gap="$0.5">
            <Text fontSize="$4" fontWeight="500" color={danger ? "$danger" : "$fg"}>
              {title}
            </Text>
            {subtitle ? (
              <Text fontSize="$2.5" color="$muted">
                {subtitle}
              </Text>
            ) : null}
          </YStack>
          {value !== undefined ? (
            <Text fontSize="$3.5" color="$muted" fontWeight="600">
              {value}
            </Text>
          ) : null}
          {onPress ? <ChevronRight size={18} color="$muted" /> : null}
        </XStack>
      </YStack>
      {!last ? <Separator borderColor="$border" marginHorizontal="$4" /> : null}
    </>
  );
}

export function CardGroup({ children, mx = "$4", mb = "$4" }: { children: React.ReactNode; mx?: string; mb?: string }) {
  return (
    <YStack
      mx={mx as any}
      mb={mb as any}
      borderRadius={16}
      bg="$card"
      borderWidth={1}
      borderColor="$border"
      overflow="hidden"
    >
      {children}
    </YStack>
  );
}
