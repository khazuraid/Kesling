"use client";

export function ExportButton({
  jenis,
  bulan,
  tahun,
  puskesmasId,
}: {
  jenis: string;
  bulan: number;
  tahun: number;
  puskesmasId?: number;
}) {
  const params = new URLSearchParams({ bulan: String(bulan), tahun: String(tahun) });
  if (puskesmasId) params.set("puskesmasId", String(puskesmasId));

  const href = jenis === "dynamic" ? `/api/export/dynamic?${params}` : `/api/export/${jenis}?${params}`;

  return (
    <a
      href={href}
      className="h-9 px-4 bg-transparent border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))] transition-colors h-11 px-4 text-sm font-bold flex items-center gap-2"
    >
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
      Export Excel
    </a>
  );
}
