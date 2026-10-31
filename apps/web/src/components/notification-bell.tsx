"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchJsonOr } from "@/lib/fetch-json";

interface Notification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function playNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export function NotificationBell({ placement = "bottom" }: { placement?: "top" | "bottom" | "side" } = {}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Polling unread count every 15s
  const { data: countData } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: () => fetchJsonOr<{ count: number }>("/api/notifications/count", { count: 0 }),
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  // Toast realtime & sound ketika count bertambah
  useEffect(() => {
    if (countData?.count !== undefined) {
      if (prevCountRef.current !== null && countData.count > prevCountRef.current) {
        playNotificationSound();
        toast.info("Notifikasi Baru Masuk 🔔", {
          description: "Ada update laporan atau pemeriksaan terbaru di akun Anda.",
        });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
      prevCountRef.current = countData.count;
    }
  }, [countData?.count, queryClient]);

  // Fetch full list only when dropdown is opened
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => fetchJsonOr<Notification[]>("/api/notifications", []),
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: (id: number) =>
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () =>
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readAll: true }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  const clearAll = useMutation({
    mutationFn: () => fetch("/api/notifications", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
      setOpen(false);
    },
  });

  const testNotifMutation = useMutation({
    mutationFn: () =>
      fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testTelegram: true }),
      }).then((r) => r.json()),
    onSuccess: () => {
      playNotificationSound();
      toast.success("Notifikasi Uji Coba Berhasil!", {
        description: "Notifikasi lonceng aktif dan terkirim ke akun Anda.",
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
    onError: () => toast.error("Gagal mengirim notifikasi uji coba"),
  });

  const unreadCount =
    notifications.length > 0 ? notifications.filter((n) => !n.isRead).length : (countData?.count ?? 0);

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins}m lalu`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}j lalu`;
    return `${Math.floor(hrs / 24)}h lalu`;
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="relative h-9 w-9 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-subtle"
        aria-label="Notifikasi"
      >
        <Bell className="w-4 h-4" />
        {(countData?.count ?? 0) > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-background animate-in zoom-in">
            {countData?.count && countData.count > 9 ? "9+" : countData?.count}
          </span>
        )}
      </Button>

      {open && (
        <div
          className={`${
            placement === "top"
              ? "absolute left-0 bottom-full mb-2"
              : placement === "side"
                ? "absolute left-full bottom-0 ml-2"
                : "absolute right-0 top-12"
          } w-80 bg-surface border border-border rounded-card shadow-float z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150`}
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface-subtle/50">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-foreground">Notifikasi</span>
              {unreadCount > 0 && (
                <Badge
                  variant="outline"
                  className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                >
                  {unreadCount} baru
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-foreground"
                  title="Tandai semua sudah dibaca"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearAll.mutate()}
                  disabled={clearAll.isPending}
                  className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Hapus semua notifikasi"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="py-10 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                <p className="text-[12px] font-semibold text-muted-foreground mt-3">Memuat...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                <p className="text-[12px] font-semibold text-muted-foreground">Tidak ada notifikasi</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Anda sudah membaca semua pesan</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markRead.mutate(n.id)}
                  className={`px-4 py-3 border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-surface-subtle ${
                    !n.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[12px] font-bold truncate ${
                          !n.isRead ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {n.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1 font-medium">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Action: Test Notifikasi */}
          <div className="p-2 border-t border-border bg-surface-subtle/40">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => testNotifMutation.mutate()}
              disabled={testNotifMutation.isPending}
              className="w-full h-8 text-[11px] font-bold text-primary hover:text-primary hover:bg-primary-subtle gap-1.5 rounded-lg"
            >
              {testNotifMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {testNotifMutation.isPending ? "Menguji..." : "Kirim Notifikasi Uji Coba"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
