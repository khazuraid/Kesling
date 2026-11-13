import * as Haptics from "expo-haptics";
import { Crosshair, MapPin, RefreshCw } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { type AccurateCoordinates, getHighAccuracyLocation } from "../lib/location";

interface LocationPickerProps {
  lat?: number | null;
  lng?: number | null;
  value?: { lat: number; lng: number } | null;
  onChange?: (coords: { lat: number; lng: number }) => void;
  onLocationSelect?: (coords: AccurateCoordinates) => void;
  disabled?: boolean;
}

export function LocationPicker({
  lat: propLat,
  lng: propLng,
  value,
  onChange,
  onLocationSelect,
  disabled = false,
}: LocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const effectiveLat = value?.lat ?? propLat;
  const effectiveLng = value?.lng ?? propLng;

  const handleGetLocation = async () => {
    if (disabled || loading) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const coords = await getHighAccuracyLocation();
    setLoading(false);

    if (coords) {
      setAccuracy(coords.accuracy);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (onChange) onChange({ lat: coords.lat, lng: coords.lng });
      if (onLocationSelect) onLocationSelect(coords);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const hasCoords = effectiveLat != null && effectiveLng != null;

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View style={s.iconTitle}>
          <MapPin size={18} color="#047857" strokeWidth={2.2} />
          <Text style={s.title}>Titik Koordinat GPS Sasaran</Text>
        </View>

        {accuracy != null && (
          <View style={s.accuracyBadge}>
            <Text style={s.accuracyText}>Akurasi: ±{accuracy}m</Text>
          </View>
        )}
      </View>

      <View style={s.bodyRow}>
        <View style={s.coordBox}>
          <Text style={s.coordLabel}>Koordinat Lokasi:</Text>
          <Text style={s.coordValue}>
            {hasCoords ? `${effectiveLat!.toFixed(6)}, ${effectiveLng!.toFixed(6)}` : "Belum ditentukan"}
          </Text>
        </View>

        <Pressable
          onPress={handleGetLocation}
          disabled={disabled || loading}
          style={[s.btnGps, loading && s.btnGpsDisabled]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Crosshair size={16} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={s.btnGpsText}>{hasCoords ? "Perbarui" : "Ambil GPS"}</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  accuracyBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  accuracyText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  coordBox: {
    gap: 2,
  },
  coordLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  },
  coordValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    fontFamily: "monospace",
  },
  btnGps: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#047857",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnGpsDisabled: {
    opacity: 0.6,
  },
  btnGpsText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
