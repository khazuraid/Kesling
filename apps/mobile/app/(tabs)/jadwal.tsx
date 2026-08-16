import { Calendar, CalendarPlus, CheckCircle, ChevronRight, Clock, MapPin, Zap } from "@tamagui/lucide-icons-2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { FadeIn } from "../../src/components/motion/primitives";
import { getScopePuskesmasId } from "../../src/components/PuskesmasPicker";
import { api } from "../../src/lib/api";

const BULAN_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function Jadwal() {
  const qc = useQueryClient();
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [scopePkm, setScopePkm] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      getScopePuskesmasId().then(setScopePkm);
    }, []),
  );

  const { data, refetch } = useQuery({
    queryKey: ["rencana-bulanan", bulan, tahun, scopePkm],
    queryFn: () => api.rencanaBulanan(bulan, tahun, scopePkm),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateRencana(bulan, tahun),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["rencana-bulanan", bulan, tahun] });
      Alert.alert("Berhasil", `${r.count} sasaran dijadwalkan untuk ${BULAN_NAMES[bulan - 1]} ${tahun}.`);
    },
    onError: (e: any) => Alert.alert("Gagal", e.message || "Terjadi kesalahan."),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Build calendar grid: libur + terjadwal + selesai per date
  const calendar = (() => {
    if (!data) return null;
    const daysInMonth = new Date(tahun, bulan, 0).getDate();
    const firstDay = (new Date(tahun, bulan - 1, 1).getDay() + 6) % 7; // Monday=0
    const liburByDate = new Map<string, string>();
    for (const l of data.libur || []) liburByDate.set(l.tanggal, l.keterangan);

    const byDate = new Map<number, { selesai: number; terjadwal: number; nama: string }>();
    data.kategori?.forEach((kat: any) => {
      kat.subKategori?.sasaran?.forEach((s: any) => {
        if (!s.tanggalRencana) return;
        const d = new Date(s.tanggalRencana);
        if (d.getMonth() + 1 !== bulan) return;
        const day = d.getDate();
        const cur = byDate.get(day) || { selesai: 0, terjadwal: 0, nama: s.nama };
        if (s.sudahDiperiksa) cur.selesai++;
        else if (s.status === "TERJADWAL") cur.terjadwal++;
        if (!cur.nama) cur.nama = s.nama;
        byDate.set(day, cur);
      });
    });
    return { daysInMonth, firstDay, liburByDate, byDate };
  })();

  const pickBulan = () => {
    Alert.alert(
      "Pilih Bulan",
      "",
      BULAN_NAMES.map((name, i) => ({ text: name, onPress: () => setBulan(i + 1) })).concat([
        { text: "Batal", style: "cancel" } as any,
      ]),
    );
  };

  const confirmGenerate = () => {
    Alert.alert(
      "Jadwalkan Otomatis",
      `Buat jadwal pemeriksaan semua sasaran untuk ${BULAN_NAMES[bulan - 1]} ${tahun}?`,
      [
        { text: "Batal", style: "cancel" },
        { text: "Jadwalkan", onPress: () => generateMutation.mutate() },
      ],
    );
  };

  const selectedItems = selectedDate
    ? data?.kategori?.flatMap((kat: any) =>
        kat.subKategori?.sasaran
          ?.filter((s: any) => {
            if (!s.tanggalRencana) return false;
            const d = new Date(s.tanggalRencana);
            return d.getDate() === selectedDate && d.getMonth() + 1 === bulan;
          })
          .map((s: any) => ({ ...s, kategoriNama: kat.kategoriNama })),
      ) || []
    : [];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A876" />}
    >
      <FadeIn>
        <Text style={styles.pageTitle}>Jadwal</Text>
        <Text style={styles.pageSub}>Rencana pemeriksaan bulan ini</Text>
      </FadeIn>

      {/* Month picker */}
      <FadeIn delay={60}>
        <View style={styles.monthCard}>
          <View style={styles.monthIconWrap}>
            <Calendar size={20} color="#00A876" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>PERIODE</Text>
            <Text style={styles.monthText}>
              {BULAN_NAMES[bulan - 1]} {tahun}
            </Text>
          </View>
          <ChevronRight size={20} color="#8A8580" />
          <View style={{ width: 0 }} />
          <Text onPress={pickBulan} style={styles.changeBtn}>
            Ubah
          </Text>
        </View>
      </FadeIn>

      {/* Calendar */}
      <FadeIn delay={120}>
        <View style={styles.card}>
          {calendar ? (
            <>
              <View style={styles.weekRow}>
                {DAYS.map((d) => (
                  <Text key={d} style={styles.weekDay}>
                    {d}
                  </Text>
                ))}
              </View>
              <View style={styles.grid}>
                {Array.from({ length: calendar.firstDay }).map((_, i) => (
                  <View key={`e${i}`} style={styles.dayCell} />
                ))}
                {Array.from({ length: calendar.daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${tahun}-${String(bulan).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const libur = calendar.liburByDate.get(dateStr);
                  const item = calendar.byDate.get(day);
                  const isToday = day === now.getDate() && bulan === now.getMonth() + 1 && tahun === now.getFullYear();
                  const selected = selectedDate === day;
                  const dot = item?.selesai ? "#22C55E" : item?.terjadwal ? "#00A876" : libur ? "#EF4444" : null;
                  return (
                    <PressableDay
                      key={day}
                      day={day}
                      selected={selected}
                      isToday={isToday}
                      dot={dot}
                      onPress={() => setSelectedDate(selected ? null : day)}
                    />
                  );
                })}
              </View>
              {/* Legend */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: "#22C55E" }]} />
                  <Text style={styles.legendText}>Selesai</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: "#00A876" }]} />
                  <Text style={styles.legendText}>Terjadwal</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: "#EF4444" }]} />
                  <Text style={styles.legendText}>Libur</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.loadingText}>Memuat kalender...</Text>
          )}
        </View>
      </FadeIn>

      {/* Selected day list */}
      {selectedDate ? (
        <FadeIn delay={0}>
          <Text style={styles.sectionLabel}>
            {selectedDate} {BULAN_NAMES[bulan - 1]} — {selectedItems.length} sasaran
          </Text>
          <View style={styles.card}>
            {selectedItems.length === 0 ? (
              <Text style={styles.emptyText}>Tidak ada sasaran di tanggal ini.</Text>
            ) : (
              selectedItems.map((s: any, i: number) => (
                <View key={s.id} style={styles.listRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: s.sudahDiperiksa
                          ? "#EAF7EE"
                          : s.status === "TERJADWAL"
                            ? "#E6F6F0"
                            : "#F7F5F2",
                      },
                    ]}
                  >
                    {s.sudahDiperiksa ? (
                      <CheckCircle size={14} color="#22C55E" />
                    ) : s.status === "TERJADWAL" ? (
                      <Clock size={14} color="#00A876" />
                    ) : (
                      <MapPin size={14} color="#8A8580" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {s.nama} {s.prioritas === 1 ? "⚡" : ""}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {s.sudahDiperiksa ? "Sudah diperiksa" : s.kategoriNama}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#8A8580" />
                </View>
              ))
            )}
          </View>
        </FadeIn>
      ) : null}

      {/* Generate */}
      <FadeIn delay={180}>
        <Text style={styles.sectionLabel}>Semua Sasaran Bulan Ini</Text>
        <PressableGenerate onPress={confirmGenerate} pending={generateMutation.isPending} />
      </FadeIn>

      {/* Kategori list */}
      {data?.kategori?.map((kat: any, ki: number) => (
        <FadeIn key={kat.kategoriId} delay={200 + ki * 40}>
          <Text style={styles.sectionLabel}>{kat.kategoriNama}</Text>
          <View style={styles.card}>
            {kat.subKategori?.sasaran?.map((s: any, i: number) => (
              <View key={s.id} style={styles.listRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: s.sudahDiperiksa ? "#EAF7EE" : s.status === "TERJADWAL" ? "#E6F6F0" : "#F7F5F2",
                    },
                  ]}
                >
                  {s.sudahDiperiksa ? (
                    <CheckCircle size={14} color="#22C55E" />
                  ) : s.status === "TERJADWAL" ? (
                    <Clock size={14} color="#00A876" />
                  ) : (
                    <MapPin size={14} color="#8A8580" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {s.nama} {s.prioritas === 1 ? "⚡" : ""}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {s.sudahDiperiksa
                      ? "Sudah diperiksa"
                      : s.tanggalRencana
                        ? `Jadwal: ${new Date(s.tanggalRencana).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
                        : "Belum dijadwalkan"}
                  </Text>
                </View>
                <ChevronRight size={16} color="#8A8580" />
              </View>
            ))}
          </View>
        </FadeIn>
      ))}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

function PressableDay(props: {
  day: number;
  selected: boolean;
  isToday: boolean;
  dot: string | null;
  onPress: () => void;
}) {
  return <PressableCell {...props} />;
}

import { Pressable } from "react-native";

function PressableCell({
  day,
  selected,
  isToday,
  dot,
  onPress,
}: {
  day: number;
  selected: boolean;
  isToday: boolean;
  dot: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.dayCell, selected && { backgroundColor: "#E6F6F0", borderRadius: 12 }]}>
      <Text style={[styles.dayNum, isToday && { color: "#00A876", fontWeight: "800" }]}>{day}</Text>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : <View style={{ height: 6 }} />}
    </Pressable>
  );
}

function PressableGenerate({ onPress, pending }: { onPress: () => void; pending: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={pending}
      style={({ pressed }) => [styles.generateBtn, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}
    >
      <CalendarPlus size={18} color="#FFFFFF" />
      <Text style={styles.generateLabel}>{pending ? "Menjadwalkan..." : "Jadwalkan Otomatis"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F5F2" },
  content: { paddingTop: 64, paddingHorizontal: 16 },
  pageTitle: { fontSize: 28, fontWeight: "800", color: "#1F1D1B" },
  pageSub: { fontSize: 14, color: "#8A8580", marginTop: 2 },
  monthCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  monthIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E6F6F0",
    alignItems: "center",
    justifyContent: "center",
  },
  overline: { fontSize: 10, fontWeight: "700", color: "#8A8580", letterSpacing: 0.5 },
  monthText: { fontSize: 18, fontWeight: "700", color: "#1F1D1B" },
  changeBtn: { color: "#00A876", fontSize: 14, fontWeight: "700" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 16,
    marginBottom: 12,
  },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekDay: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: "#8A8580" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  dayNum: { fontSize: 14, fontWeight: "500", color: "#1F1D1B" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ECE7E1",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { fontSize: 11, color: "#8A8580" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A8580",
    letterSpacing: 0.5,
    marginVertical: 8,
    marginLeft: 4,
  },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  statusDot: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15, fontWeight: "500", color: "#1F1D1B" },
  rowSub: { fontSize: 12, color: "#8A8580", marginTop: 1 },
  emptyText: { fontSize: 14, color: "#8A8580", textAlign: "center", paddingVertical: 16 },
  loadingText: { fontSize: 14, color: "#8A8580", textAlign: "center", paddingVertical: 24 },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#00A876",
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  generateLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
