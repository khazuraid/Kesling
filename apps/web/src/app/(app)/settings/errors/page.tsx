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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    <div className="w-full fade-in min-h-screen bg-canvas">
      {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
      <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Pengaturan
              </Link>
              <span className="text-muted-foreground/40">•</span>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-red-600">Diagnostik Sistem</p>
            </div>
            <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-none text-foreground">
              Log Error Sistem
            </h1>
            <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-2">
              Daftar uncaught exceptions, kegagalan query, dan crash aplikasi
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="gap-1.5 py-1 px-3 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {logs.length} Total Error
            </Badge>
          </div>
        </div>
      </div>

      {/* ── CONTENT BODY (CANVAS) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari pesan error, path, atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          {logs.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("Apakah Anda yakin ingin membersihkan semua log error?")) {
                  clearAllMutation.mutate();
                }
              }}
              disabled={clearAllMutation.isPending}
              className="gap-2 h-10 px-5 rounded-full uppercase tracking-wider text-[11px] font-bold shadow-subtle"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearAllMutation.isPending ? "Membersihkan..." : "Bersihkan Semua Log"}
            </Button>
          )}
        </div>

        {/* Error Table Container */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-surface-subtle animate-pulse" />
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
          <Card className="shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36">Konteks / Path</TableHead>
                    <TableHead>Pesan Error</TableHead>
                    <TableHead className="w-48">User</TableHead>
                    <TableHead className="w-40">Waktu</TableHead>
                    <TableHead className="w-24 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => (
                    <TableRow
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="cursor-pointer group hover:bg-surface-subtle/50"
                    >
                      <TableCell>
                        <Badge variant="destructive" className="font-mono text-[10px]">
                          {log.path || "API"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-[12px] font-mono font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {log.message}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-[12px] font-medium text-muted-foreground flex items-center gap-1.5 truncate">
                          <UserIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          {log.userEmail || "Anonymous"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 tabular-nums">
                          <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          {new Date(log.createdAt).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedLog(log)}
                            className="w-8 h-8"
                            title="Lihat detail stack trace"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Hapus log error ini?")) {
                                deleteOneMutation.mutate(log.id);
                              }
                            }}
                            className="w-8 h-8 text-destructive hover:bg-destructive/10"
                            title="Hapus log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Detail Modal */}
        <Modal
          open={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Detail Error Log"
          description="Informasi konteks dan stack trace pengecualian sistem"
          icon={<Terminal className="w-4 h-4 text-destructive" />}
          size="lg"
          variant="hero"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedLog?.stack || selectedLog?.message) {
                    navigator.clipboard.writeText(
                      `Pesan: ${selectedLog.message}\nPath: ${selectedLog.path}\nUser: ${selectedLog.userEmail}\nWaktu: ${selectedLog.createdAt}\n\nStack:\n${selectedLog.stack || "-"}`,
                    );
                    toast.success("Detail error disalin ke clipboard");
                  }
                }}
                className="gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Salin Detail
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedLog && confirm("Hapus log error ini?")) {
                      deleteOneMutation.mutate(selectedLog.id);
                    }
                  }}
                  className="text-destructive hover:bg-destructive/10"
                >
                  Hapus
                </Button>
                <Button size="sm" onClick={() => setSelectedLog(null)}>
                  Tutup
                </Button>
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
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 font-mono text-[12px] text-destructive font-semibold break-all leading-relaxed">
                  {selectedLog.message}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="p-3 bg-surface-subtle">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Path / Modul
                  </span>
                  <span className="font-mono text-[12px] font-semibold text-foreground block mt-1">
                    {selectedLog.path || "-"}
                  </span>
                </Card>
                <Card className="p-3 bg-surface-subtle">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pengguna
                  </span>
                  <span className="text-[12px] font-semibold text-foreground block mt-1 truncate">
                    {selectedLog.userEmail || "Anonymous"}
                  </span>
                </Card>
                <Card className="p-3 bg-surface-subtle">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Waktu Kejadian
                  </span>
                  <span className="text-[12px] font-semibold text-foreground block mt-1 tabular-nums">
                    {new Date(selectedLog.createdAt).toLocaleString("id-ID")}
                  </span>
                </Card>
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
                  <Card className="p-4 bg-surface-subtle text-[11px] font-medium text-muted-foreground italic text-center">
                    Tidak ada stack trace terekam untuk error ini.
                  </Card>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
