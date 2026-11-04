"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  Clock,
  Inbox,
  Loader2,
  Mail,
  MailCheck,
  MailOpen,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface NotificationItem {
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

const PAGE_SIZE = 15;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  return `${Math.floor(hrs / 24)}h lalu`;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filterMode, setFilterMode] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  // ── Query ──
  const {
    data: responseData,
    isLoading,
    isFetching,
  } = useQuery<NotificationApiResponse>({
    queryKey: ["notifications-page", page, filterMode],
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
    refetchInterval: 15_000,
  });

  const rawNotifications = responseData?.data ?? [];
  const total = responseData?.total ?? 0;
  const totalPages = Math.max(1, responseData?.totalPages ?? 1);
  const unreadCount = responseData?.unreadCount ?? 0;

  // Filter search locally
  const notifications = search.trim()
    ? rawNotifications.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.message.toLowerCase().includes(search.toLowerCase()),
      )
    : rawNotifications;

  // ── Mutations ──
  const markReadMutation = useMutation({
    mutationFn: ({ id, isRead = true }: { id: number; isRead?: boolean }) =>
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-page"] });
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
      toast.success("Semua notifikasi ditandai sudah dibaca");
      queryClient.invalidateQueries({ queryKey: ["notifications-page"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  const deleteSingleMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/notifications?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Notifikasi dihapus");
      queryClient.invalidateQueries({ queryKey: ["notifications-page"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
      if (selectedNotif) setSelectedNotif(null);
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => fetch("/api/notifications", { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Semua notifikasi dibersihkan");
      queryClient.invalidateQueries({ queryKey: ["notifications-page"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
      setSelectedNotif(null);
    },
  });

  function handleOpenDetail(notif: NotificationItem) {
    if (!notif.isRead) {
      markReadMutation.mutate({ id: notif.id, isRead: true });
    }
    setSelectedNotif(notif);
  }

  return (
    <div className="w-full fade-in min-h-screen bg-canvas">
      {/* ── HEADER MASTHEAD ── */}
      <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
        <div className="w-full max-w-[1400px] mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </span>
                <div>
                  <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-foreground leading-tight">
                    Inbox & Notifikasi
                  </h1>
                  <p className="text-xs sm:text-[13px] font-medium text-muted-foreground mt-0.5">
                    Pemberitahuan laporan, status persetujuan, jadwal inspeksi, dan pengumuman sistem
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["notifications-page"] });
                  queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
                  toast.success("Memperbarui notifikasi");
                }}
                disabled={isFetching}
                className="gap-1.5 rounded-full text-xs font-bold shadow-xs"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
                Refresh
              </Button>

              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="gap-1.5 rounded-full text-xs font-bold shadow-xs text-primary hover:bg-primary-subtle"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Tandai Semua Dibaca
                </Button>
              )}

              {total > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm("Hapus semua catatan notifikasi di akun Anda?")) {
                      clearAllMutation.mutate();
                    }
                  }}
                  disabled={clearAllMutation.isPending}
                  className="gap-1.5 rounded-full text-xs font-bold shadow-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Bersihkan Semua
                </Button>
              )}
            </div>
          </div>

          {/* ── BENTO TELEMETRY METRICS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            <Card className="p-3.5 bg-surface-subtle/70 border-border/80">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Notifikasi</span>
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xl sm:text-2xl font-black font-mono text-foreground mt-1">{total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Semua riwayat pesan masuk</p>
            </Card>

            <Card className="p-3.5 bg-surface-subtle/70 border-border/80">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-black uppercase tracking-wider">Belum Dibaca</span>
                <Bell className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {unreadCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Memerlukan perhatian Anda</p>
            </Card>

            <Card className="p-3.5 bg-surface-subtle/70 border-border/80 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-black uppercase tracking-wider">Status Saluran</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-sm font-black text-foreground mt-2">Realtime Lonceng Aktif</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Polling interval 15 detik</p>
            </Card>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT CANVAS ── */}
      <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-8 py-6 space-y-6">
        {/* ── FILTER & SEARCH TOOLBAR ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="inline-flex items-center gap-1 rounded-full bg-surface-subtle border border-border p-1 self-start shadow-xs">
            <button
              type="button"
              onClick={() => {
                setFilterMode("all");
                setPage(1);
              }}
              className={cn(
                "h-8 px-4 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
                filterMode === "all"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Semua Pesan
              <span
                className={cn(
                  "text-[10px] font-extrabold px-1.5 py-px rounded-full",
                  filterMode === "all" ? "bg-white/20 text-white" : "bg-primary-subtle text-primary",
                )}
              >
                {total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterMode("unread");
                setPage(1);
              }}
              className={cn(
                "h-8 px-4 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
                filterMode === "unread"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Belum Dibaca
              {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />}
              <span
                className={cn(
                  "text-[10px] font-extrabold px-1.5 py-px rounded-full",
                  filterMode === "unread" ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-600",
                )}
              >
                {unreadCount}
              </span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kata kunci notifikasi..."
              className="w-full h-9 pl-9 pr-3 rounded-full border border-border bg-surface text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
          </div>
        </div>

        {/* ── NOTIFICATION CARDS FEED ── */}
        <div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 bg-surface border border-border rounded-2xl">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Mengambil daftar notifikasi...
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={
                search
                  ? "Tidak ada hasil pencarian"
                  : filterMode === "unread"
                    ? "Semua notifikasi sudah dibaca"
                    : "Belum ada notifikasi"
              }
              description={
                search
                  ? `Tidak ditemukan pesan dengan kata kunci "${search}".`
                  : filterMode === "unread"
                    ? "Bagus! Anda telah menyelesaikan atau membaca seluruh pesan masuk."
                    : "Notifikasi mengenai persetujuan laporan, entri baru, dan pengumuman akan muncul di sini."
              }
            />
          ) : (
            <div className="space-y-2.5">
              {notifications.map((n) => (
                <Card
                  key={n.id}
                  onClick={() => handleOpenDetail(n)}
                  className={cn(
                    "border border-border bg-surface transition-all rounded-xl shadow-xs overflow-hidden cursor-pointer hover:border-primary/50 group relative",
                    !n.isRead ? "border-l-4 border-l-emerald-500 bg-primary/[0.02]" : "opacity-90 hover:opacity-100",
                  )}
                >
                  <div className="p-4 sm:p-5 flex items-start gap-4 justify-between">
                    {/* Left Indicator & Info */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <span
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all mt-0.5",
                          !n.isRead
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-surface-subtle text-muted-foreground border-border",
                        )}
                      >
                        {!n.isRead ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                      </span>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={cn(
                              "text-sm font-bold text-foreground leading-snug",
                              !n.isRead ? "font-black" : "font-semibold text-muted-foreground",
                            )}
                          >
                            {n.title}
                          </h3>
                          {!n.isRead && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            >
                              Baru
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                          {n.message}
                        </p>

                        <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground font-mono">
                          <Clock className="w-3 h-3 text-muted-foreground/70" />
                          <span>{timeAgo(n.createdAt)}</span>
                          <span>•</span>
                          <span className="text-muted-foreground/70">
                            {new Date(n.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          markReadMutation.mutate({
                            id: n.id,
                            isRead: !n.isRead,
                          })
                        }
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                        title={n.isRead ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
                      >
                        {n.isRead ? <Mail className="w-4 h-4" /> : <MailCheck className="w-4 h-4 text-emerald-600" />}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSingleMutation.mutate(n.id)}
                        disabled={deleteSingleMutation.isPending}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Hapus notifikasi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* ── PAGINATION BAR ── */}
          {totalPages > 1 && (
            <div className="pt-6">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={PAGE_SIZE}
                onPageChange={(p) => setPage(p)}
                noun="notifikasi"
                className="rounded-xl border shadow-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── DETAIL MODAL ── */}
      <Dialog open={Boolean(selectedNotif)} onOpenChange={(val) => !val && setSelectedNotif(null)}>
        <DialogContent className="sm:max-w-lg">
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
            <div className="p-4 rounded-xl bg-surface-subtle border border-border text-xs leading-relaxed text-foreground whitespace-pre-line font-medium max-h-[340px] overflow-y-auto">
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
