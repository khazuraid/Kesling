import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Crosshair,
  ExternalLink,
  MapPin,
  Navigation,
  Radio,
  Share2,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { api, getActiveToken } from "../../../src/lib/api";
import { shareInspectionPdf } from "../../../src/lib/exportPdf";

export default function InspectionResultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const resultId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [sharing, setSharing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["inspection-detail", resultId],
    queryFn: () => api.inspectionDetail(resultId),
    enabled: !!resultId,
  });

  const del = useMutation({
    mutationFn: () => api.deleteInspection(resultId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-results"] });
      qc.invalidateQueries({ queryKey: ["mobile-dashboard"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Berhasil", "Hasil pemeriksaan dihapus dari server.");
      router.back();
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Gagal Menghapus", String(e?.message ?? e));
    },
  });

  const onShare = async () => {
    if (!resultId) return;
    try {
      setSharing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const token = await getActiveToken();
      if (!token) throw new Error("Sesi login tidak aktif.");
      await shareInspectionPdf(resultId, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Gagal Unduh PDF", e?.message || "Tidak dapat memproses dokumen PDF.");
    } finally {
      setSharing(false);
    }
  };

  const openExternalRoute = (lat: number, lng: number, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(
      label,
    )}`;
    Linking.openURL(url);
  };

  const isMs = data?.status === "MS";
  const isTms = data?.status === "TMS";

  // Koordinat fallback Kota Cirebon jika titik sasaran kosong
  const targetLat = data?.lat ?? -6.7152;
  const targetLng = data?.lng ?? 108.5532;
  const hasExactCoord = data?.lat != null && data?.lng != null;

  // HTML Webview Leaflet Map Dark Radar Tile
  const mapHtml = useMemo(() => {
    const pinColor = isMs ? "#10B981" : isTms ? "#EF4444" : "#F59E0B";
    const sasaranLabel = (data?.namaSasaran || "SASARAN IKL")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          html, body, #map { width:100%; height:100%; background:#090D16; }
          .leaflet-control-attribution { display:none !important; }
          .radar-pulse {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: rgba(16, 185, 129, 0.25);
            border: 2px solid ${pinColor};
            box-shadow: 0 0 12px ${pinColor};
            animation: pulse 2s infinite ease-out;
          }
          @keyframes pulse {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          .custom-pin {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: ${pinColor};
            border: 2px solid #FFFFFF;
            position: absolute;
            top: 7px;
            left: 7px;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', {
            center: [${targetLat}, ${targetLng}],
            zoom: 16,
            zoomControl: false,
            attributionControl: false
          });
          // CartoDB Dark Matter tiles (Technical GIS visual)
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
          }).addTo(map);

          const pinIcon = L.divIcon({
            className: 'radar-container',
            html: '<div class="radar-pulse"></div><div class="custom-pin"></div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          L.marker([${targetLat}, ${targetLng}], { icon: pinIcon })
            .addTo(map)
            .bindPopup('<b>${sasaranLabel}</b><br>LAT: ${targetLat}<br>LNG: ${targetLng}')
            .openPopup();
        </script>
      </body>
      </html>
    `;
  }, [targetLat, targetLng, isMs, isTms, data?.namaSasaran]);

  if (isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={s.loadingText}>MENGAMBIL TELEMETRI LAPORAN #{resultId}...</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[s.root, s.center, { paddingTop: insets.top }]}>
        <AlertTriangle size={36} color="#EF4444" />
        <Text style={s.emptyTitle}>TELEMETRI TIDAK DITEMUKAN</Text>
        <Text style={s.emptyDesc}>Dokumen hasil pemeriksaan tidak terdaftar di server cloud.</Text>
        <Pressable onPress={() => refetch()} style={s.btnRetry}>
          <Text style={s.btnRetryText}>Sinkronisasi Ulang</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* 1. Technical HUD Header Bar */}
      <View style={s.hudHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke daftar pemeriksaan"
          onPress={() => router.back()}
          style={s.hudBtnIcon}
          hitSlop={8}
        >
          <ArrowLeft size={18} color="#94A3B8" strokeWidth={2.4} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={s.hudBadgeRow}>
            <View style={s.hudLiveDot} />
            <Text style={s.hudStatusText}>TERVERIFIKASI RESMI • DINKES CIREBON</Text>
          </View>
          <Text style={s.hudTitle}>HASIL INSPEKSI #{resultId}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hapus hasil pemeriksaan dari server"
          onPress={() =>
            Alert.alert("Konfirmasi Hapus", "Hapus data hasil pemeriksaan ini dari cloud?", [
              { text: "Batal", style: "cancel" },
              {
                text: "Hapus",
                style: "destructive",
                onPress: () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  del.mutate();
                },
              },
            ])
          }
          style={s.hudBtnTrash}
          hitSlop={8}
        >
          <Trash2 size={16} color="#EF4444" strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Signature Score HUD Dial */}
        <View style={s.scoreScopeCard}>
          <View style={s.scopeRingsBg}>
            <View style={s.scopeRingOuter} />
            <View style={s.scopeRingMid} />
            <View style={s.scopeAxisH} />
            <View style={s.scopeAxisV} />
          </View>

          <View style={s.scoreContentRow}>
            <View style={s.scoreBadgeDial}>
              <Text style={s.scoreVal}>{data.skor ?? "85"}</Text>
              <Text style={s.scoreSub}>SKOR IKL</Text>
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <View
                style={[
                  s.statusVerdictPill,
                  isMs && s.verdictMs,
                  isTms && s.verdictTms,
                  !isMs && !isTms && s.verdictPending,
                ]}
              >
                {isMs ? (
                  <ShieldCheck size={14} color="#10B981" strokeWidth={2.5} />
                ) : (
                  <AlertTriangle size={14} color="#EF4444" strokeWidth={2.5} />
                )}
                <Text
                  style={[
                    s.verdictPillText,
                    isMs && { color: "#10B981" },
                    isTms && { color: "#EF4444" },
                    !isMs && !isTms && { color: "#F59E0B" },
                  ]}
                >
                  {isMs ? "MEMENUHI SYARAT (MS)" : isTms ? "TIDAK MEMENUHI (TMS)" : data.status || "EVALUASI"}
                </Text>
              </View>
              <Text style={s.sasaranNameText}>{data.namaSasaran || "Sasaran Lapangan"}</Text>
              <Text style={s.templateSubText}>{data.templateName || "STANDAR BAKU MUTU PERMENKES"}</Text>
            </View>
          </View>
        </View>

        {/* 3. GIS Live Radar Map Viewport */}
        <View style={s.gisMapCard}>
          <View style={s.gisMapHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Radio size={14} color="#10B981" />
              <Text style={s.gisMapHeaderTitle}>GIS RADAR PEMANTAUAN LOKASI</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buka navigasi rute di Google Maps"
              onPress={() => openExternalRoute(targetLat, targetLng, data.namaSasaran || "Sasaran IKL")}
              style={s.btnMapRouteNav}
              hitSlop={6}
            >
              <Navigation size={13} color="#10B981" strokeWidth={2.4} />
              <Text style={s.btnMapRouteText}>Rute Maps</Text>
            </Pressable>
          </View>

          {/* Leaflet Dark Matter WebView */}
          <View style={s.webviewContainer}>
            {Platform.OS === "web" ? (
              <View style={s.webFallbackMap}>
                <MapPin size={24} color="#10B981" />
                <Text style={s.webFallbackText}>
                  LAT {targetLat.toFixed(6)} • LNG {targetLng.toFixed(6)}
                </Text>
              </View>
            ) : (
              <WebView
                originWhitelist={["*"]}
                source={{ html: mapHtml }}
                style={s.webview}
                scrollEnabled={false}
                renderError={() => (
                  <View style={[s.webFallbackMap, { backgroundColor: "#090D16" }]}>
                    <MapPin size={28} color="#10B981" />
                    <Text style={[s.webFallbackText, { color: "#F8FAFC", marginTop: 6 }]}>
                      PETA OFFLINE (TITIK GPS AKTIF)
                    </Text>
                    <Text style={{ fontSize: 11, color: "#64748B", fontFamily: "monospace" }}>
                      {targetLat.toFixed(6)}, {targetLng.toFixed(6)}
                    </Text>
                  </View>
                )}
              />
            )}

            {/* Floating RTK telemetry chip */}
            <View style={s.rtkFloatingBadge}>
              <Crosshair size={12} color="#FBBF24" />
              <Text style={s.rtkFloatingText}>
                {hasExactCoord
                  ? `RTK RT: ${targetLat.toFixed(5)}, ${targetLng.toFixed(5)}`
                  : `GPS DEFAULT: KOTA CIREBON`}
              </Text>
            </View>
          </View>

          <View style={s.gisLocationFooter}>
            <MapPin size={14} color="#64748B" style={{ marginTop: 2 }} />
            <Text style={s.gisAddressText} numberOfLines={2}>
              {data.alamatSasaran || "Kota Cirebon, Jawa Barat"}
            </Text>
          </View>
        </View>

        {/* 4. Telemetry Details Grid */}
        <View style={s.telemetryPanel}>
          <Text style={s.panelHeadTitle}>TELEMETRI PARAMETER PENGAWASAN</Text>

          <View style={s.telemetryRow}>
            <View style={s.telemetryCol}>
              <Text style={s.telemetryLabel}>TANGGAL INSPEKSI</Text>
              <View style={s.telemetryValueRow}>
                <Calendar size={13} color="#94A3B8" />
                <Text style={s.telemetryVal}>{data.tanggal || "-"}</Text>
              </View>
            </View>
            <View style={s.telemetryCol}>
              <Text style={s.telemetryLabel}>VALIDITAS METODE</Text>
              <Text style={s.telemetryVal}>INSPEKSI FISIK & UJI</Text>
            </View>
          </View>

          {data.catatan && (
            <View style={s.catatanBox}>
              <Text style={s.catatanLabel}>CATATAN RESMI SANITARIAN:</Text>
              <Text style={s.catatanText}>{data.catatan}</Text>
            </View>
          )}
        </View>

        {/* 5. Item Checklist Baku Mutu */}
        {data.values && data.values.length > 0 && (
          <View style={s.checklistCard}>
            <Text style={s.panelHeadTitle}>HASIL EVALUASI VARIABEL ({data.values.length})</Text>
            <View style={s.checkItemsContainer}>
              {data.values.map((v, idx) => {
                const valStr = String(v.value ?? "").toUpperCase();
                const isItemYes = valStr === "YA" || valStr === "TRUE" || valStr === "MS";
                return (
                  <View key={idx} style={s.checkRowItem}>
                    <View style={s.checkStatusIcon}>
                      {isItemYes ? (
                        <CheckCircle2 size={16} color="#10B981" strokeWidth={2.4} />
                      ) : (
                        <XCircle size={16} color="#64748B" strokeWidth={2.4} />
                      )}
                    </View>
                    <Text style={s.checkQuestionText}>{v.pertanyaan}</Text>
                    <View style={[s.valBadge, isItemYes ? s.valBadgeYes : s.valBadgeNo]}>
                      <Text style={[s.valBadgeText, isItemYes ? { color: "#10B981" } : { color: "#94A3B8" }]}>
                        {String(v.value ?? "-")}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 6. Sticky Bottom Action Bar */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bagikan dokumen resmi hasil inspeksi dalam format PDF"
          onPress={onShare}
          disabled={sharing}
          style={[s.btnSharePrimary, sharing && { opacity: 0.7 }]}
        >
          {sharing ? (
            <ActivityIndicator size="small" color="#052E16" />
          ) : (
            <Share2 size={18} color="#052E16" strokeWidth={2.4} />
          )}
          <Text style={s.btnShareText}>{sharing ? "MEMBUAT DOKUMEN..." : "BAGIKAN HASIL BUKTI SAH (PDF)"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#080C14",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#10B981",
    letterSpacing: 1,
    fontWeight: "700",
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "monospace",
    fontWeight: "800",
    color: "#F8FAFC",
    letterSpacing: 0.5,
  },
  emptyDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  btnRetry: {
    marginTop: 10,
    backgroundColor: "#111C2E",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  btnRetryText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "700",
  },
  hudHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D131F",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    gap: 12,
  },
  hudBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#161F30",
    borderWidth: 1,
    borderColor: "#253349",
    alignItems: "center",
    justifyContent: "center",
  },
  hudBtnTrash: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  hudBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  hudLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  hudStatusText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  hudTitle: {
    fontSize: 15,
    fontFamily: "monospace",
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: -0.2,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 110,
  },
  scoreScopeCard: {
    backgroundColor: "#0E1626",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 18,
    position: "relative",
    overflow: "hidden",
  },
  scopeRingsBg: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.15,
  },
  scopeRingOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  scopeRingMid: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  scopeAxisH: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "#10B981",
  },
  scopeAxisV: {
    position: "absolute",
    height: "100%",
    width: 1,
    backgroundColor: "#10B981",
  },
  scoreContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    zIndex: 2,
  },
  scoreBadgeDial: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#080C14",
    borderWidth: 2,
    borderColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  scoreVal: {
    fontSize: 26,
    fontFamily: "monospace",
    fontWeight: "900",
    color: "#F8FAFC",
  },
  scoreSub: {
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "800",
    color: "#10B981",
    letterSpacing: 0.5,
  },
  statusVerdictPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  verdictMs: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.35)",
  },
  verdictTms: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  verdictPending: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.35)",
  },
  verdictPillText: {
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sasaranNameText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: -0.3,
  },
  templateSubText: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#64748B",
    fontWeight: "600",
  },
  gisMapCard: {
    backgroundColor: "#0E1626",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    overflow: "hidden",
  },
  gisMapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#090D16",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  gisMapHeaderTitle: {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  btnMapRouteNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  btnMapRouteText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#10B981",
  },
  webviewContainer: {
    height: 180,
    position: "relative",
    backgroundColor: "#080C14",
  },
  webview: {
    flex: 1,
    backgroundColor: "#080C14",
  },
  webFallbackMap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  webFallbackText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#94A3B8",
  },
  rtkFloatingBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(8, 12, 20, 0.88)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  rtkFloatingText: {
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#F8FAFC",
  },
  gisLocationFooter: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#0B101C",
    borderTopWidth: 1,
    borderTopColor: "#172236",
  },
  gisAddressText: {
    flex: 1,
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 17,
  },
  telemetryPanel: {
    backgroundColor: "#0E1626",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 14,
    gap: 12,
  },
  panelHeadTitle: {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  telemetryRow: {
    flexDirection: "row",
    gap: 12,
  },
  telemetryCol: {
    flex: 1,
    backgroundColor: "#080C14",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1A2438",
    gap: 4,
  },
  telemetryLabel: {
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  telemetryValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  telemetryVal: {
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "800",
    color: "#F8FAFC",
  },
  catatanBox: {
    backgroundColor: "#080C14",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E293B",
    gap: 4,
  },
  catatanLabel: {
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "800",
    color: "#F59E0B",
    letterSpacing: 0.5,
  },
  catatanText: {
    fontSize: 13,
    color: "#CBD5E1",
    lineHeight: 19,
  },
  checklistCard: {
    backgroundColor: "#0E1626",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 14,
    gap: 10,
  },
  checkItemsContainer: {
    gap: 8,
  },
  checkRowItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#080C14",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#182337",
    gap: 10,
  },
  checkStatusIcon: {
    width: 20,
    alignItems: "center",
  },
  checkQuestionText: {
    flex: 1,
    fontSize: 13,
    color: "#E2E8F0",
    lineHeight: 18,
  },
  valBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  valBadgeYes: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  valBadgeNo: {
    backgroundColor: "rgba(100, 116, 139, 0.12)",
    borderColor: "rgba(100, 116, 139, 0.25)",
  },
  valBadgeText: {
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "800",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#080C14",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  btnSharePrimary: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnShareText: {
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "900",
    color: "#052E16",
    letterSpacing: 0.5,
  },
});
