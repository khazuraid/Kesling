"use client";

import { Building2, Compass, MapPin, Phone } from "lucide-react";
import type { SasaranIdentity } from "@/lib/sasaran-meta";

/**
 * Profil sasaran. Sel kontak selalu dirender walau kosong — sebelumnya hilang
 * begitu saja sehingga jumlah sel berubah dan kisi 3 kolom bergeser.
 */
export function SasaranProfileCard({ identity }: { identity: SasaranIdentity }) {
  const cells: { label: string; value: React.ReactNode; className?: string }[] = [
    { label: "Nama Tempat / Sasaran", value: <strong className="font-bold">{identity.nama || "-"}</strong> },
    { label: "Pengelola / Pemilik", value: identity.pemilik || "-" },
    { label: "Jenis Sarana", value: identity.sarana || "-" },
    {
      label: "Kontak / Telepon",
      value: identity.kontak ? (
        <span className="flex items-center gap-1">
          <Phone className="w-3 h-3 text-[#00A876]" /> {identity.kontak}
        </span>
      ) : (
        "-"
      ),
    },
    {
      label: "Alamat",
      className: "sm:col-span-2 md:col-span-3",
      value: (
        <span className="flex items-start gap-1 mt-0.5">
          <MapPin className="w-3.5 h-3.5 text-[#00A876] shrink-0 mt-0.5" />
          {identity.alamat || "-"}
        </span>
      ),
    },
  ];

  if (identity.lat !== null && identity.lng !== null) {
    cells.push({
      label: "Koordinat GPS",
      value: (
        <a
          href={`https://www.google.com/maps?q=${identity.lat},${identity.lng}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`Buka koordinat ${identity.lat}, ${identity.lng} di Google Maps`}
          className="text-[#00A876] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] rounded flex items-center gap-1 font-mono text-[11px] mt-0.5"
        >
          <Compass className="w-3.5 h-3.5 shrink-0" />
          {identity.lat.toFixed(5)}, {identity.lng.toFixed(5)}
        </a>
      ),
    });
  }

  return (
    <div className="p-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 space-y-3">
      <h4 className="text-[12px] font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-2">
        <Building2 className="w-4 h-4 text-[#00A876]" /> Profil Sasaran Pemeriksaan
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-4 text-[13px] [&>div]:min-w-0">
        {cells.map((cell) => (
          <div key={cell.label} className={cell.className}>
            <span className="text-[11px] leading-snug text-[hsl(var(--muted-foreground))] block">{cell.label}</span>
            <span className="text-[hsl(var(--foreground))] font-semibold break-words">{cell.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
