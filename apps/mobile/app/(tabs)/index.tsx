import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  MapPin,
  Search,
  Users,
} from "@tamagui/lucide-icons-2";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlobalSearch } from "../../src/components/GlobalSearch";
import { FadeIn, ScalePress } from "../../src/components/motion/primitives";
import { getScopePuskesmasId, PuskesmasPicker, setScopePuskesmasId } from "../../src/components/PuskesmasPicker";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { getDrafts } from "../../src/lib/drafts";
import { C, katColor } from "../../src/lib/tokens";

const DAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function initials(name?: string) {
  return (name || "P")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function Beranda() {
  const router = useRouter();
  const { user } = useAuth();
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();
  const today = now.toISOString().slice(0, 10);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pkmOpen, setPkmOpen] = useState(false);
  const [scopePkm, setScopePkm] = useState<number | null>(null);
  const [draftCount, setDraftCount] = useState(0);

  useFocusEffect(() => {
    getDrafts().then((d) => setDraftCount(d.length));
    getScopePuskesmasId().then(setScopePkm);
  });

  const { data: dash, refetch } = useQuery({
    queryKey: ["dashboard", scopePkm],
    queryFn: () => api.dashboard(scopePkm),
  });
  const { data: notifData } = useQuery({ queryKey: ["notifications"], queryFn: () => api.notifications() });
  const { data: rencana } = useQuery({
    queryKey: ["rencana-bulanan", bulan, tahun, scopePkm],
    queryFn: () => api.rencanaBulanan(bulan, tahun, scopePkm),
  });

  // semua sasaran bulan ini dipetakan per tanggal (untuk kalender strip + agenda)
  const byDate = useMemo(() => {
    const map = new Map<
      string,
      Array<{ id: number; nama: string; kategori: string; sudahDiperiksa: boolean; prioritas: number }>
    >();
    if (!rencana) return map;
    rencana.kategori?.forEach((kat) => {
      kat.subKategori?.sasaran?.forEach((sv: any) => {
        if (!sv.tanggalRencana) return;
        const key = new Date(sv.tanggalRencana).toISOString().slice(0, 10);
        const arr = map.get(key) || [];
        arr.push({
          id: sv.id,
          nama: sv.nama,
          kategori: kat.kategoriNama,
          sudahDiperiksa: sv.sudahDiperiksa,
          prioritas: sv.prioritas,
        });
        map.set(key, arr);
      });
    });
    return map;
  }, [rencana]);

  // minggu berjalan: Senin s/d Minggu
  const week = useMemo(() => {
    const d = new Date(now);
    const dow = d.getDay(); // 0=Min
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dow + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(monday);
      dd.setDate(monday.getDate() + i);
      const key = dd.toISOString().slice(0, 10);
      return {
        key,
        day: DAYS_SHORT[dd.getDay()],
        date: dd.getDate(),
        isToday: key === today,
        count: byDate.get(key)?.length ?? 0,
      };
    });
  }, [byDate, today]);

  const agenda = useMemo(() => {
    const list = byDate.get(today) || [];
    return list
      .map((a) => ({ ...a, alamat: null as string | null, jam: null as string | null }))
      .sort((a, b) => Number(a.sudahDiperiksa) - Number(b.sudahDiperiksa) || a.prioritas - b.prioritas);
  }, [byDate, today]);

  const doneToday = agenda.filter((a) => a.sudahDiperiksa).length;
  const pct = Math.round(rencana?.progress ?? 0);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const hour = now.getHours();
  const greeting = hour < 11 ? "pagi" : hour < 15 ? "siang" : hour < 19 ? "sore" : "malam";

  return (
    <>
      <ScrollView
        style={s.root}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        {/* Header — hero gelap ramping, langsung actionable */}
        <FadeIn>
          <View style={s.hero}>
            <LinearGradient
              colors={["#0C1B16", "#123527"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1.1 }}
              style={s.heroGrad}
            />
            <View style={s.heroBlob} />
            <View style={s.heroTopRow}>
              <View style={s.heroChip}>
                <CalendarDays size={11} color="rgba(255,255,255,0.85)" />
                <Text style={s.heroChipText}>
                  {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
                </Text>
              </View>
              <Pressable onPress={() => setSearchOpen(true)} hitSlop={8} style={s.heroIconBtn}>
                <Search size={17} color="#fff" strokeWidth={1.8} />
              </Pressable>
              <Pressable onPress={() => router.push("/notifications")} hitSlop={8} style={s.heroIconBtn}>
                <Bell size={17} color="#fff" strokeWidth={1.8} />
                {notifData?.unreadCount ? <View style={s.bellDot} /> : null}
              </Pressable>
              <Pressable onPress={() => router.push("/profil")} hitSlop={8} style={s.avatar}>
                <Text style={s.avatarText}>{initials(user?.name)}</Text>
              </Pressable>
            </View>

            <Text style={s.heroGreet}>
              Selamat {greeting}, {user?.name?.split(" ")[0] || "Petugas"}
            </Text>

            {/* Ringkasan hari ini — langsung, tanpa scroll */}
            <View style={s.heroTodayRow}>
              <Text style={s.heroTodayBig}>
                {doneToday}
                <Text style={s.heroTodayTotal}>/{agenda.length}</Text>
              </Text>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.heroTodayLabel}>agenda hari ini selesai</Text>
                <View style={s.heroProgTrack}>
                  <View
                    style={[
                      s.heroProgFill,
                      { width: `${agenda.length ? Math.max((doneToday / agenda.length) * 100, 3) : 0}%` },
                    ]}
                  />
                </View>
              </View>
              <Text style={s.heroPct}>{pct}%</Text>
            </View>

            {/* Scope puskesmas inline (admin/dinkes) */}
            {(user?.role === "ADMIN" || user?.role === "DINKES") && (
              <Pressable onPress={() => setPkmOpen(true)} hitSlop={6} style={s.heroScope}>
                <MapPin size={11} color="rgba(255,255,255,0.8)" />
                <Text style={s.heroScopeText} numberOfLines={1}>
                  {scopePkm ? `Puskesmas #${scopePkm}` : user?.puskesmasNama || "Semua Puskesmas"}
                </Text>
                <ChevronRight size={11} color="rgba(255,255,255,0.6)" />
              </Pressable>
            )}

            {/* CTA lanjutkan draft — friction terendah */}
            {draftCount > 0 ? (
              <ScalePress onPress={() => router.push("/drafts")}>
                <View style={s.draftCta}>
                  <FileText size={14} color="#06281E" strokeWidth={2.4} />
                  <Text style={s.draftCtaText}>Lanjutkan {draftCount} draft belum selesai</Text>
                  <ChevronRight size={14} color="#06281E" strokeWidth={2.4} />
                </View>
              </ScalePress>
            ) : null}
          </View>
        </FadeIn>

        {/* Kalender strip mingguan — angka jumlah agenda per hari */}
        <FadeIn delay={40}>
          <View style={s.weekCardWrap}>
            <View style={s.weekCard}>
              {week.map((d) => (
                <View key={d.key} style={[s.dayCell, d.isToday && s.dayCellToday]}>
                  <Text style={[s.dayLabel, d.isToday && s.dayLabelToday]}>{d.day}</Text>
                  <Text style={[s.dayNum, d.isToday && s.dayNumToday]}>{d.date}</Text>
                  <Text style={[s.dayCount, d.isToday && s.dayCountToday]}>{d.count > 0 ? d.count : "·"}</Text>
                </View>
              ))}
            </View>
          </View>
        </FadeIn>

        {/* Quick actions — 2 saja, sisanya di tab bar */}
        <FadeIn delay={80}>
          <View style={s.quickGrid}>
            <ScalePress onPress={() => router.push("/periksa")} style={{ flex: 1 }}>
              <View style={s.quickPrimary}>
                <ClipboardCheck size={19} color="#fff" strokeWidth={2} />
                <Text style={s.quickPrimaryText}>Periksa Baru</Text>
              </View>
            </ScalePress>
            <ScalePress onPress={() => router.push("/sasaran" as any)} style={{ flex: 1 }}>
              <View style={s.quickSecondary}>
                <Users size={19} color={C.accent} strokeWidth={2} />
                <Text style={s.quickSecondaryText}>Sasaran</Text>
              </View>
            </ScalePress>
            <ScalePress onPress={() => router.push("/drafts")} style={{ flex: 1 }}>
              <View style={s.quickSecondary}>
                <FileText size={19} color={C.accent} strokeWidth={2} />
                <Text style={s.quickSecondaryText}>Draft</Text>
                {draftCount > 0 ? (
                  <View style={s.quickBadge}>
                    <Text style={s.quickBadgeText}>{draftCount}</Text>
                  </View>
                ) : null}
              </View>
            </ScalePress>
          </View>
        </FadeIn>

        {/* Progres bulanan dipindah ke hero — tidak digandakan di sini */}

        {/* Agenda hari ini */}
        <FadeIn delay={160}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Agenda Hari Ini</Text>
            <Pressable onPress={() => router.push("/sasaran" as any)}>
              <Text style={s.seeAll}>Lihat semua</Text>
            </Pressable>
          </View>
        </FadeIn>
        {agenda.length === 0 ? (
          <FadeIn delay={200}>
            <View style={s.card}>
              <Text style={s.emptyText}>Tidak ada agenda. Waktu istirahat.</Text>
            </View>
          </FadeIn>
        ) : (
          agenda.map((a, i) => (
            <FadeIn key={a.id} delay={200 + i * 40}>
              <ScalePress onPress={() => router.push(`/sasaran/${a.id}` as any)}>
                <View style={[s.agendaCard, a.prioritas === 1 && !a.sudahDiperiksa && s.agendaCardPrio]}>
                  <View style={[s.agendaBar, { backgroundColor: katColor(a.kategori).color }]} />
                  <View style={[s.agendaIcon, { backgroundColor: `${katColor(a.kategori).color}18` }]}>
                    <ClipboardCheck
                      size={18}
                      color={a.sudahDiperiksa ? C.ok : katColor(a.kategori).color}
                      strokeWidth={1.8}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.agendaTitle} numberOfLines={1}>
                      {a.nama}
                    </Text>
                    <Text style={s.agendaSub} numberOfLines={1}>
                      {a.kategori}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.statusTag,
                      a.sudahDiperiksa ? s.statusOk : a.prioritas === 1 ? s.statusWarn : s.statusErr,
                    ]}
                  >
                    {a.sudahDiperiksa ? (
                      <CheckCircle2 size={10} color={C.ok} strokeWidth={2.5} />
                    ) : (
                      <AlertTriangle size={10} color={a.prioritas === 1 ? C.warn : C.err} strokeWidth={2.5} />
                    )}
                    <Text
                      style={[
                        s.statusTagText,
                        a.sudahDiperiksa ? { color: C.ok } : a.prioritas === 1 ? { color: C.warn } : { color: C.err },
                      ]}
                    >
                      {a.sudahDiperiksa ? "Selesai" : a.prioritas === 1 ? "Prioritas" : "Menunggu"}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={C.muted} />
                </View>
              </ScalePress>
            </FadeIn>
          ))
        )}

        {/* Libur */}
        {notifData?.liburMendatang?.length ? (
          <FadeIn delay={240}>
            <Text style={s.sectionLabel}>HARI LIBUR</Text>
            {notifData.liburMendatang.map((l: any) => (
              <Pressable
                key={l.tanggal}
                onPress={() => router.push("/notifications")}
                style={({ pressed }) => [s.liburCard, pressed && { opacity: 0.7 }]}
              >
                <View style={[s.liburIcon, { backgroundColor: l.sumber === "custom" ? C.accent : C.err }]}>
                  <CalendarDays size={16} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.liburKet, { color: l.sumber === "custom" ? C.accent : C.err }]}>{l.keterangan}</Text>
                  <Text style={s.liburHari}>{l.hari}</Text>
                </View>
              </Pressable>
            ))}
          </FadeIn>
        ) : null}

        {/* Terbaru */}
        <FadeIn delay={280}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Pemeriksaan Terbaru</Text>
            <Pressable onPress={() => router.push("/(tabs)/rekap" as any)}>
              <Text style={s.seeAll}>Lihat semua</Text>
            </Pressable>
          </View>
        </FadeIn>
        {dash?.recentInspections?.length ? (
          dash.recentInspections.map((ins: any, i: number) => (
            <FadeIn key={ins.id} delay={300 + i * 40}>
              <ScalePress onPress={() => router.push(`/inspection/result/${ins.id}`)}>
                <View style={s.recentCard}>
                  <View style={[s.agendaIcon, { backgroundColor: C.accentSoft }]}>
                    <ClipboardCheck size={18} color={C.accent} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.recentTitle} numberOfLines={1}>
                      {ins.namaSasaran}
                    </Text>
                    <Text style={s.recentSub} numberOfLines={1}>
                      {ins.templateName} ·{" "}
                      {new Date(ins.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={C.muted} />
                </View>
              </ScalePress>
            </FadeIn>
          ))
        ) : (
          <View style={s.card}>
            <Text style={s.emptyText}>Belum ada pemeriksaan.</Text>
          </View>
        )}

        <View style={{ height: 130 }} />
      </ScrollView>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <PuskesmasPicker
        open={pkmOpen}
        onClose={() => setPkmOpen(false)}
        role={user?.role}
        currentId={scopePkm}
        onPicked={async (id) => {
          await setScopePuskesmasId(id);
          setScopePkm(id);
        }}
      />
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 130 },
  // ── hero gelap ramping ─────────────────────────────
  hero: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 28 : 60,
    paddingBottom: 24,
    overflow: "hidden",
  },
  heroGrad: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
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
  heroTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  heroChipText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.85)" },
  heroIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FDE047",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  heroGreet: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    marginTop: 18,
    letterSpacing: 0.2,
  },
  heroTodayRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  heroTodayBig: {
    fontSize: 40,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -1,
    lineHeight: 42,
    fontVariant: ["tabular-nums"],
  },
  heroTodayTotal: { fontSize: 20, fontWeight: "800", color: "rgba(255,255,255,0.4)" },
  heroTodayLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.65)", marginBottom: 7 },
  heroProgTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  heroProgFill: { height: "100%", borderRadius: 3, backgroundColor: "#BEF264" },
  heroPct: {
    fontSize: 22,
    fontWeight: "900",
    color: "#D9F99D",
    marginLeft: 14,
    fontVariant: ["tabular-nums"],
  },
  heroScope: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 14,
  },
  heroScopeText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.9)" },
  draftCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#BEF264",
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  draftCtaText: { fontSize: 13, fontWeight: "800", color: "#06281E" },
  // ── kalender strip — menjorok ke hero ─────────────────────────
  weekCardWrap: { marginTop: -8, zIndex: 2 },
  weekCard: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 22,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    shadowColor: "#1B1917",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 14, gap: 2 },
  dayCellToday: { backgroundColor: C.accent },
  dayLabel: { fontSize: 10, fontWeight: "700", color: C.muted },
  dayLabelToday: { color: "rgba(255,255,255,0.85)" },
  dayNum: { fontSize: 15, fontWeight: "800", color: C.ink, fontVariant: ["tabular-nums"] },
  dayNumToday: { color: "#fff" },
  dayCount: { fontSize: 9, fontWeight: "800", color: C.accent, minHeight: 11, fontVariant: ["tabular-nums"] },
  dayCountToday: { color: "#D9F99D" },
  // ── quick actions 2 kolom ──────────────────────────────
  quickGrid: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  quickPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  quickPrimaryText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  quickSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: "#1B1917",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  quickSecondaryText: { fontSize: 13, fontWeight: "800", color: C.accent },
  quickBadge: {
    backgroundColor: C.err,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  quickBadgeText: { fontSize: 9, fontWeight: "800", color: "#FFFFFF" },
  // ── sections ──────────────────────────────────────────────────
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: C.ink, letterSpacing: -0.4 },
  seeAll: { fontSize: 12, fontWeight: "700", color: C.accent },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: C.muted,
    letterSpacing: 1.2,
    marginTop: 22,
    marginBottom: 10,
    marginLeft: 20,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    shadowColor: "#1B1917",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    paddingHorizontal: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  emptyText: { fontSize: 14, color: C.muted, textAlign: "center", paddingVertical: 14 },
  // ── agenda — bar warna kategori di kiri ───────────────────────
  agendaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 20,
    shadowColor: "#1B1917",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    padding: 14,
    marginBottom: 10,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  agendaCardPrio: {},
  agendaBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  agendaIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  agendaTitle: { fontSize: 15, fontWeight: "700", color: C.ink },
  agendaSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  statusTag: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusOk: { backgroundColor: "rgba(22,163,74,0.10)" },
  statusWarn: { backgroundColor: "rgba(217,119,6,0.12)" },
  statusErr: { backgroundColor: "rgba(220,38,38,0.08)" },
  statusTagText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },
  // ── libur ─────────────────────────────────────────────────────
  liburCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    marginHorizontal: 16,
    backgroundColor: C.surface,
    shadowColor: "#1B1917",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  liburIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  liburKet: { fontSize: 14, fontWeight: "800" },
  liburHari: { fontSize: 12, color: C.muted, marginTop: 1 },
  // ── recent ────────────────────────────────────────────────────
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 20,
    shadowColor: "#1B1917",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  recentTitle: { fontSize: 13, fontWeight: "700", color: C.ink },
  recentSub: { fontSize: 11, color: C.muted, marginTop: 2 },
});
