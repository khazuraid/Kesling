"use client";

import { CheckCircle2, XCircle } from "lucide-react";

export interface ScoreData {
  pass: boolean;
  gained: number;
  max: number;
  percentValue: number;
  valueText: string;
  statusText: string;
  thresh: number;
  op: string;
}

/** Kartu skor + gauge SVG. Accent menggunakan token CSS supaya dark mode konsisten. */
export function ScoreCard({ scoreData }: { scoreData: ScoreData }) {
  const pct = Math.min(100, Math.max(0, scoreData.percentValue || 0));
  const R = 42;
  const C = 2 * Math.PI * R;
  const accentClass = scoreData.pass ? "text-success" : "text-error";
  const accentStroke = scoreData.pass ? "var(--color-success)" : "var(--color-error)";
  const accentBg = scoreData.pass ? "bg-success" : "bg-error";

  return (
    <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl bg-surface border border-border shadow-subtle">
      {/* Rail warna skor di atas */}
      <span className={`absolute inset-x-0 top-0 h-1.5 ${accentBg}`} aria-hidden="true" />

      <div className="flex items-center gap-5 sm:gap-6">
        {/* Gauge SVG besar */}
        <div className="relative w-[96px] h-[96px] sm:w-[108px] sm:h-[108px] shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor" strokeWidth="9" className="text-muted" />
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={accentStroke}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-[21px] sm:text-[24px] font-black tabular-nums leading-none ${accentClass}`}>
              {scoreData.valueText}
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground mt-1">
              Skor
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide text-white ${accentBg}`}
          >
            {scoreData.pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {scoreData.statusText}
          </span>

          <div className="space-y-1.5">
            <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: accentStroke }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground gap-2">
              <span className="tabular-nums">
                Perolehan: <strong className="text-foreground font-black">{scoreData.gained}</strong> / {scoreData.max}{" "}
                Poin
              </span>
              <span className="tabular-nums shrink-0">
                Batas {scoreData.op} {scoreData.thresh}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
