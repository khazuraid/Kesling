import { ArrowLeft, Bell, CalendarDays, CheckCheck, Clock, FileWarning } from "@tamagui/lucide-icons-2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { FadeIn, ScalePress } from "../src/components/motion/primitives";
import { api } from "../src/lib/api";
import { C } from "../src/lib/tokens";

const BG = C.bg;

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  return `${day} hari lalu`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications(),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.markNotifRead(undefined, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOneMutation = useMutation({
    mutationFn: (id: number) => api.markNotifRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
    >
      {/* Hero */}
      <FadeIn>
        <View style={s.hero}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
            <ArrowLeft size={14} color={C.ink} />
            <Text style={s.backText}>Kembali</Text>
          </Pressable>
          <View style={s.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroOverline}>Pengingat</Text>
              <Text style={s.heroTitle}>Notifikasi</Text>
              <Text style={s.heroSub}>
                {data ? `${data.unreadCount} belum dibaca` : "Pengingat & informasi puskesmas"}
              </Text>
            </View>
            <View style={s.heroIcon}>
              <Bell size={26} color={C.accent} strokeWidth={1.6} />
            </View>
          </View>
          {data && data.unreadCount > 0 ? (
            <Pressable style={s.readAllBtn} onPress={() => markAllMutation.mutate()}>
              <CheckCheck size={15} color={C.accent} strokeWidth={2.2} />
              <Text style={s.readAllText}>Tandai semua dibaca ({data.unreadCount})</Text>
            </Pressable>
          ) : null}
        </View>
      </FadeIn>

      {/* Hari libur mendatang */}
      {data && data.liburMendatang.length > 0 ? (
        <FadeIn delay={60}>
          <View style={s.section}>
            <Text style={s.sectionLabel}>HARI LIBUR MENDATANG</Text>
            {data.liburMendatang.map((l) => (
              <View
                key={l.tanggal}
                style={[s.alertCard, { backgroundColor: l.sumber === "custom" ? C.accentSoft : "#FEF2F2" }]}
              >
                <View style={[s.alertIcon, { backgroundColor: l.sumber === "custom" ? C.accent : C.err }]}>
                  <CalendarDays size={20} color="#fff" strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.alertTag, { color: l.sumber === "custom" ? C.accent : C.err }]}>HARI LIBUR</Text>
                  <Text style={s.alertTitle}>{l.keterangan}</Text>
                  <Text style={s.alertSub}>{l.hari}</Text>
                </View>
              </View>
            ))}
          </View>
        </FadeIn>
      ) : null}

      {/* Deadline rencana ≤3 hari */}
      {data?.deadlineRencana?.length ? (
        <FadeIn delay={80}>
          <View style={s.section}>
            <Text style={s.sectionLabel}>DEADLINE PEMERIKSAAN</Text>
            {data.deadlineRencana.map((r) => (
              <View key={r.id} style={[s.alertCard, { backgroundColor: "rgba(217,119,6,0.12)" }]}>
                <View style={[s.alertIcon, { backgroundColor: C.warn }]}>
                  <Clock size={20} color="#fff" strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.alertTag, { color: C.warn }]}>BATAS WAKTU</Text>
                  <Text style={s.alertTitle}>{r.sasaranNama}</Text>
                  <Text style={s.alertSub}>
                    {new Date(`${r.tanggal}T00:00:00`).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </FadeIn>
      ) : null}

      {/* Deadline laporan bulanan */}
      {data?.deadlineLaporan?.length ? (
        <FadeIn delay={100}>
          <View style={s.section}>
            <Text style={s.sectionLabel}>DEADLINE LAPORAN</Text>
            {data.deadlineLaporan.map((l) => (
              <View key={l.categoryId} style={[s.alertCard, { backgroundColor: "#FEF2F2" }]}>
                <View style={[s.alertIcon, { backgroundColor: C.err }]}>
                  <FileWarning size={20} color="#fff" strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.alertTag, { color: C.err }]}>LAPORAN BELUM DIBUAT</Text>
                  <Text style={s.alertTitle}>{l.nama}</Text>
                  <Text style={s.alertSub}>
                    Bulan {l.bulan}/{l.tahun} · Deadline tanggal 10
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </FadeIn>
      ) : null}

      {/* Notifikasi list */}
      {isLoading ? (
        <Text style={s.loadingText}>Memuat notifikasi...</Text>
      ) : data && data.notifications.length > 0 ? (
        <View style={s.section}>
          <Text style={s.sectionLabel}>{data.notifications.length} NOTIFIKASI</Text>
          {data.notifications.map((n, i) => (
            <FadeIn key={n.id} delay={120 + i * 40}>
              <ScalePress onPress={() => !n.isRead && markOneMutation.mutate(n.id)}>
                <View style={[s.notifRow, !n.isRead && s.notifRowUnread]}>
                  <View style={[s.notifIcon, !n.isRead && { backgroundColor: C.accent }]}>
                    <Bell size={17} color={!n.isRead ? "#fff" : C.muted} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.notifTitleRow}>
                      <Text style={[s.notifTitle, !n.isRead && s.notifTitleUnread]} numberOfLines={1}>
                        {n.title}
                      </Text>
                      {!n.isRead ? <View style={s.dot} /> : null}
                    </View>
                    <Text style={s.notifBody} numberOfLines={2}>
                      {n.message}
                    </Text>
                    <Text style={s.notifTime}>{timeAgo(n.createdAt)}</Text>
                  </View>
                </View>
              </ScalePress>
            </FadeIn>
          ))}
        </View>
      ) : (
        <FadeIn delay={120}>
          <View style={s.emptyCard}>
            <Bell size={40} color={C.muted} strokeWidth={1.5} />
            <Text style={s.emptyTitle}>Tidak Ada Notifikasi</Text>
            <Text style={s.emptyText}>Notifikasi deadline laporan dan rencana bulanan akan muncul di sini.</Text>
          </View>
        </FadeIn>
      )}

      <View style={{ height: 130 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 130 },
  hero: {
    backgroundColor: C.accentSoft,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 28,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  backText: { fontSize: 12, fontWeight: "600", color: C.ink },
  heroRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  heroOverline: {
    fontSize: 11,
    fontWeight: "600",
    color: C.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTitle: { fontSize: 22, fontWeight: "900", color: C.ink, letterSpacing: -0.6, lineHeight: 26 },
  heroSub: { fontSize: 13, color: C.ink2, marginTop: 6 },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  readAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 16,
  },
  readAllText: { fontSize: 13, fontWeight: "700", color: C.accent },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
    paddingLeft: 2,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  alertTag: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  alertTitle: { fontSize: 14, fontWeight: "800", color: C.ink, marginTop: 2 },
  alertSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  notifRow: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  notifRowUnread: {
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(0,168,118,0.2)",
  },
  notifIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  notifTitle: { flex: 1, fontSize: 14, fontWeight: "500", color: C.ink, letterSpacing: -0.2 },
  notifTitleUnread: { fontWeight: "700" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
  notifBody: { fontSize: 12, color: C.ink2, lineHeight: 17, marginTop: 3 },
  notifTime: { fontSize: 11, color: C.muted, marginTop: 4 },
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    padding: 32,
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    marginHorizontal: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: C.ink },
  emptyText: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },
  loadingText: { fontSize: 14, color: C.muted, textAlign: "center", marginTop: 40 },
});
