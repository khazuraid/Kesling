import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Compass, Crosshair, ExternalLink, Layers, MapPin, Navigation, RefreshCw } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/lib/api";
import { getHighAccuracyLocation } from "../../src/lib/location";

const MOCK_PINS = [
  {
    id: 1,
    nama: "Depot Air Sumber Sehat Mandiri",
    kategori: "DEPOT AIR (DAM)",
    alamat: "Jl. Kartini No. 14, Kejaksan",
    lat: -6.7152,
    lng: 108.5532,
    status: "MS",
    jarak: "180m",
  },
  {
    id: 2,
    nama: "SDN 1 Kesenden",
    kategori: "TFU (SEKOLAH)",
    alamat: "Jl. Siliwangi No. 82, Kejaksan",
    lat: -6.7121,
    lng: 108.5581,
    status: "TMS",
    jarak: "420m",
  },
  {
    id: 3,
    nama: "Rumah Makan Padang Murah",
    kategori: "TPP (RESTORAN)",
    alamat: "Jl. Veteran No. 05, Kejaksan",
    lat: -6.7188,
    lng: 108.5511,
    status: "BELUM",
    jarak: "750m",
  },
  {
    id: 4,
    nama: "Klinik Pratama Sehat Bersama",
    kategori: "FASYANKES",
    alamat: "Jl. Wahidin No. 22, Kejaksan",
    lat: -6.721,
    lng: 108.549,
    status: "MS",
    jarak: "1.1km",
  },
];

