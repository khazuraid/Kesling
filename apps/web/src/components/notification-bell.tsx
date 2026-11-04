"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  Loader2,
  MailCheck,
  MailOpen,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchJsonOr } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationApiResponse {
  data: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount?: number;
}

const PAGE_SIZE = 8;

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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  return `${Math.floor(hrs / 24)}h lalu`;
}

interface NotificationBellProps {
  placement?: "top" | "bottom" | "side";
  showLabel?: boolean;
  className?: string;
}

export function NotificationBell({ placement = "bottom", showLabel = false, className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [filterMode, setFilterMode] = useState<"all" | "unread">("all");
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number | null>(null);

  // Close popup when clicking outside (kecuali saat modal detail terbuka)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (selectedNotif) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, selectedNotif]);

  // Polling unread count every 15s
  const { data: countData } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: () => fetchJsonOr<{ count: number }>("/api/notifications/count", { count: 0 }),
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  const unreadCount = countData?.count ?? 0;

  // Realtime notification sound & toast
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

  // Fetch paginated notifications
  const { data: responseData, isLoading } = useQuery<NotificationApiResponse>({
    queryKey: ["notifications", page, filterMode],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?page=${page}&limit=${PAGE_SIZE}&filter=${filterMode}`);
      if (!res.ok) throw new Error("Gagal mengambil notifikasi");
      const json = await res.json();
      if (Array.isArray(json)) {
        return {
          data: json,
          total: json.length,
          page: 1,
          limit: PAGE_SIZE,
          totalPages: 1,
        };
      }
      return json;
    },
    enabled: open,
  });

  const notifications = responseData?.data ?? [];
  const totalItems = responseData?.total ?? 0;
  const totalPages = Math.max(1, responseData?.totalPages ?? 1);

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: ({ id, isRead = true }: { id: number; isRead?: boolean }) =>
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readAll: true }),
      }),
    onSuccess: () => {
      toast.success("Semua notifikasi ditandai dibaca");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  const deleteSingleMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/notifications?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Notifikasi dihapus");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
      if (selectedNotif) setSelectedNotif(null);
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => fetch("/api/notifications", { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Semua notifikasi dibersihkan");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
      setOpen(false);
      setSelectedNotif(null);
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
        description: "Notifikasi aktif dan masuk ke daftar notifikasi Anda.",
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
    onError: () => toast.error("Gagal mengirim notifikasi uji coba"),
  });

  function handleOpenNotif(notif: NotificationItem) {
    if (!notif.isRead) {
      markReadMutation.mutate({ id: notif.id, isRead: true });
    }
    setSelectedNotif(notif);
  }

  // Positioning class for floating menu
  const placementClass =
    placement === "top"
      ? "absolute left-0 bottom-full mb-2 origin-bottom-left"
      : placement === "side"
        ? "absolute left-full bottom-0 ml-2 origin-bottom-left"
        : "absolute right-0 top-12 origin-top-right";

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* ── Trigger: Full Row (Sidebar) vs Icon-Only (Header) ── */}
      {showLabel ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors select-none",
            open
              ? "bg-primary-subtle text-primary font-bold"
              : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
          )}
          aria-label="Buka Notifikasi Pengguna"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <Bell className={cn("w-4 h-4", unreadCount > 0 ? "text-primary" : "text-muted-foreground")} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-2 ring-background" />
              )}
            </div>
            <span className="text-[12px] font-semibold truncate">Notifikasi</span>
          </div>

          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-black tabular-nums shadow-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(!open)}
          className="relative h-9 w-9 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-subtle"
          aria-label="Notifikasi"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-background animate-in zoom-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      )}

      {/* ── Floating Notification Panel ── */}
      {open && (
        <div
          className={cn(
            placementClass,
            "w-[340px] sm:w-[390px] bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 flex flex-col max-h-[540px]",
          )}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-surface-subtle/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-black text-foreground">Notifikasi Masuk</span>
              {unreadCount > 0 && (
                <Badge
                  variant="outline"
                  className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
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
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="h-7 px-2 text-[11px] font-bold rounded-lg text-muted-foreground hover:text-foreground gap-1"
                  title="Tandai semua sudah dibaca"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tandai Baca</span>
                </Button>
              )}
              {totalItems > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Hapus semua notifikasi Anda?")) clearAllMutation.mutate();
                  }}
                  disabled={clearAllMutation.isPending}
                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Hapus semua notifikasi"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 border-b border-border/80 bg-surface flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => {
                  setFilterMode("all");
                  setPage(1);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                  filterMode === "all"
                    ? "bg-surface text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Semua ({totalItems})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode("unread");
                  setPage(1);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1",
                  filterMode === "unread"
                    ? "bg-surface text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Belum Dibaca
                {unreadCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
              </button>
            </div>

            <span className="text-[10px] text-muted-foreground font-medium">Buka untuk membaca</span>
          </div>

          {/* Notification List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {isLoading ? (
              <div className="py-14 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                <p className="text-[11px] font-semibold text-muted-foreground mt-2">Memuat pesan...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-14 text-center px-4">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                <p className="text-xs font-bold text-foreground">
                  {filterMode === "unread" ? "Tidak ada pesan belum dibaca" : "Kotak notifikasi kosong"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {filterMode === "unread"
                    ? "Semua notifikasi Anda sudah dibaca."
                    : "Pemberitahuan laporan, persetujuan, dan inspeksi akan tampil di sini."}
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleOpenNotif(n)}
                  className={cn(
                    "px-4 py-3 cursor-pointer transition-colors hover:bg-surface-subtle group relative flex items-start gap-3",
                    !n.isRead ? "bg-primary/5 hover:bg-primary/10" : "opacity-80 hover:opacity-100",
                  )}
                >
                  {/* Status Indicator */}
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full mt-1.5 shrink-0 transition-transform group-hover:scale-125",
                      !n.isRead ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-muted-foreground/30",
                    )}
                  />

                  {/* Body Text */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-xs leading-snug truncate",
                          !n.isRead ? "font-black text-foreground" : "font-semibold text-muted-foreground",
                        )}
                      >
                        {n.title}
                      </p>
                      <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                  </div>

                  {/* Quick Delete Action on Hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSingleMutation.mutate(n.id);
                    }}
                    className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    title="Hapus notifikasi ini"
                    aria-label="Hapus notifikasi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* ── Paging Footer ── */}
          <div className="p-2.5 border-t border-border bg-surface-subtle/60 shrink-0 flex items-center justify-between gap-2 text-xs">
            <span className="text-[11px] font-medium text-muted-foreground pl-1">
              {totalItems > 0 ? (
                <>
                  Hal. <strong className="text-foreground">{page}</strong> dari {totalPages}
                </>
              ) : (
                "0 notifikasi"
              )}
            </span>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="h-7 px-2 text-[11px] font-bold gap-1 rounded-lg shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="h-7 px-2 text-[11px] font-bold gap-1 rounded-lg shadow-2xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Secondary Footer Action */}
          <div className="px-2 py-1.5 border-t border-border/70 bg-surface shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => testNotifMutation.mutate()}
              disabled={testNotifMutation.isPending}
              className="w-full h-6 text-[10px] font-bold text-muted-foreground hover:text-foreground gap-1.5 rounded-md"
            >
              {testNotifMutation.isPending ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <Sparkles className="w-2.5 h-2.5 text-primary" />
              )}
              {testNotifMutation.isPending ? "Menguji..." : "Kirim Uji Coba Lonceng"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialog Modal: Detail Notifikasi ── */}
      <Dialog open={Boolean(selectedNotif)} onOpenChange={(val) => !val && setSelectedNotif(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <Badge
                variant={selectedNotif?.isRead ? "secondary" : "default"}
                className="text-[10px] font-black uppercase tracking-wider"
              >
                {selectedNotif?.isRead ? "Sudah Dibaca" : "Baru"}
              </Badge>
              {selectedNotif && (
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(selectedNotif.createdAt).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              )}
            </div>
            <DialogTitle className="text-base font-black text-foreground pt-1 leading-snug">
              {selectedNotif?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <div className="p-4 rounded-xl bg-surface-subtle border border-border text-xs leading-relaxed text-foreground whitespace-pre-line font-medium max-h-[300px] overflow-y-auto">
              {selectedNotif?.message}
            </div>
          </div>

          <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2 pt-2 border-t border-border">
            {selectedNotif && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => deleteSingleMutation.mutate(selectedNotif.id)}
                disabled={deleteSingleMutation.isPending}
                className="gap-1.5 text-xs font-bold rounded-lg h-8"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </Button>
            )}

            <div className="flex items-center gap-2">
              {selectedNotif && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    markReadMutation.mutate({
                      id: selectedNotif.id,
                      isRead: !selectedNotif.isRead,
                    });
                    setSelectedNotif({
                      ...selectedNotif,
                      isRead: !selectedNotif.isRead,
                    });
                  }}
                  className="gap-1.5 text-xs font-bold rounded-lg h-8"
                >
                  {selectedNotif.isRead ? (
                    <>
                      <MailOpen className="w-3.5 h-3.5" /> Tandai Belum Dibaca
                    </>
                  ) : (
                    <>
                      <MailCheck className="w-3.5 h-3.5" /> Tandai Dibaca
                    </>
                  )}
                </Button>
              )}
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setSelectedNotif(null)}
                className="text-xs font-bold rounded-lg h-8 px-4"
              >
                Tutup
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
