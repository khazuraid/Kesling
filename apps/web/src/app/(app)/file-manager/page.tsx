"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ExternalLink, HardDrive, Image as ImageIcon, RefreshCw, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
  const total = data?.total || 0;
  const orphans = data?.orphans || 0;
  const orphanBytes = data?.orphanBytes || 0;
  const activeCount = total - orphans;

  const filtered = items.filter((item) => {
    if (filter === "orphan" && !item.orphan) return false;
    if (filter === "active" && item.orphan) return false;
    if (search.trim()) {
      return item.path.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  return (
    <div className="w-full mx-auto pb-8 fade-in">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-[#0C1B16] text-white">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#00A876] opacity-[0.12]" />
        <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-[#BEF264] opacity-[0.05]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#123527_0%,transparent_55%)]" />

        <div className="relative z-10 px-8 pt-7 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-2">
                Penyimpanan
              </p>
              <h1 className="text-[30px] font-black tracking-[-0.03em] leading-none">File Manager</h1>
              <p className="text-[13px] font-medium text-white/50 mt-2">
                Manajemen berkas unggahan, deteksi file yatim, dan monitoring storage
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHealth(!showHealth)}
                className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[11px] font-extrabold transition ${
                  showHealth ? "bg-[#00A876] text-[#06281E]" : "bg-white/8 hover:bg-white/12 text-white"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                {showHealth ? "Tutup Health" : "Status Sistem"}
              </button>
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white/8 hover:bg-white/12 text-white text-[11px] font-extrabold transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
                Segarkan
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-3.5">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">Total File</p>
              <p className="text-[22px] font-black tracking-tight text-white mt-1 tabular-nums">{total}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-3.5">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">File Terpakai</p>
              <p className="text-[22px] font-black tracking-tight text-[#7CF5CE] mt-1 tabular-nums">{activeCount}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-3.5">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">File Yatim</p>
              <p className="text-[22px] font-black tracking-tight text-[#E8A33D] mt-1 tabular-nums">{orphans}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-3.5">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">Ruang Yatim</p>
              <p className="text-[22px] font-black tracking-tight text-[#BEF264] mt-1 tabular-nums">
                {formatBytes(orphanBytes)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6 space-y-5">
        {/* ── HEALTH COLLAPSIBLE ── */}
        {showHealth && <SystemHealthDashboard />}

        {/* ── CONTROLS & BULK ACTION ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Cari file path..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-semibold text-[hsl(var(--foreground))] outline-none focus:border-[#00A876] transition-colors"
              />
            </div>

            <div className="inline-flex items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1">
              <button
                onClick={() => setFilter("all")}
                className={`h-8 px-3 rounded-lg text-[11px] font-bold transition ${
                  filter === "all"
                    ? "bg-[#0C1B16] text-[#7CF5CE]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                Semua ({total})
              </button>
              <button
                onClick={() => setFilter("orphan")}
                className={`h-8 px-3 rounded-lg text-[11px] font-bold transition ${
                  filter === "orphan"
                    ? "bg-[#0C1B16] text-[#E8A33D]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                Yatim ({orphans})
              </button>
              <button
                onClick={() => setFilter("active")}
                className={`h-8 px-3 rounded-lg text-[11px] font-bold transition ${
                  filter === "active"
                    ? "bg-[#0C1B16] text-[#7CF5CE]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
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
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold transition disabled:opacity-50"
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
              <div key={i} className="h-16 rounded-2xl bg-[hsl(var(--muted))]/40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={HardDrive}
            title="Tidak ada file ditemukan"
            description={search ? "Coba kata kunci pencarian lain." : "Belum ada file yang terunggah."}
          />
        ) : (
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-[hsl(var(--muted))]/30 border-b border-[hsl(var(--border))] text-[10px] font-extrabold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))]">
                  <tr>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Ukuran</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Waktu Diubah</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))] font-medium">
                  {filtered.map((item) => {
                    const isImg = /\.(jpe?g|png|webp|gif)$/i.test(item.path);
                    return (
                      <tr key={item.path} className="hover:bg-[hsl(var(--muted))]/20 transition-colors">
                        <td className="px-4 py-3 min-w-[240px]">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[hsl(var(--muted))]/60 border border-[hsl(var(--border))] flex items-center justify-center shrink-0 overflow-hidden">
                              {isImg ? (
                                <img
                                  src={item.path}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[hsl(var(--foreground))] truncate text-[12px]">
                                {item.path.split("/").pop()}
                              </p>
                              <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate font-mono">
                                {item.path}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-[hsl(var(--foreground))]">
                          {formatBytes(item.size)}
                        </td>
                        <td className="px-4 py-3">
                          {item.orphan ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              Yatim
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#00A876]/10 text-[#00A876] border border-[#00A876]/20">
                              Terpakai
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-[hsl(var(--muted-foreground))]">
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
                              className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition"
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
