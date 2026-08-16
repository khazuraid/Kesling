import { CalendarDays, ChevronRight, ClipboardCheck, Zap } from "@tamagui/lucide-icons-2";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { FadeIn, ScalePress, useCountUp } from "../../src/components/motion/primitives";
import { ProgressRing } from "../../src/components/motion/Ring";
import { ProfileSheet } from "../../src/components/ProfileSheet";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { getDrafts } from "../../src/lib/drafts";

const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS_ID = [
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const v = useCountUp(value);
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{v}</Text>
    </View>
  );
}

export default function HariIni() {
  const router = useRouter();
  const { user } = useAuth();
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();
  const today = now.toISOString().slice(0, 10);
  const [refreshing, setRefreshing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [draftCount, setDraftCount] = useState(0);

  useFocusEffect(() => {
    getDrafts().then((d) => setDraftCount(d.length));
  });

  const { data: dash, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { data: notifData } = useQuery({ queryKey: ["notifications"], queryFn: () => api.notifications() });
  const { data: rencana } = useQuery({
    queryKey: ["rencana-bulanan", bulan, tahun],
    queryFn: () => api.rencanaBulanan(bulan, tahun),
  });

  // Agenda hari ini: sasaran dengan tanggalRencana == today
  const agenda = useMemo(() => {
    if (!rencana) return [];
    const list: Array<{
      id: number;
      nama: string;
      kategori: string;
      alamat: string | null;
      sudahDiperiksa: boolean;
      prioritas: number;
    }> = [];
    rencana.kategori?.forEach((kat) => {
      kat.subKategori?.sasaran?.forEach((s) => {
        if (s.tanggalRencana && new Date(s.tanggalRencana).toISOString().slice(0, 10) === today) {
          list.push({
            id: s.id,
            nama: s.nama,
            kategori: kat.kategoriNama,
            alamat: s.alamat,
            sudahDiperiksa: s.sudahDiperiksa,
            prioritas: s.prioritas,
          });
        }
      });
    });
    return list;
  }, [rencana]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const hour = now.getHours();
  const greeting =
    hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A876" />}
      >
        {/* Header: greeting + avatar */}
        <FadeIn>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.userName}>{user?.name || "Petugas"}</Text>
              <Text style={styles.dateText}>
                {DAYS_ID[now.getDay()]}, {now.getDate()} {MONTHS_ID[now.getMonth()]} {now.getFullYear()}
              </Text>
            </View>
            <Pressable onPress={() => setProfileOpen(true)} hitSlop={8}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(user?.name || "P")[0].toUpperCase()}</Text>
              </View>
            </Pressable>
          </View>
        </FadeIn>

        {/* Offline banner */}
        {draftCount > 0 ? (
          <Pressable onPress={() => router.push("/drafts")} style={styles.offlineBanner}>
            <Text style={styles.offlineText}>{draftCount} draft belum disinkronkan</Text>
          </Pressable>
        ) : null}

        {/* Ring progress */}
        <FadeIn delay={60}>
          <View style={[styles.card, { alignItems: "center", paddingVertical: 20 }]}>
            <ProgressRing
              size={140}
              strokeWidth={12}
              progress={rencana?.progress ?? 0}
              label="%"
              sublabel={`${rencana?.totalSelesai ?? 0}/${rencana?.totalSasaran ?? 0} sasaran bulan ini`}
              color="#00A876"
            />
          </View>
        </FadeIn>

        {/* Agenda hari ini */}
        <FadeIn delay={120}>
          <Text style={styles.sectionLabel}>AGENDA HARI INI · {agenda.length}</Text>
        </FadeIn>
        {agenda.length === 0 ? (
          <FadeIn delay={160}>
            <View style={styles.card}>
              <Text style={styles.emptyText}>Tidak ada agenda hari ini. 🎉</Text>
              <Pressable onPress={() => router.push("/(tabs)/jadwal")}>
                <Text style={styles.linkText}>Buka Jadwal →</Text>
              </Pressable>
            </View>
          </FadeIn>
        ) : (
          agenda.map((s, i) => (
            <FadeIn key={s.id} delay={160 + i * 40}>
              <ScalePress onPress={() => router.push(`/sasaran/${s.id}` as any)}>
                <View style={styles.agendaCard}>
                  <View
                    style={[
                      styles.agendaDot,
                      { backgroundColor: s.sudahDiperiksa ? "#EAF7EE" : s.prioritas === 1 ? "#FEF4E2" : "#E6F6F0" },
                    ]}
                  >
                    {s.sudahDiperiksa ? (
                      <ClipboardCheck size={16} color="#22C55E" />
                    ) : (
                      <Zap size={16} color={s.prioritas === 1 ? "#F59E0B" : "#00A876"} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.agendaTitle} numberOfLines={1}>
                      {s.nama}
                    </Text>
                    <Text style={styles.agendaSub} numberOfLines={1}>
                      {s.kategori} · {s.alamat || "Tanpa alamat"}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#8A8580" />
                </View>
              </ScalePress>
            </FadeIn>
          ))
        )}

        {/* Libur mendatang */}
        {notifData?.liburMendatang?.length ? (
          <FadeIn delay={200}>
            <Text style={styles.sectionLabel}>HARI LIBUR</Text>
            {notifData.liburMendatang.map((l) => (
              <Pressable
                key={l.tanggal}
                onPress={() => router.push("/notifications")}
                style={({ pressed }) => [
                  styles.liburCard,
                  l.sumber === "custom" ? styles.liburCustom : styles.liburNasional,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={[styles.liburIcon, { backgroundColor: l.sumber === "custom" ? "#00A876" : "#EF4444" }]}>
                  <CalendarDays size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.liburKet, { color: l.sumber === "custom" ? "#00A876" : "#EF4444" }]}>
                    {l.keterangan}
                  </Text>
                  <Text style={styles.liburHari}>{l.hari}</Text>
                </View>
              </Pressable>
            ))}
          </FadeIn>
        ) : null}

        {/* Stats */}
        <FadeIn delay={240}>
          <Text style={styles.sectionLabel}>STATISTIK</Text>
          <View style={styles.statRow}>
            <StatCard label="PEMERIKSAAN" value={dash?.userInspectionsCount ?? 0} color="#00A876" />
            <StatCard label="SASARAN" value={dash?.sasaranCount ?? 0} color="#22C55E" />
          </View>
        </FadeIn>

        {/* Recent */}
        <FadeIn delay={300}>
          <Text style={styles.sectionLabel}>TERBARU</Text>
        </FadeIn>
        {dash?.recentInspections?.length ? (
          <View style={styles.card}>
            {dash.recentInspections.map((ins) => (
              <Pressable
                key={ins.id}
                onPress={() => router.push(`/inspection/result/${ins.id}`)}
                style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.6 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {ins.namaSasaran}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {ins.templateName} ·{" "}
                    {new Date(ins.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </Text>
                </View>
                <ChevronRight size={16} color="#8A8580" />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyText}>Belum ada pemeriksaan.</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F5F2" },
  content: { paddingTop: 64, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  greeting: { fontSize: 14, color: "#8A8580" },
  userName: { fontSize: 24, fontWeight: "800", color: "#1F1D1B" },
  dateText: { fontSize: 13, color: "#8A8580", marginTop: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00A876",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  offlineBanner: {
    backgroundColor: "#FEF4E2",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  offlineText: { color: "#F59E0B", fontSize: 13, fontWeight: "600" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8A8580",
    letterSpacing: 1,
    marginVertical: 8,
    marginLeft: 4,
  },
  agendaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECE7E1",
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
  },
  agendaDot: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  agendaTitle: { fontSize: 15, fontWeight: "600", color: "#1F1D1B" },
  agendaSub: { fontSize: 12, color: "#8A8580", marginTop: 1 },
  emptyText: { fontSize: 14, color: "#8A8580", textAlign: "center", paddingVertical: 12 },
  linkText: { fontSize: 14, color: "#00A876", fontWeight: "700", textAlign: "center", paddingBottom: 8 },
  liburCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  liburCustom: { backgroundColor: "#E6F6F0", borderColor: "#00A876" },
  liburNasional: { backgroundColor: "#FEECEB", borderColor: "#EF4444" },
  liburIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  liburKet: { fontSize: 14, fontWeight: "700" },
  liburHari: { fontSize: 12, color: "#8A8580", marginTop: 1 },
  statRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECE7E1",
    borderRadius: 18,
    padding: 16,
  },
  statLabel: { fontSize: 10, fontWeight: "800", color: "#8A8580", letterSpacing: 0.5 },
  statValue: { fontSize: 32, fontWeight: "800", marginTop: 4 },
  listRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 8 },
  rowTitle: { fontSize: 15, fontWeight: "500", color: "#1F1D1B" },
  rowSub: { fontSize: 12, color: "#8A8580", marginTop: 1 },
});