export default function PetaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: serverSasaran } = useQuery({
    queryKey: ["sasaran-peta"],
    queryFn: () => api.sasaran(),
  });

  const allPins = useMemo(() => {
    if (serverSasaran && serverSasaran.length > 0) {
      return serverSasaran.map((s, idx) => ({
        id: s.id,
        nama: s.nama,
        kategori: s.subCategoryId ? `KATEGORI #${s.subCategoryId}` : "FASILITAS SANITASI",
        alamat: s.alamat || "Kota Cirebon",
        lat: s.lat ?? -6.7152 + idx * 0.003,
        lng: s.lng ?? 108.5532 + idx * 0.002,
        status: idx % 2 === 0 ? "MS" : "TMS",
        jarak: `${(idx + 1) * 150}m`,
      }));
    }
    return MOCK_PINS;
  }, [serverSasaran]);

  const [activeFilter, setActiveFilter] = useState("SEMUA");
  const [selectedPin, setSelectedPin] = useState<any>(MOCK_PINS[0]);
  const [locLoading, setLocLoading] = useState(false);
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (allPins.length > 0 && !selectedPin) {
      setSelectedPin(allPins[0]);
    }
  }, [allPins]);

  const fetchLocation = async () => {
    setLocLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const pos = await getHighAccuracyLocation();
    setLocLoading(false);
    if (pos) {
      setMyCoords({ lat: pos.lat, lng: pos.lng });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const openGoogleMapsRoute = (lat: number, lng: number, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(
      label,
    )}`;
    Linking.openURL(url);
  };

  const filteredPins = allPins.filter((p) => {
    if (activeFilter === "SEMUA") return true;
    if (activeFilter === "MS") return p.status === "MS";
    if (activeFilter === "TMS") return p.status === "TMS";
    return p.kategori.includes(activeFilter);
  });

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* 1. Header Filter Bar */}
      <View style={s.topBar}>
        <View style={s.headerTitleRow}>
          <Text style={s.headerTitle}>Peta Pemantauan Sasaran</Text>
          <Pressable onPress={fetchLocation} disabled={locLoading} style={s.btnGpsRefresh} hitSlop={8}>
            {locLoading ? (
              <ActivityIndicator size="small" color="#047857" />
            ) : (
              <Crosshair size={18} color="#047857" strokeWidth={2.4} />
            )}
          </Pressable>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipScroll}>
          {["SEMUA", "MS", "TMS", "DAM", "TFU", "TPP"].map((f) => (
            <Pressable
              key={f}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFilter(f);
              }}
              style={[s.chip, activeFilter === f && s.chipActive]}
            >
              <Text style={[s.chipText, activeFilter === f && s.chipTextActive]}>
                {f === "MS" ? "● Memenuhi (MS)" : f === "TMS" ? "● Tidak Memenuhi (TMS)" : f}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* 2. Visual Canvas Peta Interaktif (GIS HUD Canvas) */}
      <View style={s.mapCanvasArea}>
        {/* Mock Map Grid & Radar Background */}
        <View style={s.radarGrid}>
          <View style={s.radarCircleOuter} />
          <View style={s.radarCircleInner} />
          <View style={s.radarCrosshairH} />
          <View style={s.radarCrosshairV} />
        </View>

        {/* Posisi Petugas (My Location) */}
        <View style={s.myLocationMarker}>
          <View style={s.myLocationPulse} />
          <View style={s.myLocationDot} />
        </View>

        {/* Pin Sebaran Sasaran */}
        {filteredPins.map((pin, i) => {
          const isSelected = selectedPin?.id === pin.id;
          const isMs = pin.status === "MS";
          const isTms = pin.status === "TMS";

          // Dynamic offset for realistic scatter
          const topOffsets = [120, 210, 80, 270];
          const leftOffsets = [60, 220, 280, 140];

          return (
            <Pressable
              key={pin.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setSelectedPin(pin);
              }}
              style={[
                s.mapPinMarker,
                {
                  top: topOffsets[i % 4],
                  left: leftOffsets[i % 4],
                },
                isSelected && s.mapPinMarkerSelected,
              ]}
            >
              <View
                style={[s.pinBadge, isMs && s.pinBadgeMs, isTms && s.pinBadgeTms, !isMs && !isTms && s.pinBadgeBelum]}
              >
                <MapPin size={16} color="#FFFFFF" strokeWidth={2.4} />
              </View>
              {isSelected && (
                <View style={s.pinCallout}>
                  <Text numberOfLines={1} style={s.pinCalloutText}>
                    {pin.nama}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}

        {/* Koordinat Status Floating Banner */}
        <View style={s.gpsTelemetryBar}>
          <Text style={s.gpsTelemetryText}>
            GPS: {myCoords ? `${myCoords.lat.toFixed(5)}, ${myCoords.lng.toFixed(5)}` : "Mencari satelit..."} • Radius
            2km
          </Text>
        </View>
      </View>

      {/* 3. Draggable Bottom Sheet Detail Sasaran Terpilih */}
      {selectedPin && (
        <View style={s.bottomSheetCard}>
          <View style={s.sheetHandleBar} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1 }}>
              <View style={s.sheetBadgeRow}>
                <View
                  style={[
                    s.statusTag,
                    selectedPin.status === "MS" && s.statusTagMs,
                    selectedPin.status === "TMS" && s.statusTagTms,
                  ]}
                >
                  <Text
                    style={[
                      s.statusTagText,
                      selectedPin.status === "MS" && { color: "#047857" },
                      selectedPin.status === "TMS" && { color: "#DC2626" },
                    ]}
                  >
                    {selectedPin.status === "MS"
                      ? "MEMENUHI SYARAT (MS)"
                      : selectedPin.status === "TMS"
                        ? "TIDAK MEMENUHI (TMS)"
                        : "BELUM DIINSPEKSI"}
                  </Text>
                </View>
                <Text style={s.sheetDist}>{selectedPin.jarak} dari Anda</Text>
              </View>

              <Text style={s.sheetNama}>{selectedPin.nama}</Text>
              <Text style={s.sheetAlamat}>{selectedPin.alamat}</Text>
            </View>
          </View>

          {/* Tombol Aksi Buka Navigasi Rute & Inspeksi */}
          <View style={s.sheetActionRow}>
            <Pressable
              onPress={() => openGoogleMapsRoute(selectedPin.lat, selectedPin.lng, selectedPin.nama)}
              style={s.btnRoute}
            >
              <Navigation size={18} color="#047857" strokeWidth={2.2} />
              <Text style={s.btnRouteText}>Arahkan Rute</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/periksa")} style={s.btnInspect}>
              <Text style={s.btnInspectText}>Mulai IKL</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  btnGpsRefresh: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  chipScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#047857",
    borderColor: "#047857",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  mapCanvasArea: {
    flex: 1,
    backgroundColor: "#EEF2F6",
    position: "relative",
    overflow: "hidden",
  },
  radarGrid: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  radarCircleOuter: {
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: "rgba(4, 120, 87, 0.15)",
  },
  radarCircleInner: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "rgba(4, 120, 87, 0.25)",
  },
  radarCrosshairH: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "rgba(4, 120, 87, 0.12)",
  },
  radarCrosshairV: {
    position: "absolute",
    height: "100%",
    width: 1,
    backgroundColor: "rgba(4, 120, 87, 0.12)",
  },
  myLocationMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
    alignItems: "center",
    justifyContent: "center",
  },
  myLocationPulse: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(2, 132, 199, 0.2)",
    position: "absolute",
  },
  myLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0284C7",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  mapPinMarker: {
    position: "absolute",
    alignItems: "center",
    zIndex: 5,
  },
  mapPinMarkerSelected: {
    zIndex: 10,
    transform: [{ scale: 1.15 }],
  },
  pinBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  pinBadgeMs: {
    backgroundColor: "#047857",
  },
  pinBadgeTms: {
    backgroundColor: "#DC2626",
  },
  pinBadgeBelum: {
    backgroundColor: "#64748B",
  },
  pinCallout: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    maxWidth: 140,
  },
  pinCalloutText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  gpsTelemetryBar: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  gpsTelemetryText: {
    fontSize: 11,
    color: "#F8FAFC",
    fontWeight: "600",
    fontFamily: "monospace",
  },
  bottomSheetCard: {
    position: "absolute",
    bottom: 80,
    left: 14,
    right: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    gap: 12,
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
  },
  sheetHeader: {
    flexDirection: "row",
  },
  sheetBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  statusTagMs: {
    backgroundColor: "#ECFDF5",
  },
  statusTagTms: {
    backgroundColor: "#FEF2F2",
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
  },
  sheetDist: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  sheetNama: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  sheetAlamat: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  sheetActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  btnRoute: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#047857",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnRouteText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#047857",
  },
  btnInspect: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#047857",
    alignItems: "center",
    justifyContent: "center",
  },
  btnInspectText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
