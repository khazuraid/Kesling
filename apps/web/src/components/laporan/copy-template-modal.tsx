"use client";

import { ArrowRight, Building2, Calendar, Copy } from "lucide-react";
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
      footer={
        <>
          <button
            onClick={onClose}
            className="h-9 px-5 bg-transparent text-[hsl(var(--muted-foreground))] rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => copyMutation.mutate()}
            disabled={copyMutation.isPending || (!isOperator && !copyPuskesmasId)}
            className="h-9 px-5 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--accent))] hover:text-white transition-colors shadow-sm"
          >
            {copyMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copyMutation.isPending ? "Menyalin..." : "Salin Data"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {!isOperator && (
          <div className="space-y-1.5">
            <label className="stat-label flex items-center gap-1.5">
              <Building2 className="w-3 h-3" />
              Puskesmas
            </label>
            <div className="relative">
              <select
                value={copyPuskesmasId || ""}
                onChange={(e) => setCopyPuskesmasId(Number(e.target.value))}
                className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors appearance-none appearance-none cursor-pointer"
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
        <div className="space-y-1.5">
          <label className="stat-label flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Periode Asal
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <select
                value={copyBulanFrom}
                onChange={(e) => setCopyBulanFrom(Number(e.target.value))}
                className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors appearance-none appearance-none cursor-pointer"
              >
                {BULAN_NAMES.map((b, i) => (
                  <option key={i + 1} value={i + 1}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="number"
              value={copyTahunFrom}
              onChange={(e) => setCopyTahunFrom(Number(e.target.value))}
              className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors"
              min={2020}
              max={2100}
            />
          </div>
        </div>

        {/* Arrow + target */}
        <div className="flex items-center gap-3 p-3.5 rounded-[var(--radius)] bg-[hsl(var(--accent-light)/0.5)] border border-[hsl(var(--accent)/0.12)]">
          <ArrowRight className="w-4 h-4 text-[hsl(var(--accent))] shrink-0" />
          <div className="text-[var(--text-sm)]">
            <span className="text-[hsl(var(--muted-foreground))]">Salin ke: </span>
            <span className="font-bold text-[hsl(var(--foreground))]">
              {BULAN_NAMES[bulan - 1]} {tahun}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
