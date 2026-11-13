import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Info,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/lib/api";

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
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications(),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.markNotifRead(undefined, true),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: number) => api.markNotifRead(id),
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const items = Array.isArray(data) ? data : (data as any)?.items || [];
  const unreadCount = items.filter((n: any) => !n.read).length;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* 1. Header Bar */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.btnBack} hitSlop={8}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.topBarTitle}>Notifikasi & Pengingat</Text>
          <Text style={s.topBarSub}>
            {unreadCount > 0 ? `${unreadCount} pesan belum dibaca` : "Semua notifikasi terbaca"}
          </Text>
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={() => markAllMutation.mutate()} style={s.btnMarkAll} hitSlop={8}>
            <CheckCheck size={16} color="#047857" strokeWidth={2.4} />
            <Text style={s.btnMarkAllText}>Tandai Dibaca</Text>
          </Pressable>
        )}
      </View>

      {/* 2. Notification List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 60 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#047857" />}
      >
        {isLoading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="small" color="#047857" />
            <Text style={s.loadingText}>Memuat notifikasi...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={s.emptyBox}>
            <View style={s.emptyIconWrap}>
              <Bell size={28} color="#94A3B8" strokeWidth={2} />
            </View>
            <Text style={s.emptyTitle}>Belum Ada Notifikasi</Text>
            <Text style={s.emptyDesc}>Pengingat jadwal inspeksi dan peringatan sanitasi KLB akan muncul di sini.</Text>
          </View>
        ) : (
          <View style={s.notifList}>
            {items.map((item: any) => {
              const isUnread = !item.read;
              const isUrgent = item.type === "KLB" || item.type === "EMERGENCY" || item.priority === "HIGH";

              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    if (isUnread) markOneMutation.mutate(item.id);
                  }}
                  style={[s.notifCard, isUnread && s.notifCardUnread, isUrgent && s.notifCardUrgent]}
                >
                  <View style={s.notifCardHeader}>
                    <View
                      style={[
                        s.notifIconWrap,
                        isUrgent
                          ? { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }
                          : { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
                      ]}
                    >
                      {isUrgent ? (
                        <AlertTriangle size={18} color="#DC2626" strokeWidth={2.2} />
                      ) : (
                        <Calendar size={18} color="#047857" strokeWidth={2.2} />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={s.titleRow}>
                        <Text style={[s.notifTitle, isUnread && s.notifTitleUnread]}>
                          {item.title || "Pengingat Inspeksi"}
                        </Text>
                        {isUnread && <View style={s.unreadDot} />}
                      </View>
                      <View style={s.timeRow}>
                        <Clock size={11} color="#94A3B8" />
                        <Text style={s.timeText}>{item.createdAt ? timeAgo(item.createdAt) : "Baru saja"}</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={s.notifBody}>{item.message || item.body || item.content}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  btnBack: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  topBarSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  btnMarkAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  btnMarkAllText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#047857",
  },
  scrollContent: {
    padding: 16,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptyDesc: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 18,
  },
  notifList: {
    gap: 10,
  },
  notifCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  notifCardUnread: {
    backgroundColor: "#FFFFFF",
    borderColor: "#A7F3D0",
    borderLeftWidth: 4,
    borderLeftColor: "#047857",
  },
  notifCardUrgent: {
    borderColor: "#FCA5A5",
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
  },
  notifCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notifIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  notifTitleUnread: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#047857",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  notifBody: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
  },
});
