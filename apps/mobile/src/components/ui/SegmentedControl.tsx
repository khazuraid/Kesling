import { Text, XStack, YStack } from "tamagui";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <XStack bg="$bg" borderRadius={12} padding="$1" mx="$4" mb="$4" borderWidth={1} borderColor="$border">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <YStack
            key={opt.value}
            flex={1}
            alignItems="center"
            paddingVertical="$2.5"
            borderRadius={10}
            bg={active ? "$card" : "transparent"}
            borderWidth={active ? 1 : 0}
            borderColor={active ? "$border" : "transparent"}
            shadow={
              active
                ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 }
                : undefined
            }
            onPress={() => onChange(opt.value)}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text fontSize="$3.5" fontWeight={active ? "700" : "500"} color={active ? "$fg" : "$muted"}>
              {opt.label}
            </Text>
          </YStack>
        );
      })}
    </XStack>
  );
}
