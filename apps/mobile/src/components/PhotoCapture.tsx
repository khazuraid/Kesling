import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Camera, Image as ImageIcon, Trash2, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { processAndWatermarkPhoto } from "../lib/watermark-camera";

export type PhotoItem = {
  uri?: string;
  base64: string;
  mimeType: string;
};

export function PhotoCapture({
  photos,
  onChange,
  max = 6,
  coords,
  sasaranName,
}: {
  photos: PhotoItem[];
  onChange: (p: PhotoItem[]) => void;
  max?: number;
  coords?: { lat: number; lng: number };
  sasaranName?: string;
}) {
  const [busy, setBusy] = useState(false);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Izin Kamera Diperlukan",
        "Aplikasi membutuhkan akses kamera untuk mengambil bukti dokumentasi inspeksi.",
      );
      return;
    }

    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
      });

      if (!res.canceled && res.assets[0]?.uri) {
        const processed = await processAndWatermarkPhoto(res.assets[0].uri, {
          coords,
          sasaranName,
        });

        onChange(
          [
            ...photos,
            {
              uri: processed.uri,
              base64: processed.base64,
              mimeType: processed.mimeType,
            },
          ].slice(0, max),
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      Alert.alert("Gagal Mengambil Foto", e?.message || "Terjadi kesalahan kamera.");
    } finally {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Izin Galeri Diperlukan", "Aplikasi membutuhkan akses galeri foto.");
      return;
    }

    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: max - photos.length,
      });

      if (!res.canceled && res.assets.length > 0) {
        const processedList: PhotoItem[] = [];
        for (const asset of res.assets) {
          if (asset.uri) {
            const p = await processAndWatermarkPhoto(asset.uri, {
              coords,
              sasaranName,
            });
            processedList.push({
              uri: p.uri,
              base64: p.base64,
              mimeType: p.mimeType,
            });
          }
        }
        onChange([...photos, ...processedList].slice(0, max));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      Alert.alert("Gagal Memilih Foto", e?.message || "Terjadi kesalahan galeri.");
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(photos.filter((_, idx) => idx !== index));
  };

  return (
    <View style={s.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {photos.map((p, i) => (
          <View key={i} style={s.thumbBox}>
            <Image
              source={{
                uri: p.uri || `data:${p.mimeType};base64,${p.base64}`,
              }}
              style={s.thumbImg}
            />
            <Pressable onPress={() => removePhoto(i)} style={s.btnRemove} hitSlop={8}>
              <X size={12} color="#FFFFFF" strokeWidth={3} />
            </Pressable>
            <View style={s.watermarkBadge}>
              <Text style={s.watermarkBadgeText}>TERKOMPRESI</Text>
            </View>
          </View>
        ))}

        {photos.length < max && (
          <Pressable onPress={takePhoto} disabled={busy} style={[s.btnAdd, busy && s.btnDisabled]}>
            {busy ? (
              <ActivityIndicator size="small" color="#047857" />
            ) : (
              <>
                <Camera size={22} color="#047857" strokeWidth={2.2} />
                <Text style={s.btnAddText}>Foto Bukti</Text>
              </>
            )}
          </Pressable>
        )}

        {photos.length < max && (
          <Pressable onPress={pickFromGallery} disabled={busy} style={[s.btnAdd, s.btnGallery, busy && s.btnDisabled]}>
            <ImageIcon size={22} color="#64748B" strokeWidth={2.2} />
            <Text style={s.btnGalleryText}>Galeri</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={s.infoRow}>
        <Text style={s.infoText}>
          {photos.length} dari {max} foto terlampir • Otomatis dikompresi (~200KB)
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 8,
  },
  scrollContent: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  thumbBox: {
    position: "relative",
    width: 90,
    height: 90,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  btnRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(220, 38, 38, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  watermarkBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: "center",
  },
  watermarkBadgeText: {
    fontSize: 7.5,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  btnAdd: {
    width: 90,
    height: 90,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#047857",
    borderStyle: "dashed",
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  btnGallery: {
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnAddText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#047857",
  },
  btnGalleryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoText: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "500",
  },
});
