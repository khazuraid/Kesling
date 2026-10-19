"use client";

import { AlertCircle, CheckCircle2, Clock, Loader2, Maximize2, X } from "lucide-react";
import type { ImportJobState } from "./import-inspection-modal";

interface ImportFloatingWidgetProps {
  job: ImportJobState | null;
  onOpenModal: () => void;
  onDismiss: () => void;
}

export function ImportFloatingWidget({ job, onOpenModal, onDismiss }: ImportFloatingWidgetProps) {
  if (!job) return null;

  const isQueued = job.status === "queued";
  const isProcessing = job.status === "processing";
  const isComplete = job.status === "complete";
  const isFailed = job.status === "failed";

  return (
    <div className="fixed bottom-5 right-5 z-40 max-w-sm w-full sm:w-auto animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-surface border border-border rounded-card shadow-float p-3.5 flex items-center gap-3 backdrop-blur-md">
        {/* Status Icon */}
        <div
          onClick={onOpenModal}
          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
            isComplete
              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
              : isFailed
                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                : isProcessing
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  : "bg-sky-500/10 text-sky-500 border border-sky-500/20"
          }`}
        >
          {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
          {isQueued && <Clock className="w-5 h-5 animate-pulse" />}
          {isComplete && <CheckCircle2 className="w-5 h-5" />}
          {isFailed && <AlertCircle className="w-5 h-5" />}
        </div>

        {/* Content */}
        <div onClick={onOpenModal} className="min-w-0 flex-1 cursor-pointer pr-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-foreground truncate max-w-[180px]">{job.fileName}</p>
            <span className="text-[10px] font-mono text-muted-foreground">{job.progress}%</span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
            {isQueued
              ? `Antrean #${job.queuePosition || 1}`
              : isProcessing
                ? job.message || "Memproses..."
                : isComplete
                  ? "Selesai! Klik untuk buka"
                  : "Gagal memproses"}
          </p>

          {/* Mini progress bar */}
          <div className="w-full h-1 rounded-full bg-muted mt-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
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

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenModal}
            title="Buka detail & terminal log"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDismiss}
            title="Tutup"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
