"use client";

import { CheckCircle2, FileText, MinusCircle, XCircle } from "lucide-react";
import { AnswerBadge } from "./answer-badge";

/** Rekap jawaban: membaca hasil tanpa menggulir seluruh butir. */
export function AnswerTally({ tally }: { tally: { sesuai: number; tidak: number; na: number; kosong: number } }) {
  const items = [
    { label: "Sesuai", value: tally.sesuai, accent: "#00A876", Icon: CheckCircle2 },
    { label: "Tidak Sesuai", value: tally.tidak, accent: "#E15A4F", Icon: XCircle },
    { label: "Tidak Berlaku", value: tally.na, accent: undefined, Icon: MinusCircle },
    { label: "Belum Diisi", value: tally.kosong, accent: undefined, Icon: FileText },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map((s) => {
        const SIcon = s.Icon;
        return (
          <div
            key={s.label}
            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] min-w-0"
          >
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: s.accent ? `${s.accent}22` : "hsl(var(--muted))",
                color: s.accent || "hsl(var(--muted-foreground))",
              }}
            >
              <SIcon className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <span className="block text-[15px] font-black tabular-nums leading-none text-[hsl(var(--foreground))]">
                {s.value}
              </span>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Butir "Tidak Sesuai" didahulukan dari daftar panjang. */
export function TemuanList({ temuan }: { temuan: any[] }) {
  if (temuan.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[#E15A4F]/30 bg-[#E15A4F]/5 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#E15A4F]/20 flex items-center gap-2">
        <XCircle className="w-3.5 h-3.5 text-[#E15A4F]" />
        <h3 className="text-[12px] font-black uppercase tracking-wider text-[#E15A4F]">
          Temuan — {temuan.length} butir tidak sesuai
        </h3>
      </div>
      <ul className="divide-y divide-[#E15A4F]/15">
        {temuan.map((f: any) => (
          <li key={f.id} className="px-4 py-2.5 flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E15A4F] shrink-0 mt-1.5" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[hsl(var(--foreground))] leading-snug">{f.pertanyaan}</p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                {f.grup || "Komponen Pemeriksaan"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Daftar butir per bagian, dengan badge jawaban masing-masing. */
export function ChecklistGroups({
  groups,
  values,
  onPreviewPhoto,
}: {
  groups: { grup: string; items: any[] }[];
  values: any[];
  onPreviewPhoto: (url: string) => void;
}) {
  const byFieldId = new Map<number, any>();
  for (const v of values || []) byFieldId.set(v.fieldId, v);

  return (
    <div className="space-y-4">
      {groups.map((grp) => (
        <section
          key={grp.grup}
          className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-subtle"
        >
          <div className="px-4 py-3 bg-[hsl(var(--muted))]/50 border-b border-[hsl(var(--border))] flex items-center justify-between gap-3">
            <h3 className="text-[13px] font-black text-[hsl(var(--foreground))]">{grp.grup}</h3>
            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] shrink-0">
              {grp.items.length} butir
            </span>
          </div>

          <ul className="divide-y divide-[hsl(var(--border))]">
            {grp.items.map((f: any, idx: number) => (
              <li
                key={f.id}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[hsl(var(--muted))]/10 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span
                    aria-hidden="true"
                    className="w-6 h-6 rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 tabular-nums"
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] sm:text-[13px] font-semibold text-[hsl(var(--foreground))] leading-snug">
                      {f.pertanyaan}
                    </p>
                    {String(f.tipe).toUpperCase() !== "BOOLEAN" && (
                      <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] block mt-0.5">
                        Tipe: {f.tipe}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 sm:text-right">
                  <AnswerBadge field={f} value={byFieldId.get(f.id)} onPreviewPhoto={onPreviewPhoto} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function EmptyChecklist() {
  return (
    <div role="status" className="border border-dashed border-[hsl(var(--border))] rounded-2xl p-10 text-center">
      <FileText className="w-8 h-8 text-[hsl(var(--muted-foreground))]/40 mx-auto" />
      <p className="text-[13px] font-bold text-[hsl(var(--foreground))] mt-3">Tidak Ada Butir Penilaian</p>
      <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">
        Formulir pemeriksaan ini tidak memuat butir yang dapat ditampilkan.
      </p>
    </div>
  );
}
