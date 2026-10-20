"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertOctagon,
  Calendar,
  ChevronLeft,
  Copy,
  ExternalLink,
  Search,
  Terminal,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "tamagui";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";

interface SystemErrorLog {
  id: number;
  message: string;
  stack?: string | null;
  path?: string | null;
  userEmail?: string | null;
  createdAt: string;
}

export default function SystemErrorsPage() {
  const queryClient = useQueryClient();
  const [selectedLog, setSelectedLog] = useState<SystemErrorLog | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ logs: SystemErrorLog[]; total: number }>({
    queryKey: ["system-errors"],
    queryFn: async () => {
      const res = await fetch("/api/system-errors?limit=200");
      if (!res.ok) throw new Error("Gagal memuat log error");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/system-errors", { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal membersihkan log");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Semua log error berhasil dibersihkan");
      queryClient.invalidateQueries({ queryKey: ["system-errors"] });
      setSelectedLog(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal membersihkan log");
    },
  });

  const deleteOneMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/system-errors?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus log");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Log error berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["system-errors"] });
      if (selectedLog?.id) setSelectedLog(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus log");
    },
  });

  const logs: SystemErrorLog[] = data?.logs || [];
  const filtered = logs.filter(
    (l) =>
      l.message.toLowerCase().includes(search.toLowerCase()) ||
      (l.path || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.userEmail || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 fade-in bg-canvas min-h-screen">
      {/* Back Link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-[12px] font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Kembali ke Pengaturan
      </Link>

      {/* Hero Header (Tamagui Clean Bento) */}
      <Card className="relative overflow-hidden rounded-card bg-surface text-foreground border border-border shadow-subtle p-0">
        <div className="relative z-10 px-6 sm:px-8 py-6 sm:py-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-red-600 mb-2">
              Diagnostik Sistem
            </p>
            <h1 className="text-[26px] sm:text-[32px] font-black tracking-tight leading-none text-foreground">
              Log Error Sistem
            </h1>
            <p className="text-[13px] font-medium text-muted-foreground mt-2">
              Daftar uncaught exceptions, kegagalan query, dan crash aplikasi
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-red-500/10 text-red-600 text-[11px] font-bold border border-red-500/20">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {logs.length} Total Error
            </span>
          </div>
        </div>
      </Card>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Cari pesan error, path, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-3 rounded-xl bg-surface border border-border text-[12px] font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-subtle transition-all placeholder:text-muted-foreground"
          />
        </div>

        {logs.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm("Apakah Anda yakin ingin membersihkan semua log error?")) {
                clearAllMutation.mutate();
              }
            }}
            disabled={clearAllMutation.isPending}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-error text-white text-[11px] font-bold uppercase tracking-wider hover:bg-error/90 shadow-subtle transition-all cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {clearAllMutation.isPending ? "Membersihkan..." : "Bersihkan Semua Log"}
          </button>
        )}
      </div>

      {/* Error Table Container */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-card bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<AlertOctagon className="w-8 h-8 text-muted-foreground" />}
          title={search ? "Tidak ada error yang cocok" : "Tidak Ada Error Terdeteksi"}
          description={
            search
              ? "Coba ubah kata kunci pencarian Anda."
              : "Sistem berjalan dengan stabil dan lancar tanpa crash atau kegagalan API."
          }
        />
      ) : (
        <div className="rounded-card bg-surface border border-border shadow-subtle overflow-hidden overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-subtle">
                <th className="text-left px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-36">
                  Konteks / Path
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Pesan Error
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-48">
                  User
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-40">
                  Waktu
                </th>
                <th className="text-right px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-24">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-pill text-[10px] font-mono font-bold bg-error-light text-error border border-error/20">
                      {log.path || "API"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-[12px] font-mono font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {log.message}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[12px] font-medium text-muted-foreground flex items-center gap-1.5 truncate">
                      <UserIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      {log.userEmail || "Anonymous"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 tabular-nums">
                      <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      {new Date(log.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-surface-subtle hover:text-foreground transition-colors cursor-pointer"
                        title="Lihat detail stack trace"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Hapus log error ini?")) {
                            deleteOneMutation.mutate(log.id);
                          }
                        }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-error-light hover:text-error transition-colors cursor-pointer"
                        title="Hapus log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Detail Error Log"
        description="Informasi konteks dan stack trace pengecualian sistem"
        icon={<Terminal className="w-4 h-4 text-error" />}
        size="lg"
        variant="hero"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => {
                if (selectedLog?.stack || selectedLog?.message) {
                  navigator.clipboard.writeText(
                    `Pesan: ${selectedLog.message}\nPath: ${selectedLog.path}\nUser: ${selectedLog.userEmail}\nWaktu: ${selectedLog.createdAt}\n\nStack:\n${selectedLog.stack || "-"}`,
                  );
                  toast.success("Detail error disalin ke clipboard");
                }
              }}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border text-[11px] font-bold text-foreground hover:bg-surface-subtle transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Salin Detail
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedLog && confirm("Hapus log error ini?")) {
                    deleteOneMutation.mutate(selectedLog.id);
                  }
                }}
                className="h-10 px-4 rounded-full text-[11px] font-bold uppercase tracking-wider text-error hover:bg-error-light transition-colors cursor-pointer"
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="h-10 px-5 rounded-full bg-primary text-white text-[11px] font-bold uppercase tracking-wider hover:bg-primary-hover shadow-subtle transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        }
      >
        {selectedLog && (
          <div className="space-y-4">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Pesan Error
              </span>
              <div className="p-3.5 rounded-xl bg-error-light/60 border border-error/25 font-mono text-[12px] text-error font-semibold break-all leading-relaxed">
                {selectedLog.message}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-surface-subtle border border-border">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Path / Modul
                </span>
                <span className="font-mono text-[12px] font-semibold text-foreground block mt-1">
                  {selectedLog.path || "-"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-subtle border border-border">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Pengguna
                </span>
                <span className="text-[12px] font-semibold text-foreground block mt-1 truncate">
                  {selectedLog.userEmail || "Anonymous"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-subtle border border-border">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Waktu Kejadian
                </span>
                <span className="text-[12px] font-semibold text-foreground block mt-1 tabular-nums">
                  {new Date(selectedLog.createdAt).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Stack Trace
              </span>
              {selectedLog.stack ? (
                <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-[280px] overflow-y-auto whitespace-pre leading-relaxed border border-zinc-800">
                  {selectedLog.stack}
                </pre>
              ) : (
                <div className="p-4 rounded-xl bg-surface-subtle border border-border text-[11px] font-medium text-muted-foreground italic text-center">
                  Tidak ada stack trace terekam untuk error ini.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
