import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { GaugeChart } from "../../src/components/motion/GaugeChart";
import { FadeIn, useCountUp } from "../../src/components/motion/primitives";
import { getScopePuskesmasId } from "../../src/components/PuskesmasPicker";
import { api } from "../../src/lib/api";

const COLOR_BY_PCT = (pct: number) => (pct >= 80 ? "#22C55E" : pct >= 60 ? "#F59E0B" : "#EF4444");

function PctText({ pct }: { pct: number }) {
  const v = useCountUp(pct);
  return <Text style={[styles.pctText, { color: COLOR_BY_PCT(pct) }]}>{v}%</Text>;
}

export default function Rekap() {
  const now = new Date();
  const [tahun] = useState(now.getFullYear());
  const [refreshing, setRefreshing] = useState(false);
  const [scopePkm, setScopePkm] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      getScopePuskesmasId().then(setScopePkm);
    }, []),
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["rekap", tahun, scopePkm],
    queryFn: () => api.rekap(tahun, scopePkm ?? undefined),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A876" />}
    >
      <FadeIn>
        <Text style={styles.pageTitle}>Rekap</Text>
        <Text style={styles.pageSub}>Capaian pemeriksaan {tahun}</Text>
      </FadeIn>

      {isLoading ? (
        <Text style={styles.loadingText}>Memuat rekap...</Text>
      ) : error ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>Gagal memuat. Tarik ke bawah untuk coba lagi.</Text>
        </View>
      ) : data ? (
        <View>
          <FadeIn delay={60}>
            <View style={[styles.card, styles.centerCard]}>
              <GaugeChart value={data.overallPct} size={200} strokeWidth={16} label={data.overallLabel} />
            </View>
          </FadeIn>

          {data.categories.map((cat: any, ci: number) => (
            <FadeIn key={cat.id} delay={120 + ci * 60}>
              <View>
                <Text style={styles.sectionLabel}>{cat.nama}</Text>
                <View style={styles.card}>
                  <View style={styles.katHeader}>
                    <Text style={styles.katTitle}>Tahunan</Text>
                    <PctText pct={cat.pctTahunan} />
                  </View>
                  <Text style={styles.overlineSmall}>BULANAN</Text>
                  <View style={styles.barsRow}>
                    {cat.pctMonthly.map((pct: number, i: number) => (
                      <View key={i} style={styles.barCol}>
                        <View style={styles.barTrack}>
                          <View
                            style={{
                              height: `${Math.max(pct, 2)}%`,
                              backgroundColor: COLOR_BY_PCT(pct),
                              borderRadius: 3,
                            }}
                          />
                        </View>
                        <Text style={styles.barLabel}>{data.bulanLabels[i]}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.triwulanRow}>
                    {cat.triwulan.map((pct: number, i: number) => (
                      <View key={i} style={{ flex: 1 }}>
                        <Text style={styles.barLabel}>{data.triwulanLabels[i]}</Text>
                        <PctText pct={pct} />
                      </View>
                    ))}
                  </View>
                  <View style={styles.triwulanRow}>
                    {cat.semester.map((pct: number, i: number) => (
                      <View key={i} style={{ flex: 1 }}>
                        <Text style={styles.barLabel}>{data.semesterLabels[i]}</Text>
                        <PctText pct={pct} />
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </FadeIn>
          ))}
        </View>
      ) : null}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F5F2" },
  content: { paddingTop: 64, paddingHorizontal: 16 },
  pageTitle: { fontSize: 28, fontWeight: "800", color: "#1F1D1B" },
  pageSub: { fontSize: 14, color: "#8A8580", marginTop: 2 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 16,
    marginBottom: 12,
  },
  centerCard: { alignItems: "center", paddingVertical: 24 },
  overallLabel: { fontSize: 14, color: "#8A8580", marginTop: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A8580",
    letterSpacing: 0.5,
    marginVertical: 8,
    marginLeft: 4,
  },
  katHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  katTitle: { fontSize: 16, fontWeight: "700", color: "#1F1D1B" },
  pctText: { fontSize: 18, fontWeight: "800" },
  overlineSmall: { fontSize: 10, fontWeight: "700", color: "#8A8580", letterSpacing: 0.5, marginBottom: 8 },
  barsRow: { flexDirection: "row", gap: 4, marginBottom: 12 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barTrack: {
    width: "100%",
    height: 40,
    backgroundColor: "#F7F5F2",
    borderRadius: 3,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barLabel: { fontSize: 9, color: "#8A8580" },
  triwulanRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ECE7E1",
  },
  loadingText: { fontSize: 14, color: "#8A8580", textAlign: "center", marginTop: 40 },
  emptyText: { fontSize: 14, color: "#8A8580", textAlign: "center", paddingVertical: 16 },
});
