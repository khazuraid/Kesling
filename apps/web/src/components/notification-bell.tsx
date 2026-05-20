"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: number) =>
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1 text-slate-400 hover:text-white"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-72 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-3 border-b font-semibold text-sm text-slate-900">
            Notifikasi
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400">Tidak ada notifikasi</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 border-b text-sm cursor-pointer hover:bg-slate-50 ${!n.isRead ? "bg-teal-50" : ""}`}
                onClick={() => {
                  if (!n.isRead) markRead.mutate(n.id);
                }}
              >
                <div className="font-medium text-slate-900">{n.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{n.message}</div>
                <div className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString("id-ID")}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
