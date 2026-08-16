import { Camera, X } from "@tamagui/lucide-icons-2";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export type PhotoItem = { base64: string; mimeType: string };

export function PhotoCapture({
  photos,
  onChange,
  max = 6,
}: {
  photos: PhotoItem[];
  onChange: (p: PhotoItem[]) => void;
  max?: number;
}) {
  const [busy, setBusy] = useState(false);

  const take = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    setBusy(true);
    try {
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
        exif: false,
      });
      if (!res.canceled && res.assets[0]?.base64) {
        onChange(
          [...photos, { base64: res.assets[0].base64, mimeType: res.assets[0].mimeType || "image/jpeg" }].slice(0, max),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const pick = async () => {
    setBusy(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        base64: true,
        allowsMultipleSelection: true,
        selectionLimit: max - photos.length,
      });
      if (!res.canceled) {
        const added = res.assets
          .filter((a) => a.base64)
          .map((a) => ({ base64: a.base64!, mimeType: a.mimeType || "image/jpeg" }));
        onChange([...photos, ...added].slice(0, max));
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = (i: number) => onChange(photos.filter((_, idx) => idx !== i));

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 12 }}
      >
        {photos.map((p, i) => (
          <View key={i} style={styles.thumbWrap}>
            <Image source={{ uri: `data:${p.mimeType};base64,${p.base64}` }} style={styles.thumb} />
            <Pressable style={styles.removeBtn} onPress={() => remove(i)} hitSlop={6}>
              <X size={12} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}
        {photos.length < max ? (
          <Pressable style={styles.addBtn} onPress={take} disabled={busy}>
            <Camera size={22} color="#00A876" />
            <Text style={styles.addText}>{busy ? "..." : "Kamera"}</Text>
          </Pressable>
        ) : null}
        {photos.length < max ? (
          <Pressable style={[styles.addBtn, { backgroundColor: "#F7F5F2" }]} onPress={pick} disabled={busy}>
            <Text style={styles.addText}>📁</Text>
            <Text style={styles.addText}>Galeri</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <Text style={styles.hint}>
        {photos.length}/{max} foto · kompresi otomatis
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  thumbWrap: { position: "relative" },
  thumb: { width: 76, height: 76, borderRadius: 14, borderWidth: 1, borderColor: "#ECE7E1" },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 76,
    height: 76,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    borderStyle: "dashed",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addText: { fontSize: 10, color: "#00A876", fontWeight: "600" },
  hint: { fontSize: 11, color: "#8A8580", marginTop: 8 },
});
