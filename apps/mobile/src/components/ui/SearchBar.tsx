import { Search, X } from "@tamagui/lucide-icons-2";
import { Input, XStack } from "tamagui";

export function SearchBar({
  value,
  onChange,
  placeholder = "Cari...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <XStack
      alignItems="center"
      gap="$2"
      bg="$card"
      borderRadius={12}
      borderWidth={1}
      borderColor="$border"
      px="$3"
      py="$2.5"
      mx="$4"
      mb="$2"
    >
      <Search size={18} color="$muted" />
      <Input
        flex={1}
        unstyled
        placeholder={placeholder}
        placeholderTextColor="$muted"
        color="$fg"
        value={value}
        onChangeText={onChange}
        fontSize="$4"
      />
      {value ? (
        <XStack onPress={() => onChange("")} pressStyle={{ opacity: 0.6 }}>
          <X size={16} color="$muted" />
        </XStack>
      ) : null}
    </XStack>
  );
}
