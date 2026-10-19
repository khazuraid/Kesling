"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  History,
  Loader2,
  RefreshCw,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import type { ImportJobState } from "./import-inspection-modal";

export interface HistoryJobItem {
  jobId: string;
  status: "queued" | "processing" | "complete" | "failed";
  progress: number;
  message: string;
  fileName: string;
  queuePosition?: number;
  createdAt: string;
  completedAt?: string;
  error?: string | null;
  fieldCount: number;
}

interface HistoryResponse {
  jobs: HistoryJobItem[];
  queue?: {
    totalQueued: number;
    isWorkerActive: boolean;
  };
}

interface ImportHistoryModalProps {
  open: boolean;
  activeJob: ImportJobState | null;
  onClose: () => void;
  onOpenTerminal: (jobId: string) => void;
  onApplyResult: (result: any) => void;
}

export function ImportHistoryModal({
  open,
  activeJob,
  onClose,
  onOpenTerminal,
  onApplyResult,
}: ImportHistoryModalProps) {
  const {
    data: historyData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<HistoryResponse>({
    queryKey: ["inspection-import-history"],
    queryFn: async () => {
      const res = await fetch("/api/inspection/templates/import?action=history");
      if (!res.ok) throw new Error("Gagal mengambil riwayat");
      return res.json();
    },
    enabled: open,
    refetchInterval: (query) => {
      // Auto-poll every 2.5s if active job or queue exists
      const totalQueued = query.state.data?.queue?.totalQueued || 0;
      const isWorkerActive = query.state.data?.queue?.isWorkerActive;
      const hasActive =
        activeJob?.status === "queued" ||
        activeJob?.status === "processing" ||
        totalQueued > 0 ||
        isWorkerActive ||
        query.state.data?.jobs?.some((j) => j.status === "queued" || j.status === "processing");
      return hasActive ? 2500 : false;
    },
  });

  if (!open) return null;

  const jobs = historyData?.jobs || [];
  const queueInfo = historyData?.queue;

  const handleApplyFromHistory = async (jobId: string) => {
    try {
      const res = await fetch(`/api/inspection/templates/import?jobId=${jobId}`);
      if (!res.ok) throw new Error("Gagal mengambil data template");
      const data = await res.json();
      if (data.result) {
        onApplyResult(data.result);
        onClose();
      } else {
        alert("Data hasil import belum tersedia.");
      }
    } catch (e: any) {
      alert(e?.message || "Gagal memuat template");
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!confirm("Batalkan file ini dari antrean?")) return;
    try {
      await fetch(`/api/inspection/templates/import?action=cancel&jobId=${jobId}`);
      refetch();
    } catch {}
  };

  const handleClearQueue = async () => {
    if (!confirm("Kosongkan semua antrean yang tertunda?")) return;
    try {
      await fetch("/api/inspection/templates/import?action=clear-queue");
      refetch();
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-card shadow-float overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-surface-subtle/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-button bg-primary-subtle border border-primary/20 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                Status Antrean & Riwayat Upload
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                Monitoring antrean worker realtime & riwayat template
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              title="Perbarui antrean"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Queue Overview Summary */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                  Total Antrean
                </p>
                <p className="text-xs sm:text-sm font-black text-foreground">{queueInfo?.totalQueued || 0} file</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  queueInfo?.isWorkerActive
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                }`}
              >
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                  Status Worker
                </p>
                <p className="text-xs sm:text-sm font-black text-foreground truncate">
                  {queueInfo?.isWorkerActive ? "Sedang Bekerja" : "Standby / Siap"}
                </p>
              </div>
            </div>
          </div>

          {/* Active Job Highlight */}
          {activeJob && (
            <div className="p-4 rounded-xl border border-primary/30 bg-primary-subtle/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                    {activeJob.status === "queued" ? "Dalam Antrean" : "Sedang Diproses"}
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-primary">{activeJob.progress}%</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{activeJob.fileName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {activeJob.status === "queued"
                      ? `Menunggu giliran (posisi #${activeJob.queuePosition || 1} di antrean)`
                      : activeJob.message || "Memproses..."}
                  </p>
                </div>
                <button
                  onClick={() => onOpenTerminal(activeJob.jobId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-hover transition shrink-0"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Terminal Log
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-300"
                  style={{ width: `${Math.max(5, activeJob.progress)}%` }}
                />
              </div>
            </div>
          )}

          {/* History List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Daftar Riwayat & Antrean Upload
              </h4>
              {(queueInfo?.totalQueued || 0) > 0 && (
                <button
                  onClick={handleClearQueue}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition"
                >
                  Kosongkan Antrean ({queueInfo?.totalQueued})
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs">Memuat antrean & riwayat...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-8 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center p-6">
                <FileText className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-bold text-foreground">Belum Ada Riwayat Upload</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  File yang Anda import akan otomatis tercatat dan terlihat antreannya di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {jobs.map((item) => {
                  const isDone = item.status === "complete";
                  const isFail = item.status === "failed";
                  const isRunning = item.status === "processing" || item.status === "queued";

                  return (
                    <div
                      key={item.jobId}
                      className="p-3.5 rounded-xl border border-border bg-surface hover:border-border/80 transition flex items-center justify-between gap-3 shadow-subtle"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isDone
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : isFail
                                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          }`}
                        >
                          {isDone && <CheckCircle2 className="w-4 h-4" />}
                          {isFail && <AlertCircle className="w-4 h-4" />}
                          {isRunning && <Clock className="w-4 h-4 animate-pulse" />}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate max-w-[240px] sm:max-w-[340px]">
                            {item.fileName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground flex-wrap">
                            <span>
                              {item.createdAt
                                ? new Date(item.createdAt).toLocaleString("id-ID", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })
                                : "-"}
                            </span>
                            <span>•</span>
                            {isDone && (
                              <span className="text-emerald-500 font-semibold">Selesai ({item.fieldCount} butir)</span>
                            )}
                            {isFail && (
                              <span className="text-rose-500 font-semibold truncate max-w-[150px]">
                                {item.error || "Gagal"}
                              </span>
                            )}
                            {isRunning && (
                              <span className="text-amber-500 font-semibold">
                                {item.status === "queued" ? `Antrean #${item.queuePosition || 1}` : "Diproses"} (
                                {item.progress}%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isDone && (
                          <button
                            onClick={() => handleApplyFromHistory(item.jobId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-primary text-white hover:bg-primary-hover transition"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Terapkan
                          </button>
                        )}
                        <button
                          onClick={() => onOpenTerminal(item.jobId)}
                          title="Lihat Terminal Log"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
                        >
                          <Terminal className="w-4 h-4" />
                        </button>
                        {item.status === "queued" && (
                          <button
                            onClick={() => handleCancelJob(item.jobId)}
                            title="Batalkan dari antrean"
                            className="p-1.5 rounded-md text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-border bg-surface-subtle/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
