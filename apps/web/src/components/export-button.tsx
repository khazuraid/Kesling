"use client";

export function ExportButton({ jenis, bulan, tahun }: { jenis: string; bulan: number; tahun: number }) {
  return (
    <a
      href={`/api/export/${jenis}?bulan=${bulan}&tahun=${tahun}`}
      className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
    >
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
      Excel
    </a>
  );
}
