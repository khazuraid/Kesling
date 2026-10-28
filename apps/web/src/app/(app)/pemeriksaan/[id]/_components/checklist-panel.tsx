"use client";

import { FileText, XCircle } from "lucide-react";
import { AnswerBadge } from "./answer-badge";

/** Butir "Tidak Sesuai" didahulukan dari daftar panjang. */
export function TemuanList({ temuan }: { temuan: any[] }) {
  if (temuan.length === 0) return null;
  return (
    <div className="rounded-2xl border border-error/30 bg-error-light overflow-hidden">
      <div className="px-5 py-3 border-b border-error/20 flex items-center gap-2.5">
        <XCircle className="w-4 h-4 text-error" aria-hidden="true" />
        <h3 className="text-[13px] font-black uppercase tracking-wider text-error">
          Temuan — {temuan.length} butir tidak sesuai
        </h3>
      </div>
      <ul className="divide-y divide-error/15">
        {temuan.map((f: any) => (
          <li key={f.id} className="px-5 py-3.5 flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0 mt-2" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground leading-snug">{f.pertanyaan}</p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
    <div className="space-y-5">
      {groups.map((grp) => (
        <section key={grp.grup} className="rounded-2xl border border-border bg-surface overflow-hidden shadow-subtle">
          <div className="px-5 py-3.5 bg-surface-subtle border-b border-border flex items-center justify-between gap-3">
            <h3 className="text-[14px] font-black text-foreground">{grp.grup}</h3>
            <span className="text-[10px] font-bold text-muted-foreground shrink-0">{grp.items.length} butir</span>
          </div>

          <ul className="divide-y divide-border">
            {grp.items.map((f: any, idx: number) => (
              <li
                key={f.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-subtle/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span
                    aria-hidden="true"
                    className="w-6 h-6 rounded-lg bg-surface-subtle text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 tabular-nums"
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] sm:text-[14px] font-semibold text-foreground leading-snug">
                      {f.pertanyaan}
                    </p>
                    {String(f.tipe).toUpperCase() !== "BOOLEAN" && (
                      <span className="text-[10px] font-medium text-muted-foreground block mt-0.5">Tipe: {f.tipe}</span>
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
    <div role="status" className="border border-dashed border-border rounded-2xl p-10 text-center">
      <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto" />
      <p className="text-[13px] font-bold text-foreground mt-3">Tidak Ada Butir Penilaian</p>
      <p className="text-[12px] text-muted-foreground mt-1">
        Formulir pemeriksaan ini tidak memuat butir yang dapat ditampilkan.
      </p>
    </div>
  );
}
