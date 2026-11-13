import * as Haptics from "expo-haptics";
import { Check, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type FieldType = "BOOLEAN" | "TEXT" | "OPTIONS" | "SELECT" | "NUMBER" | "DATE";

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
  const tipe = field.tipe.toUpperCase() as FieldType;
  const options = useMemo(() => parseOptions(field.options), [field.options]);

  const handleBooleanPress = (opt: "Ya" | "Tidak") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value === opt ? "" : opt);
  };

  if (tipe === "BOOLEAN") {
    const isYa = value === "Ya";
    const isTidak = value === "Tidak";

    return (
      <View style={s.container}>
        <Text style={s.label}>
          {field.pertanyaan}
          {field.isRequired ? <Text style={s.requiredMark}> *</Text> : null}
        </Text>

        <View style={s.buttonRow} accessibilityRole="radiogroup">
          {/* Tombol Ya (48dp touch target) */}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: isYa }}
            accessibilityLabel={`${field.pertanyaan}: Ya, Memenuhi Syarat`}
            onPress={() => handleBooleanPress("Ya")}
            style={[s.segmentedBtn, isYa && s.btnYaActive]}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <View style={[s.radioCircle, isYa && s.radioCircleYaActive]}>
              {isYa && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
            </View>
            <Text style={[s.btnText, isYa && s.btnTextYaActive]}>Ya (Memenuhi)</Text>
          </Pressable>

          {/* Tombol Tidak (48dp touch target) */}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: isTidak }}
            accessibilityLabel={`${field.pertanyaan}: Tidak, Tidak Memenuhi Syarat`}
            onPress={() => handleBooleanPress("Tidak")}
            style={[s.segmentedBtn, isTidak && s.btnTidakActive]}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <View style={[s.radioCircle, isTidak && s.radioCircleTidakActive]}>
              {isTidak && <X size={14} color="#FFFFFF" strokeWidth={3} />}
            </View>
            <Text style={[s.btnText, isTidak && s.btnTextTidakActive]}>Tidak (TMS)</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (tipe === "NUMBER") {
    return (
      <View style={s.container}>
        <Text style={s.label}>
          {field.pertanyaan}
          {field.isRequired ? <Text style={s.requiredMark}> *</Text> : null}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#94A3B8"
          style={s.input}
        />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.label}>
        {field.pertanyaan}
        {field.isRequired ? <Text style={s.requiredMark}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Tuliskan catatan hasil pemeriksaan..."
        placeholderTextColor="#94A3B8"
        multiline
        numberOfLines={3}
        style={[s.input, s.textArea]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    gap: 12,
  },
  label: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
  },
  requiredMark: {
    color: "#DC2626",
    fontWeight: "800",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  segmentedBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  btnYaActive: {
    borderColor: "#047857",
    backgroundColor: "#ECFDF5",
  },
  btnTidakActive: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleYaActive: {
    borderColor: "#047857",
    backgroundColor: "#047857",
  },
  radioCircleTidakActive: {
    borderColor: "#DC2626",
    backgroundColor: "#DC2626",
  },
  btnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  btnTextYaActive: {
    color: "#047857",
    fontWeight: "800",
  },
  btnTextTidakActive: {
    color: "#DC2626",
    fontWeight: "800",
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingVertical: 12,
  },
});
