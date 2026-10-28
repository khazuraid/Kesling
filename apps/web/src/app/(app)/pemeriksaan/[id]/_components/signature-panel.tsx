"use client";

import { PenLine } from "lucide-react";
import { signatureSrc } from "@/lib/inspection-media";

function SignatureCard({
  eyebrow,
  eyebrowClass,
  nama,
  sub,
  signature,
  footer,
  emptyText,
}: {
  eyebrow: string;
  eyebrowClass: string;
  nama: string;
  sub: string;
  signature: string | null;
  footer: React.ReactNode;
  emptyText: string;
}) {
  return (
    <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col justify-between shadow-subtle space-y-4">
      <div>
        <span className={`text-[10px] font-black uppercase tracking-wider block ${eyebrowClass}`}>{eyebrow}</span>
        <h3 className="text-[14px] font-extrabold text-foreground mt-0.5 break-words">{nama}</h3>
        <p className="text-[11px] text-muted-foreground break-words">{sub}</p>
      </div>

      {/* Area tanda tangan — rasio tetap, placeholder bergaris putus-putus */}
      <div className="relative aspect-[3/1.5] rounded-xl border-2 border-dashed border-border bg-surface-subtle flex items-center justify-center p-3 overflow-hidden">
        {signature ? (
          /* biome-ignore lint/performance/noImgElement: direct img prevents next/image runtime crash */
          <img
            src={signatureSrc(signature)}
            alt={`Tanda tangan ${nama}`}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <PenLine className="w-6 h-6 text-muted-foreground/40" aria-hidden="true" />
            <span className="text-[11px] text-muted-foreground italic">{emptyText}</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-border text-[11px] text-muted-foreground">{footer}</div>
    </div>
  );
}

export function SignaturePanel({
  petugas,
  petugasSignature,
  pemilik,
  pemilikSignature,
  sasaranNama,
  puskesmasNama,
  tanggalFormat,
}: {
  petugas: string;
  petugasSignature: string | null;
  pemilik: string;
  pemilikSignature: string | null;
  sasaranNama: string;
  puskesmasNama: string;
  tanggalFormat: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <SignatureCard
        eyebrow="Petugas Pemeriksa Kesling"
        eyebrowClass="text-success"
        nama={petugas || "Petugas Pemeriksa"}
        sub={`UPT Puskesmas ${puskesmasNama}`}
        signature={petugasSignature}
        emptyText="Tanda tangan digital belum terlampir"
        footer={
          <>
            Tanggal: <strong className="text-foreground">{tanggalFormat}</strong>
          </>
        }
      />
      <SignatureCard
        eyebrow="Pengelola / Penanggung Jawab"
        eyebrowClass="text-muted-foreground"
        nama={pemilik || sasaranNama || "-"}
        sub={`Sasaran: ${sasaranNama || "-"}`}
        signature={pemilikSignature}
        emptyText="Paraf / TTD basah tercantum di berita acara fisik"
        footer={
          <>
            Status: <strong className="text-success">Tersimpan Resmi</strong>
          </>
        }
      />
    </div>
  );
}
