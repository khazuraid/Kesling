"use client";

import { AlertCircle, Check, CheckCircle2, Clock, Copy, FileText, Loader2, Minimize2, Terminal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
}

export interface ImportJobState {
  jobId: string;
  fileName: string;
  status: "queued" | "processing" | "complete" | "failed";
  progress: number;
  message: string;
  queuePosition?: number;
  totalQueued?: number;
  logs?: LogEntry[];
  result?: any;
  error?: string;
}

interface ImportInspectionModalProps {
  open: boolean;
  job: ImportJobState | null;
  onClose: () => void;
  onMinimize: () => void;
  onApplyResult: (result: any) => void;
}

export function ImportInspectionModal({ open, job, onClose, onMinimize, onApplyResult }: ImportInspectionModalProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (open && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, job?.logs?.length]);

  if (!open || !job) return null;

  const isQueued = job.status === "queued";
  const isProcessing = job.status === "processing";
  const isComplete = job.status === "complete";
  const isFailed = job.status === "failed";

  const handleCopyLogs = () => {
    if (!job.logs?.length) return;
    const text = job.logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Log disalin ke clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const fieldCount = job.result?.fields?.length || 0;
  const grupCount = new Set((job.result?.fields || []).map((f: any) => f.grup || "Umum")).size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/50 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-[#00A876]/10 border border-[#00A876]/20 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#00A876]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[hsl(var(--foreground))] truncate">
                  Import Template: {job.fileName}
                </h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                    isComplete
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : isFailed
                        ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        : isProcessing
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse"
                          : "bg-sky-500/10 text-sky-500 border border-sky-500/20"
                  }`}
                >
                  {isComplete ? "Selesai" : isFailed ? "Gagal" : isProcessing ? "Memproses" : "Dalam Antrean"}
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                ID Job: <span className="font-mono text-[11px]">{job.jobId.slice(0, 8)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onMinimize}
              title="Jalankan di latar belakang"
              className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Tutup dialog"
              className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status & Queue Info Banner */}
        <div className="px-5 py-3.5 bg-[hsl(var(--muted))]/20 border-b border-[hsl(var(--border))] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {isProcessing && <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />}
            {isQueued && <Clock className="w-3.5 h-3.5 text-sky-500" />}
            {isComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            {isFailed && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
            <span className="font-semibold text-[hsl(var(--foreground))]">{job.message || "Menunggu proses..."}</span>
          </div>

          {isQueued && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[11px] font-medium">
              <span>Posisi Antrean: #{job.queuePosition || 1}</span>
              <span className="text-sky-500/50">•</span>
              <span>Total Antre: {job.totalQueued || 1}</span>
            </div>
          )}

          <div className="text-[11px] text-[hsl(var(--muted-foreground))]">Server 2C 8GB • Concurrency: 1 Worker</div>
        </div>

        {/* Progress Bar */}
        <div className="px-5 pt-3">
          <div className="flex items-center justify-between text-xs font-semibold mb-1 text-[hsl(var(--muted-foreground))]">
            <span>Progres Ekstraksi</span>
            <span className="font-mono text-[hsl(var(--foreground))]">{job.progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isComplete
                  ? "bg-emerald-500"
                  : isFailed
                    ? "bg-rose-500"
                    : "bg-gradient-to-r from-emerald-500 to-lime-400"
              }`}
              style={{ width: `${Math.max(5, job.progress)}%` }}
            />
          </div>
        </div>

        {/* Completed Result Card */}
        {isComplete && job.result && (
          <div className="mx-5 mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Ekstraksi Berhasil
                </h4>
                <p className="text-xs text-[hsl(var(--foreground))] font-semibold mt-1">{job.result.nama}</p>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  Terdeteksi {fieldCount} butir pemeriksaan terbagi dalam {grupCount} kelompok area.
                </p>
              </div>
              <button
                onClick={() => onApplyResult(job.result)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#BEF264] text-[#06281E] text-xs font-black uppercase tracking-wider hover:brightness-105 transition shadow-lg shadow-lime-500/20 shrink-0"
              >
                <Check className="w-3.5 h-3.5" /> Terapkan ke Form
              </button>
            </div>
          </div>
        )}

        {/* Error Alert Card */}
        {isFailed && (
          <div className="mx-5 mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs">
            <h4 className="font-bold text-rose-400 flex items-center gap-1.5 mb-1">
              <AlertCircle className="w-4 h-4" /> Proses Gagal
            </h4>
            <p className="text-[hsl(var(--muted-foreground))] leading-relaxed font-mono text-[11px]">
              {job.error || "Gagal memproses file pada worker. Silakan periksa log di bawah."}
            </p>
          </div>
        )}

        {/* Live Terminal Log Viewer */}
        <div className="p-5 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Live Terminal Log
              </span>
              {(isProcessing || isQueued) && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </div>
            <button
              onClick={handleCopyLogs}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition"
            >
              <Copy className="w-3 h-3" />
              {copied ? "Tersalin!" : "Salin Log"}
            </button>
          </div>

          <div className="flex-1 min-h-[160px] max-h-[240px] rounded-xl bg-[#080D0B] border border-white/10 p-3 overflow-y-auto font-mono text-[11px] text-zinc-300 leading-relaxed space-y-1 select-text scrollbar-thin">
            {!job.logs || job.logs.length === 0 ? (
              <div className="text-zinc-600 italic py-4 text-center">Menunggu log dari worker...</div>
            ) : (
              job.logs.map((log, index) => {
                const isErr = log.level === "error";
                const isWarn = log.level === "warn";
                const isOk = log.level === "success";

                return (
                  <div key={index} className="flex items-start gap-2 break-all">
                    <span className="text-zinc-500 select-none text-[10px] shrink-0 pt-0.5">
                      {log.timestamp || "--:--:--"}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1 rounded select-none shrink-0 pt-0.5 ${
                        isErr
                          ? "bg-rose-950 text-rose-400 border border-rose-800"
                          : isWarn
                            ? "bg-amber-950 text-amber-400 border border-amber-800"
                            : isOk
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {log.level.toUpperCase()}
                    </span>
                    <span
                      className={`flex-1 ${
                        isErr
                          ? "text-rose-300"
                          : isWarn
                            ? "text-amber-200"
                            : isOk
                              ? "text-emerald-300 font-semibold"
                              : "text-zinc-300"
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]/50 flex items-center justify-between gap-3 text-xs">
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            {(isProcessing || isQueued) && "Bisa diminimize untuk lanjut menggunakan fitur lain."}
          </p>

          <div className="flex items-center gap-2">
            {(isProcessing || isQueued) && (
              <button
                onClick={onMinimize}
                className="px-3.5 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition font-semibold"
              >
                Jalankan di Latar Belakang
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/80 transition font-semibold"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
