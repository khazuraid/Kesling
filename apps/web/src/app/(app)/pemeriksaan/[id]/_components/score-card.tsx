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
  const SW = 8;
  // Ujung bulat (strokeLinecap="round") memperpanjang busur setengah tebal
  // garis di tiap ujungnya, jadi busur 92,8% tergambar seperti ~96% dan
  // angkanya tidak cocok dengan bentuknya. Panjang busur dikurangi dulu
  // sebesar dua ujung itu supaya yang terlihat persis sebesar skornya.
  const arcLength = pct > 0 ? Math.max(0.5, (pct / 100) * C - SW) : 0;
  const arcOffset = C - arcLength;
  // Bidang kosong di dalam cincin hanya 100 - 2*SW dari lebar kotak, jadi
  // teks hidup di kotak yang lebih kecil dari gauge-nya. 0,74 menyisakan
  // jarak aman dari cincin tanpa membuat angkanya mengecil.
  const GAUGE_CLEAR = 0.74;
  const accentClass = scoreData.pass ? "text-success" : "text-error";
  const accentStroke = scoreData.pass ? "var(--color-success)" : "var(--color-error)";
  const accentBg = scoreData.pass ? "bg-success" : "bg-error";

  return (
    <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl bg-surface border border-border shadow-subtle">
      {/* Rail warna skor di atas */}
      <span className={`absolute inset-x-0 top-0 h-1.5 ${accentBg}`} aria-hidden="true" />

      <div className="flex items-center gap-5 sm:gap-6">
        {/* Gauge SVG besar */}
        <div className="relative w-[112px] h-[112px] sm:w-[132px] sm:h-[132px] shrink-0 [container-type:inline-size]">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor" strokeWidth={SW} className="text-muted" />
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={accentStroke}
              strokeWidth={SW}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={arcOffset}
              style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
            />
          </svg>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ padding: `${((1 - GAUGE_CLEAR) / 2) * 100}%` }}
          >
            <span
              className={`font-black tabular-nums leading-none whitespace-nowrap ${accentClass}`}
              // 20cqw menyisakan ~15px jarak ke cincin di kotak 112px dan
              // ~20px di 132px. Di 22cqw sisanya cuma 8px — masih mepet.
              style={{ fontSize: "clamp(17px, 20cqw, 28px)" }}
            >
              {scoreData.valueText}
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground mt-1">
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
