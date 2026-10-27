"use client";

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
    <div className="p-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col justify-between shadow-subtle space-y-4">
      <div>
        <span className={`text-[10px] font-black uppercase tracking-wider block ${eyebrowClass}`}>{eyebrow}</span>
        <h3 className="text-[14px] font-extrabold text-[hsl(var(--foreground))] mt-0.5 break-words">{nama}</h3>
        <p className="text-[11px] text-[hsl(var(--muted-foreground))] break-words">{sub}</p>
      </div>

      <div className="relative h-36 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 flex items-center justify-center p-3 overflow-hidden">
        {signature ? (
          /* biome-ignore lint/performance/noImgElement: direct img prevents next/image runtime crash */
          <img
            src={signatureSrc(signature)}
            alt={`Tanda tangan ${nama}`}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-[11px] text-[hsl(var(--muted-foreground))] italic text-center">{emptyText}</span>
        )}
      </div>

      <div className="pt-2 border-t border-[hsl(var(--border))] text-[11px] text-[hsl(var(--muted-foreground))]">
        {footer}
      </div>
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
        eyebrowClass="text-[#00A876]"
        nama={petugas || "Petugas Pemeriksa"}
        sub={`UPT Puskesmas ${puskesmasNama}`}
        signature={petugasSignature}
        emptyText="Tanda tangan digital belum terlampir"
        footer={
          <>
            Tanggal: <strong className="text-[hsl(var(--foreground))]">{tanggalFormat}</strong>
          </>
        }
      />
      <SignatureCard
        eyebrow="Pengelola / Penanggung Jawab"
        eyebrowClass="text-[hsl(var(--muted-foreground))]"
        nama={pemilik || sasaranNama || "-"}
        sub={`Sasaran: ${sasaranNama || "-"}`}
        signature={pemilikSignature}
        emptyText="Paraf / TTD basah tercantum di berita acara fisik"
        footer={
          <>
            Status: <strong className="text-[#00A876]">Tersimpan Resmi</strong>
          </>
        }
      />
    </div>
  );
}
