import { Alert } from "react-native";
import { Input, Text, XStack, YStack } from "tamagui";

type FieldType = "BOOLEAN" | "TEXT" | "OPTIONS" | "SELECT" | "NUMBER" | "DATE";

export function InspectionField({
  field,
  value,
  onChange,
}: {
  field: {
    id: number;
    pertanyaan: string;
    tipe: string;
    isRequired: boolean;
    options: string | null;
  };
  value: string;
  onChange: (v: string) => void;
}) {
  const tipe = field.tipe.toUpperCase() as FieldType;

  // BOOLEAN → Ya/Tidak segmented buttons (jelas, keduanya terlihat)
  if (tipe === "BOOLEAN") {
    const on = value === "TRUE" || value === "Ya" || value === "true" || value === "1";
    return (
      <YStack gap="$2" p="$3.5" bg="$card" borderRadius={16} borderWidth={1} borderColor="$border">
        <Text fontSize="$4" fontWeight="600" color="$fg">
          {field.pertanyaan}
          {field.isRequired ? " *" : ""}
        </Text>
        <XStack gap="$2">
          <YStack
            flex={1}
            py="$2.5"
            alignItems="center"
            borderRadius={12}
            borderWidth={1.5}
            borderColor={on ? "$success" : "$border"}
            backgroundColor={on ? "$successSoft" : "$bg"}
            onPress={() => onChange("TRUE")}
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
            backgroundColor={!on && value ? "$dangerSoft" : "$bg"}
            onPress={() => onChange("FALSE")}
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
    <YStack gap="$2">
      <Text fontSize="$4" fontWeight="600" color="$fg">
        {field.pertanyaan}
        {field.isRequired ? " *" : ""}
      </Text>

      {tipe === "OPTIONS" || tipe === "SELECT" ? (
        <YStack
          onPress={() => {
            const opts = field.options
              ? field.options.startsWith("[")
                ? JSON.parse(field.options)
                : field.options.split(",").map((s) => s.trim())
              : [];
            if (!opts.length) return;
            Alert.alert(
              field.pertanyaan,
              "Pilih salah satu",
              opts
                .map((opt: string) => ({
                  text: opt,
                  onPress: () => onChange(opt),
                }))
                .concat({ text: "Batal", onPress: () => {}, style: "cancel" }),
            );
          }}
          pressStyle={{ opacity: 0.6 }}
          paddingHorizontal="$4"
          paddingVertical="$3.5"
          borderWidth={1}
          borderColor={value ? "$accent" : "$border"}
          borderRadius={12}
          backgroundColor={value ? "$accentSoft" : "$card"}
        >
          <Text fontSize="$4" color={value ? "$accent" : "$muted"}>
            {value || "Pilih..."}
          </Text>
        </YStack>
      ) : (
        <Input
          value={value}
          onChangeText={onChange}
          placeholder={tipe === "DATE" ? "YYYY-MM-DD" : "Jawaban..."}
          placeholderTextColor="$muted"
          color="$fg"
          bg="$card"
          borderWidth={1}
          borderColor="$border"
          borderRadius={12}
          px="$3"
          py="$2.5"
          fontSize="$3"
          keyboardType={tipe === "NUMBER" ? "numeric" : "default"}
        />
      )}
    </YStack>
  );
}
