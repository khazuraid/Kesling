import { Activity, AlertTriangle, ChevronLeft, ChevronRight } from "@tamagui/lucide-icons-2";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient as ExpoGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { FadeIn, useCountUp } from "../../src/components/motion/primitives";
import { ProgressRing } from "../../src/components/motion/Ring";
import { getScopePuskesmasId } from "../../src/components/PuskesmasPicker";
import { api } from "../../src/lib/api";
import { C } from "../../src/lib/tokens";

const COLOR_BY_PCT = (pct: number) => (pct >= 80 ? "#34D399" : pct >= 60 ? "#FBBF24" : "#F87171");
type Seg = "ringkasan" | "kategori" | "tren";

function PctText({ pct, size = 18 }: { pct: number; size?: number }) {
  const v = useCountUp(pct);
  return <Text style={[s.pctText, { color: COLOR_BY_PCT(pct), fontSize: size }]}>{v}%</Text>;
}

// line chart + area gradient (referensi LinePath)
function LineChart({ data, w, h }: { data: number[]; w: number; h: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data) - 5;
  const max = Math.max(...data) + 5;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * h;
    return [x, y] as [number, number];
  });
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${d} L${w},${h} L0,${h} Z`;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.chartL} stopOpacity="0.35" />
          <Stop offset="1" stopColor={C.chartL} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#lg)" />
      <Path d={d} fill="none" stroke={C.chartL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <Circle
          key={i}
          cx={x}
          cy={y}
          r={i === pts.length - 1 ? 5 : 3}
          fill={i === pts.length - 1 ? C.chartL : "rgba(96,165,250,0.5)"}
          stroke="#fff"
          strokeWidth={i === pts.length - 1 ? 2 : 1}
        />
      ))}
    </Svg>
  );
}

export default function Rekap() {
  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [seg, setSeg] = useState<Seg>("ringkasan");
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

  const cats = (data?.categories || []) as Array<{
    id: number;
    nama: string;
    icon: string;
    pctMonthly: number[];
    pctTahunan: number;
  }>;
  const nBaik = cats.filter((c) => c.pctTahunan >= 80).length;
  const nPerhatian = cats.filter((c) => c.pctTahunan >= 60 && c.pctTahunan < 80).length;
  const kritis = cats.filter((c) => c.pctTahunan < 60);
  const overall = Math.round(data?.overallPct ?? 0);

  // tren: rata-rata antar kategori per bulan (6 bulan terakhir)
  const bulanLabels = (data?.bulanLabels || []) as string[];
  const monthlyAvg = bulanLabels.map((_, mi) => {
    const vals = cats.map((c) => c.pctMonthly?.[mi]).filter((v) => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  });
  const last6 = monthlyAvg.slice(-6);
  const last6Labels = bulanLabels.slice(-6);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D9F99D" />}
    >
      {/* Hero — gelap, match periksa/drafts/sasaran */}
      <FadeIn>
        <View style={s.hero}>
          <ExpoGradient
            colors={["#0C1B16", "#123527"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1.1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.heroBlob} />
          <View style={s.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroOverline}>LAPORAN KINERJA</Text>
              <Text style={s.heroTitle}>Rekap Pemeriksaan</Text>
            </View>
            <View style={s.yearStepper}>
              <Pressable onPress={() => setTahun((y) => y - 1)} hitSlop={8} style={s.yearBtn}>
                <ChevronLeft size={16} color="rgba(255,255,255,0.7)" />
              </Pressable>
              <Text style={s.yearText}>{tahun}</Text>
              <Pressable onPress={() => setTahun((y) => y + 1)} hitSlop={8} style={s.yearBtn}>
                <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>
          </View>
          <View style={s.heroChipRow}>
            <View style={s.heroChip}>
              <Activity size={11} color="#D9F99D" strokeWidth={2.2} />
              <Text style={s.heroChipText}>{cats.length} kategori dipantau</Text>
            </View>
            <View style={s.heroChip}>
              <Text style={s.heroChipText}>Capaian {overall}%</Text>
            </View>
          </View>
        </View>
      </FadeIn>

      {/* Sheet menyelip hero */}
      <View style={s.sheet}>
        {/* Segmented tabs */}
        <View style={s.segBar}>
          <View style={s.segBarInner}>
            {(
              [
                ["ringkasan", "Ringkasan"],
                ["kategori", "Per Kategori"],
                ["tren", "Tren"],
              ] as const
            ).map(([id, label]) => (
              <Pressable key={id} onPress={() => setSeg(id)} style={[s.segBtn, seg === id && s.segBtnActive]}>
                <Text style={[s.segText, seg === id && s.segTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {isLoading ? (
          <Text style={s.loadingText}>Memuat rekap...</Text>
        ) : error ? (
          <View style={s.card}>
            <Text style={s.emptyText}>Gagal memuat. Tarik ke bawah untuk coba lagi.</Text>
          </View>
        ) : data ? (
          <>
            {seg === "ringkasan" && (
              <View>
                {/* Score card — blob dekoratif */}
                <FadeIn>
                  <View style={s.scoreCard}>
                    <View style={s.scoreBlob} />
                    <Text style={s.scoreOverline}>Capaian Keseluruhan {tahun}</Text>
                    <View style={s.scoreRow}>
                      <View style={s.scoreRingWrap}>
                        <View style={{ width: 120, height: 120 }}>
                          <ProgressRing
                            size={120}
                            strokeWidth={10}
                            progress={data.overallPct}
                            color={COLOR_BY_PCT(data.overallPct)}
                          />
                        </View>
                        <View style={s.scoreRingCenter}>
                          <ScoreNum pct={data.overallPct} />
                          <Text style={s.scoreDenom}>/ 100</Text>
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.scoreLabel, { color: COLOR_BY_PCT(data.overallPct) }]}>
                          {data.overallLabel}
                        </Text>
                        <Text style={s.scoreDesc}>
                          {cats.length} kategori dipantau tahun {tahun}.
                        </Text>
                        <View style={s.miniStats}>
                          <View
                            style={[
                              s.miniStat,
                              { backgroundColor: "rgba(22,163,74,0.12)", borderColor: "rgba(22,163,74,0.2)" },
                            ]}
                          >
                            <Text style={[s.miniVal, { color: "#34D399" }]}>{nBaik}</Text>
                            <Text style={s.miniLbl}>Baik</Text>
                          </View>
                          <View
                            style={[
                              s.miniStat,
                              { backgroundColor: "rgba(217,119,6,0.1)", borderColor: "rgba(217,119,6,0.15)" },
                            ]}
                          >
                            <Text style={[s.miniVal, { color: "#FBBF24" }]}>{nPerhatian}</Text>
                            <Text style={s.miniLbl}>Perhatian</Text>
                          </View>
                          <View
                            style={[
                              s.miniStat,
                              { backgroundColor: "rgba(220,38,38,0.1)", borderColor: "rgba(220,38,38,0.15)" },
                            ]}
                          >
                            <Text style={[s.miniVal, { color: "#F87171" }]}>{kritis.length}</Text>
                            <Text style={s.miniLbl}>Kritis</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </FadeIn>

                {/* Skor per kategori — chip ikon */}
                <FadeIn delay={60}>
                  <View style={s.card}>
                    <Text style={s.cardOverline}>Skor Per Kategori</Text>
                    {cats.map((cat, i) => {
                      const col = COLOR_BY_PCT(cat.pctTahunan);
                      return (
                        <View key={cat.id} style={[s.katRow, i < cats.length - 1 && s.katRowGap]}>
                          <View style={[s.katChip, { backgroundColor: `${col}20` }]}>
                            <Activity size={13} color={col} strokeWidth={1.8} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={s.katRowHead}>
                              <Text style={s.katName}>{cat.nama}</Text>
                              <PctText pct={cat.pctTahunan} size={12} />
                            </View>
                            <View style={s.katTrack}>
                              <View
                                style={{
                                  height: "100%",
                                  width: `${cat.pctTahunan}%`,
                                  backgroundColor: col,
                                  borderRadius: 999,
                                  opacity: 0.85,
                                }}
                              />
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </FadeIn>

                {/* Alert kritis */}
                {kritis.length ? (
                  <FadeIn delay={100}>
                    <View style={s.alertCard}>
                      <View style={s.alertIcon}>
                        <AlertTriangle size={15} color={C.err} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.alertTitle}>{kritis.length} Kategori Kritis</Text>
                        <Text style={s.alertSub}>
                          {kritis.map((c) => `${c.nama} (${Math.round(c.pctTahunan)}%)`).join(", ")} perlu perhatian
                          segera.
                        </Text>
                      </View>
                    </View>
                  </FadeIn>
                ) : null}
              </View>
            )}

            {seg === "kategori" &&
              cats.map((cat, ci) => {
                const col = COLOR_BY_PCT(cat.pctTahunan);
                const monthly = cat.pctMonthly || [];
                const lulus = monthly.filter((p) => p >= 80).length;
                const kris = monthly.filter((p) => p < 60).length;
                const perhatian = monthly.length - lulus - kris;
                return (
                  <FadeIn key={cat.id} delay={ci * 55}>
                    <View style={s.katCard}>
                      <View style={[s.katCardBar, { backgroundColor: col }]} />
                      <View style={s.katCardBody}>
                        <View style={s.katHeader}>
                          <View style={[s.katIcon, { backgroundColor: `${col}20` }]}>
                            <Activity size={19} color={col} strokeWidth={1.7} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.katTitle} numberOfLines={1}>
                              {cat.nama}
                            </Text>
                            <Text style={s.katSub}>{monthly.length} bulan terpantau</Text>
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <PctText pct={cat.pctTahunan} size={26} />
                            <Text style={s.katPctLbl}>skor</Text>
                          </View>
                        </View>

                        {/* Stacked bar */}
                        <View style={s.stackBar}>
                          {lulus > 0 ? (
                            <View style={[s.stackSeg, { flex: lulus, backgroundColor: "#34D399" }]} />
                          ) : null}
                          {perhatian > 0 ? (
                            <View style={[s.stackSeg, { flex: perhatian, backgroundColor: "#FBBF24" }]} />
                          ) : null}
                          {kris > 0 ? <View style={[s.stackSeg, { flex: kris, backgroundColor: "#F87171" }]} /> : null}
                        </View>

                        {/* Stat row */}
                        <View style={s.stackStats}>
                          {[
                            { label: "Lulus", val: lulus, color: "#34D399", bg: "rgba(22,163,74,0.1)" },
                            { label: "Perhatian", val: perhatian, color: "#FBBF24", bg: "rgba(217,119,6,0.08)" },
                            { label: "Kritis", val: kris, color: "#F87171", bg: "rgba(220,38,38,0.1)" },
                          ].map((st) => (
                            <View key={st.label} style={[s.stackStat, { backgroundColor: st.bg }]}>
                              <Text style={[s.stackStatVal, { color: st.color }]}>{st.val}</Text>
                              <Text style={s.miniLbl}>{st.label}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  </FadeIn>
                );
              })}

            {seg === "tren" && (
              <View>
                {/* Line chart card */}
                <FadeIn>
                  <View style={s.card}>
                    <View style={s.trenHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardOverline}>Tren Skor Bulanan</Text>
                        <Text style={s.trenTitle}>{last6.length} Bulan Terakhir</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={s.trenBig}>{overall}%</Text>
                        <Text style={s.trenBigSub}>
                          {last6Labels[last6.length - 1] ?? ""} {tahun}
                        </Text>
                      </View>
                    </View>
                    <View style={{ paddingBottom: 8, alignItems: "center" }}>
                      <LineChart data={last6} w={295} h={80} />
                    </View>
                    <View style={s.trendLabels}>
                      {last6Labels.map((b, i) => (
                        <Text
                          key={i}
                          style={[s.barLabel, i === last6Labels.length - 1 && { color: C.chartL, fontWeight: "700" }]}
                        >
                          {b}
                        </Text>
                      ))}
                    </View>
                  </View>
                </FadeIn>

                {/* Kartu detail bulanan — terkini di-highlight */}
                {[...last6].reverse().map((v, i) => {
                  const isLatest = i === 0;
                  const label = last6Labels[last6.length - 1 - i] ?? "";
                  const col = v >= 80 ? "#34D399" : v >= 60 ? "#FBBF24" : "#F87171";
                  return (
                    <FadeIn key={`${label}-${i}`} delay={i * 40}>
                      <View
                        style={[
                          s.monthCard,
                          isLatest && {
                            backgroundColor: "rgba(96,165,250,0.08)",
                            borderColor: "rgba(96,165,250,0.25)",
                          },
                        ]}
                      >
                        <View
                          style={[
                            s.monthIcon,
                            { backgroundColor: isLatest ? "rgba(96,165,250,0.15)" : "rgba(0,0,0,0.04)" },
                          ]}
                        >
                          <Text style={[s.monthIconText, { color: isLatest ? C.chartL : C.muted }]}>{label}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={s.monthRowHead}>
                            <Text
                              style={[
                                s.monthName,
                                { color: isLatest ? C.ink : C.ink2, fontWeight: isLatest ? "700" : "600" },
                              ]}
                            >
                              {label} {tahun}
                            </Text>
                            {isLatest ? (
                              <View style={s.latestPill}>
                                <Text style={s.latestPillText}>Terkini</Text>
                              </View>
                            ) : null}
                          </View>
                          <View style={s.katTrack}>
                            <View style={{ height: "100%", width: `${v}%`, backgroundColor: col, borderRadius: 999 }} />
                          </View>
                        </View>
                        <Text style={[s.monthVal, { color: col }]}>{v}%</Text>
                      </View>
                    </FadeIn>
                  );
                })}
              </View>
            )}
          </>
        ) : null}
      </View>
      <View style={{ height: 130 }} />
    </ScrollView>
  );
}

function ScoreNum({ pct }: { pct: number }) {
  const v = useCountUp(pct);
  return <Text style={[s.scoreNum, { color: COLOR_BY_PCT(pct) }]}>{v}</Text>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgForm },
  content: { paddingBottom: 130 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 28 : 60,
    paddingBottom: 24,
    overflow: "hidden",
  },
  heroBlob: {
    position: "absolute",
    top: -80,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#00A876",
    opacity: 0.14,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroOverline: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  heroTitle: { fontSize: 27, fontWeight: "900", color: "#fff", letterSpacing: -0.7, lineHeight: 32 },
  heroChipRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: "rgba(190,242,100,0.16)",
    borderWidth: 1,
    borderColor: "rgba(190,242,100,0.32)",
  },
  heroChipText: { fontSize: 11, fontWeight: "800", color: "#D9F99D", letterSpacing: 0.2 },
  yearStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  yearBtn: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  yearText: { fontSize: 13, fontWeight: "800", color: "#fff", minWidth: 40, textAlign: "center" },
  sheet: { paddingTop: 16 },
  segBar: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  segBarInner: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  segBtnActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
    shadowColor: C.accent,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  segText: { fontSize: 12, fontWeight: "700", color: C.muted },
  segTextActive: { color: "#fff" },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  scoreCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    padding: 20,
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  scoreBlob: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(96,165,250,0.08)",
  },
  scoreOverline: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: C.muted,
    textTransform: "uppercase",
    marginBottom: 20,
  },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  scoreRingWrap: { position: "relative", width: 120, height: 120 },
  scoreRingCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNum: { fontSize: 26, fontWeight: "900", lineHeight: 31, fontVariant: ["tabular-nums"] },
  scoreDenom: { fontSize: 10, color: C.muted, marginTop: 2 },
  scoreLabel: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  scoreDesc: { fontSize: 12, color: C.ink2, lineHeight: 19, marginBottom: 16 },
  miniStats: { flexDirection: "row", gap: 6 },
  miniStat: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: "center", borderWidth: 1 },
  miniVal: { fontSize: 17, fontWeight: "900", fontVariant: ["tabular-nums"] },
  miniLbl: { fontSize: 9, color: C.muted, marginTop: 2 },
  cardOverline: {
    fontSize: 11,
    fontWeight: "700",
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  katRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  katRowGap: { marginBottom: 14 },
  katChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  katRowHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  katName: { fontSize: 12, fontWeight: "600", color: C.ink2, flexShrink: 1 },
  katTrack: { height: 5, backgroundColor: "rgba(0,0,0,0.07)", borderRadius: 999, overflow: "hidden" },
  pctText: { fontWeight: "800" },
  // kategori card
  katCard: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    overflow: "hidden",
    marginBottom: 10,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  katCardBar: { width: 4 },
  katCardBody: { flex: 1, padding: 16 },
  katHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  katIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  katTitle: { fontSize: 15, fontWeight: "800", color: C.ink, letterSpacing: -0.3 },
  katSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  katPctLbl: { fontSize: 10, color: C.muted, marginTop: 2 },
  stackBar: { flexDirection: "row", height: 10, borderRadius: 999, overflow: "hidden", gap: 2, marginBottom: 10 },
  stackSeg: {},
  stackStats: { flexDirection: "row", gap: 6 },
  stackStat: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  stackStatVal: { fontSize: 16, fontWeight: "900" },
  // alert
  alertCard: {
    flexDirection: "row",
    backgroundColor: "rgba(220,38,38,0.08)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.2)",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginHorizontal: 16,
    marginTop: 4,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(220,38,38,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: { fontSize: 13, fontWeight: "800", color: C.err, marginBottom: 3 },
  alertSub: { fontSize: 11, color: C.ink2, lineHeight: 16 },
  // tren
  trenHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  trenTitle: { fontSize: 20, fontWeight: "900", color: C.ink, marginTop: 4, letterSpacing: -0.4 },
  trenBig: { fontSize: 28, fontWeight: "900", color: C.chartL },
  trenBigSub: { fontSize: 10, color: C.muted },
  trendLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  barLabel: { fontSize: 10, color: C.muted },
  monthCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    padding: 14,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  monthIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  monthIconText: { fontSize: 11, fontWeight: "800" },
  monthRowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  monthName: { fontSize: 13 },
  latestPill: { backgroundColor: "rgba(96,165,250,0.15)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  latestPillText: { fontSize: 10, fontWeight: "700", color: C.chartL },
  monthVal: { fontSize: 18, fontWeight: "900", minWidth: 42, textAlign: "right" },
  loadingText: { fontSize: 14, color: C.muted, textAlign: "center", marginTop: 40 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: "center", paddingVertical: 16 },
});
