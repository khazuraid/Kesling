"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Notification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Lightweight polling: only unread count every 30s
  const { data: countData } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/count");
      return res.json() as Promise<{ count: number }>;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // Fetch full list only when dropdown is opened
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
        aria-label="Notifikasi"
      >
        <Bell className="w-4 h-4" />
        {(countData?.count ?? 0) > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[hsl(var(--error))]" />}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-[hsl(var(--card))] border border-[hsl(var(--border))] z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-[hsl(var(--foreground))]">Notifikasi</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-[hsl(var(--error))]/10 text-[hsl(var(--error))] text-[10px] font-bold">
                  {unreadCount} baru
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                  title="Tandai semua sudah dibaca"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => clearAll.mutate()}
                  disabled={clearAll.isPending}
                  className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--error))] hover:bg-[hsl(var(--error))]/10 transition-colors"
                  title="Hapus semua notifikasi"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="py-10 text-center">
                <div className="w-6 h-6 border-2 border-[hsl(var(--muted))] border-t-[hsl(var(--accent))] animate-spin mx-auto" />
                <p className="text-[12px] font-semibold text-[hsl(var(--muted-foreground))] mt-3">Memuat...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--muted-foreground))] opacity-20" />
                <p className="text-[12px] font-semibold text-[hsl(var(--muted-foreground))]">Tidak ada notifikasi</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markRead.mutate(n.id)}
                  className={`px-4 py-3 border-b border-[hsl(var(--border))] last:border-0 cursor-pointer transition-colors hover:bg-[hsl(var(--muted))]/30 ${
                    !n.isRead ? "bg-[hsl(var(--accent))]/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[12px] font-bold truncate ${!n.isRead ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}
                      >
                        {n.title}
                      </p>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]/60 mt-1 font-medium">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!n.isRead && <div className="w-2 h-2 bg-[hsl(var(--accent))] mt-1 shrink-0" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
