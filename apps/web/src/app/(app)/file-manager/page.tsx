"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ExternalLink, HardDrive, Image as ImageIcon, RefreshCw, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "tamagui";
import { SystemHealthDashboard } from "@/components/system-health-dashboard";
import { EmptyState } from "@/components/ui/empty-state";

interface FileItem {
  path: string;
  size: number;
  mtime: string;
  orphan: boolean;
}

interface FileManagerResponse {
  items: FileItem[];
  total: number;
  orphans: number;
  orphanBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

export default function FileManagerPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "orphan" | "active">("all");
  const [showHealth, setShowHealth] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery<FileManagerResponse>({
    queryKey: ["file-manager"],
    queryFn: async () => {
      const res = await fetch("/api/file-manager");
      if (!res.ok) throw new Error("Gagal memuat daftar file");
      return res.json();
    },
  });

  const deleteSingleMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const res = await fetch(`/api/file-manager?path=${encodeURIComponent(filePath)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus file");
      return json;
    },
    onSuccess: () => {
      toast.success("File berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["file-manager"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus file");
    },
  });

  const deleteOrphansMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/file-manager?orphans=1", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membersihkan file yatim");
      return json;
    },
    onSuccess: (res) => {
      toast.success(`Berhasil membersihkan ${res.deleted} file yatim`);
      queryClient.invalidateQueries({ queryKey: ["file-manager"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal membersihkan file");
    },
  });

  const items = data?.items || [];
  const total = data?.total ?? 0;
  const orphans = data?.orphans ?? 0;
  const orphanBytes = data?.orphanBytes ?? 0;
  const activeCount = Math.max(0, total - orphans);

  const filtered = items.filter((item) => {
    const matchesSearch = item.path.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "orphan") return item.orphan;
    if (filter === "active") return !item.orphan;
    return true;
  });

  return (
    <div className="w-full mx-auto pb-8 fade-in bg-canvas space-y-6">
      {/* ── HERO (Tamagui Clean Bento) ── */}
      <Card className="relative overflow-hidden rounded-card bg-surface text-foreground border border-border shadow-subtle p-0">
        <div className="relative z-10 px-6 sm:px-8 pt-7 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary mb-2">Penyimpanan</p>
              <h1 className="text-[26px] sm:text-[30px] font-black tracking-tight leading-none text-foreground">
                File Manager
              </h1>
              <p className="text-[13px] font-medium text-muted-foreground mt-2">
                Manajemen berkas unggahan, deteksi file yatim, dan monitoring storage
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHealth(!showHealth)}
                className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-[11px] font-extrabold transition shadow-subtle ${
                  showHealth
                    ? "bg-primary text-white"
                    : "bg-surface-subtle hover:bg-surface text-foreground border border-border"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                {showHealth ? "Tutup Health" : "Status Sistem"}
              </button>
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-surface-subtle hover:bg-surface text-foreground border border-border text-[11px] font-extrabold transition shadow-subtle disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
                Segarkan
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="rounded-xl bg-surface-subtle/60 border border-border p-3.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">Total File</p>
              <p className="text-[22px] font-black tracking-tight text-foreground mt-1 tabular-nums">{total}</p>
            </div>
            <div className="rounded-xl bg-surface-subtle/60 border border-border p-3.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">File Terpakai</p>
              <p className="text-[22px] font-black tracking-tight text-primary mt-1 tabular-nums">{activeCount}</p>
            </div>
            <div className="rounded-xl bg-surface-subtle/60 border border-border p-3.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">File Yatim</p>
              <p className="text-[22px] font-black tracking-tight text-amber-600 mt-1 tabular-nums">{orphans}</p>
            </div>
            <div className="rounded-xl bg-surface-subtle/60 border border-border p-3.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">Ruang Yatim</p>
              <p className="text-[22px] font-black tracking-tight text-foreground mt-1 tabular-nums">
                {formatBytes(orphanBytes)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-5 pt-2">
        {/* ── HEALTH COLLAPSIBLE ── */}
        {showHealth && <SystemHealthDashboard />}

        {/* ── CONTROLS & BULK ACTION ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari file path..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface border border-border text-[12px] font-semibold text-foreground outline-none focus:border-primary transition-colors shadow-subtle"
              />
            </div>

            <div className="inline-flex items-center rounded-xl border border-border bg-surface p-1 shadow-subtle">
              <button
                onClick={() => setFilter("all")}
                className={`h-8 px-3 rounded-lg text-[11px] font-bold transition ${
                  filter === "all" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua ({total})
              </button>
              <button
                onClick={() => setFilter("orphan")}
                className={`h-8 px-3 rounded-lg text-[11px] font-bold transition ${
                  filter === "orphan" ? "bg-amber-500/15 text-amber-700" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yatim ({orphans})
              </button>
              <button
                onClick={() => setFilter("active")}
                className={`h-8 px-3 rounded-lg text-[11px] font-bold transition ${
                  filter === "active" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Terpakai ({activeCount})
              </button>
            </div>
          </div>

          {orphans > 0 && (
            <button
              onClick={() => {
                if (
                  confirm(
                    `Yakin ingin membersihkan ${orphans} file yatim (${formatBytes(orphanBytes)})? Tindakan ini tidak dapat dibatalkan.`,
                  )
                ) {
                  deleteOrphansMutation.mutate();
                }
              }}
              disabled={deleteOrphansMutation.isPending}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold transition shadow-subtle disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleteOrphansMutation.isPending ? "Membersihkan..." : `Bersihkan Semua Yatim (${orphans})`}
            </button>
          )}
        </div>

        {/* ── TABLE / LIST ── */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-surface-subtle animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={HardDrive}
            title="Tidak ada file ditemukan"
            description={search ? "Coba kata kunci pencarian lain." : "Belum ada file yang terunggah."}
          />
        ) : (
          <div className="rounded-card border border-border bg-surface overflow-hidden shadow-subtle">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-surface-subtle border-b border-border text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Ukuran</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Waktu Diubah</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {filtered.map((item) => {
                    const isImg = /\.(jpe?g|png|webp|gif)$/i.test(item.path);
                    return (
                      <tr key={item.path} className="hover:bg-surface-subtle/40 transition-colors">
                        <td className="px-4 py-3 min-w-[240px]">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-surface-subtle border border-border flex items-center justify-center shrink-0 overflow-hidden">
                              {isImg ? (
                                <Image
                                  src={item.path}
                                  alt={item.path.split("/").pop() || "Thumbnail"}
                                  width={36}
                                  height={36}
                                  unoptimized
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate text-[12px]">
                                {item.path.split("/").pop()}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate font-mono">{item.path}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-foreground">
                          {formatBytes(item.size)}
                        </td>
                        <td className="px-4 py-3">
                          {item.orphan ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              Yatim
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-subtle text-primary border border-primary/20">
                              Terpakai
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-muted-foreground">
                          {new Date(item.mtime).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <a
                              href={item.path}
                              target="_blank"
                              rel="noreferrer"
                              title="Buka file"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-subtle transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            {item.orphan && (
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus file ${item.path}?`)) {
                                    deleteSingleMutation.mutate(item.path);
                                  }
                                }}
                                title="Hapus file yatim"
                                disabled={deleteSingleMutation.isPending}
                                className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-500/10 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
