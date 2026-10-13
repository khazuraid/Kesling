import { useMemo, useState } from "react";
import { Input, Text, XStack, YStack } from "tamagui";
import { ActionSheet } from "./motion/ActionSheet";

type FieldType = "BOOLEAN" | "TEXT" | "OPTIONS" | "SELECT" | "NUMBER" | "DATE";

/** Parse options safely: JSON array or comma-separated. Never throws. */
function parseOptions(raw: string | null): string[] {
  if (!raw) return [];
  try {
    if (raw.trim().startsWith("[")) {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map(String) : [];
    }
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

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
  const [open, setOpen] = useState(false);
  const tipe = field.tipe.toUpperCase() as FieldType;

  const options = useMemo(() => parseOptions(field.options), [field.options]);

  if (tipe === "BOOLEAN") {
    return (
      <YStack gap="$2">
        <Text fontSize="$4" fontWeight="600" color="$fg">
          {field.pertanyaan}
          {field.isRequired ? " *" : ""}
        </Text>
        <XStack gap="$2">
          {["Ya", "Tidak"].map((opt) => (
            <YStack
              key={opt}
              flex={1}
              onPress={() => onChange(value === opt ? "" : opt)}
              pressStyle={{ opacity: 0.6 }}
              paddingHorizontal="$4"
              paddingVertical="$3.5"
              borderWidth={1}
              borderRadius={12}
              borderColor={value === opt ? "$accent" : "$border"}
              backgroundColor={value === opt ? "$accentSoft" : "$card"}
              alignItems="center"
            >
              <Text fontSize="$4" fontWeight={value === opt ? "700" : "400"} color={value === opt ? "$accent" : "$fg"}>
                {opt}
              </Text>
            </YStack>
          ))}
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
        <>
          <YStack
            onPress={() => {
              if (options.length) setOpen(true);
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
          <ActionSheet
            open={open}
            onClose={() => setOpen(false)}
            title={field.pertanyaan}
            items={options.map((opt) => ({
              label: opt,
              onPress: () => onChange(opt),
            }))}
          />
        </>
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
          fontSize={14}
        />
      )}
    </YStack>
  );
}
