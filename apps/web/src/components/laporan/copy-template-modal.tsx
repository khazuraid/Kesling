"use client";

import { ArrowDown, Building2, Calendar, Copy } from "lucide-react";
import { Modal } from "@/components/ui/modal";

// ─── Component Props ───────────────────────────────────────────────────

interface CopyTemplateModalProps {
  open: boolean;
  onClose: () => void;
  categoryNama?: string;
  isOperator: boolean;
  copyPuskesmasId: number;
  setCopyPuskesmasId: (id: number) => void;
  copyBulanFrom: number;
  setCopyBulanFrom: (bulan: number) => void;
  copyTahunFrom: number;
  setCopyTahunFrom: (tahun: number) => void;
  bulan: number;
  tahun: number;
  puskesmasList: any[];
  copyMutation: {
    isPending: boolean;
    mutate: () => void;
  };
}

const BULAN_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function CopyTemplateModal({
  open,
  onClose,
  categoryNama,
  isOperator,
  copyPuskesmasId,
  setCopyPuskesmasId,
  copyBulanFrom,
  setCopyBulanFrom,
  copyTahunFrom,
  setCopyTahunFrom,
  bulan,
  tahun,
  puskesmasList,
  copyMutation,
}: CopyTemplateModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Salin Data Bulan Lalu"
      description={`Salin data ${categoryNama} dari periode sebelumnya`}
      icon={<Copy className="w-4.5 h-4.5" />}
      size="sm"
      variant="hero"
      footer={
        <>
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => copyMutation.mutate()}
            disabled={copyMutation.isPending || (!isOperator && !copyPuskesmasId)}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-primary text-white text-[11px] font-extrabold uppercase tracking-wider hover:bg-primary-hover transition shadow-subtle disabled:opacity-50 cursor-pointer"
          >
            {copyMutation.isPending ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copyMutation.isPending ? "Menyalin..." : "Salin Data"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {!isOperator && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-card border border-border bg-surface shadow-subtle">
            <div className="w-9 h-9 rounded-xl bg-primary-subtle flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Puskesmas</p>
              <select
                value={copyPuskesmasId || ""}
                onChange={(e) => setCopyPuskesmasId(Number(e.target.value))}
                className="w-full h-7 bg-transparent border-0 text-[14px] font-bold text-foreground outline-none appearance-none cursor-pointer"
              >
                <option value="">Pilih Puskesmas</option>
                {puskesmasList.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Source period */}
        <div className="px-4 py-3.5 rounded-card border border-border bg-surface shadow-subtle">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5 mb-2.5">
            <Calendar className="w-3 h-3 text-primary" /> Periode Asal
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <select
              value={copyBulanFrom}
              onChange={(e) => setCopyBulanFrom(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-button bg-surface-subtle border border-border text-[13px] font-bold text-foreground outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
            >
              {BULAN_NAMES.map((b, i) => (
                <option key={i + 1} value={i + 1}>
                  {b}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={copyTahunFrom}
              onChange={(e) => setCopyTahunFrom(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-button bg-surface-subtle border border-border text-[13px] font-bold text-foreground outline-none focus:border-primary transition-colors tabular-nums"
              min={2020}
              max={2100}
            />
          </div>
        </div>

        {/* Arrow + target */}
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-card bg-primary-subtle border border-primary/20">
          <span className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <ArrowDown className="w-4 h-4 text-primary" />
          </span>
          <div className="text-[12px]">
            <span className="text-muted-foreground font-semibold">Salin ke: </span>
            <span className="font-extrabold text-foreground">
              {BULAN_NAMES[bulan - 1]} {tahun}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
