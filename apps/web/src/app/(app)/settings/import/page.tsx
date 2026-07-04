"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ChevronLeft, FileText, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";

const JENIS_OPTIONS = [
  { value: "tpp", label: "TPP (Tempat Pengelolaan Pangan)" },
  { value: "spal", label: "SPAL (Sarana Pembuangan Air Limbah)" },
  { value: "sab", label: "SAB (Sarana Air Bersih)" },
  { value: "jamban", label: "Jamban" },
  { value: "ttu", label: "TTU (Tempat-Tempat Umum)" },
  { value: "rumah", label: "Rumah Sehat" },
];

const BULAN_NAMES = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function ImportSettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [jenis, setJenis] = useState("tpp");
  const [dynamicCatCode, setDynamicCatCode] = useState("");
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ imported: number; message: string } | null>(null);

  const { data: dynamicCategories = [] } = useQuery({
    queryKey: ["laporan-categories"],
    queryFn: async () => {
      const res = await fetch("/api/laporan/categories");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Pilih file terlebih dahulu");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bulan", String(bulan));
      formData.append("tahun", String(tahun));
      const endpoint = dynamicCatCode ? `/api/import/dynamic` : `/api/import/${jenis}`;
      if (dynamicCatCode) formData.append("categoryCode", dynamicCatCode);
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import gagal");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      setFile(null);
      toast.success(`${data.imported} data berhasil diimport`);
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.match(/\.xlsx?$/i)) {
      setFile(dropped);
      setResult(null);
    } else {
      toast.error("Hanya file .xlsx atau .xls yang diterima");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="w-full mx-auto pb-4 space-y-4 fade-in">
      {/* HEADER */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-[var(--text-xs)] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest hover:text-[hsl(var(--foreground))] transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Pengaturan
      </Link>

      {/* Page Header */}
      <PageHeader
        title="Import Data Excel"
        eyebrow="Data Import"
        icon={<Upload className="w-3 h-3" />}
        description="Upload data laporan dari file Excel (.xlsx) secara massal."
      />

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left -- Config */}
        <div className="space-y-6">
          <div className="card-shell">
            <div className="card-inner space-y-5">
              <span className="eyebrow">Konfigurasi Import</span>

              {/* Mode */}
              <div className="space-y-2">
                <label className="text-[var(--text-xs)] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
                  Mode Import
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setDynamicCatCode("");
                      setJenis("tpp");
                    }}
                    className={`flex-1 h-11 text-[var(--text-xs)] font-bold transition-all duration-200 ${
                      !dynamicCatCode
                        ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                        : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]"
                    }`}
                  >
                    Static (Legacy)
                  </button>
                  <button
                    onClick={() => setDynamicCatCode(dynamicCategories[0]?.code || "")}
                    className={`flex-1 h-11 text-[var(--text-xs)] font-bold transition-all duration-200 ${
                      dynamicCatCode
                        ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                        : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]"
                    }`}
                  >
                    Dynamic (New)
                  </button>
                </div>
              </div>

              {/* Dynamic category select */}
              {dynamicCatCode && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[var(--text-xs)] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
                    Kategori Dynamic
                  </label>
                  <select
                    value={dynamicCatCode}
                    onChange={(e) => setDynamicCatCode(e.target.value)}
                    className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors appearance-none"
                  >
                    {dynamicCategories.map((c: any) => (
                      <option key={c.code} value={c.code}>
                        {c.icon} {c.nama}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Static jenis select */}
              {!dynamicCatCode && (
                <div className="space-y-2">
                  <label className="text-[var(--text-xs)] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
                    Jenis Data
                  </label>
                  <select
                    value={jenis}
                    onChange={(e) => setJenis(e.target.value)}
                    className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors appearance-none"
                  >
                    {JENIS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bulan */}
              <div className="space-y-2">
                <label className="text-[var(--text-xs)] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
                  Bulan
                </label>
                <select
                  value={bulan}
                  onChange={(e) => setBulan(Number(e.target.value))}
                  className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors appearance-none"
                >
                  {BULAN_NAMES.slice(1).map((nama, i) => (
                    <option key={i + 1} value={i + 1}>
                      {nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tahun */}
              <div className="space-y-2">
                <label className="text-[var(--text-xs)] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
                  Tahun
                </label>
                <input
                  type="number"
                  value={tahun}
                  onChange={(e) => setTahun(Number(e.target.value))}
                  className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors"
                  min={2020}
                  max={2100}
                />
              </div>
            </div>
          </div>

          {/* Format info */}
          <div className="card-accent">
            <div className="card-accent-inner space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[hsl(var(--accent))]" />
                <span className="text-[var(--text-xs)] font-bold text-[hsl(var(--accent))] uppercase tracking-widest">
                  Format File
                </span>
              </div>
              <ul className="space-y-2 text-[var(--text-xs)] font-medium text-[hsl(var(--muted-foreground))]">
                <li className="flex items-start gap-2">
                  <span className="text-[hsl(var(--accent))] mt-0.5 shrink-0">\u2022</span> File harus berformat .xlsx
                  atau .xls
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[hsl(var(--accent))] mt-0.5 shrink-0">\u2022</span> Ukuran maksimal 5MB
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[hsl(var(--accent))] mt-0.5 shrink-0">\u2022</span> Kolom pertama: No / Urutan
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[hsl(var(--accent))] mt-0.5 shrink-0">\u2022</span> Kolom kedua: Nama Puskesmas
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[hsl(var(--accent))] mt-0.5 shrink-0">\u2022</span> Kolom berikutnya: Data per
                  jenis sarana
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[hsl(var(--accent))] mt-0.5 shrink-0">\u2022</span> Nama puskesmas harus persis
                  sama dengan data master
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right -- Upload & Result */}
        <div className="lg:col-span-2 space-y-6">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileRef.current?.click()}
            className={`border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
              dragOver
                ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent-light))]"
                : file
                  ? "border-[hsl(var(--accent)/0.4)] bg-[hsl(var(--accent-light)/0.5)] cursor-default"
                  : "border-[hsl(var(--border))] hover:border-[hsl(var(--accent)/0.3)] hover:bg-[hsl(var(--muted))]"
            }`}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />

            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-[hsl(var(--accent-light))] border border-[hsl(var(--accent)/0.3)] flex items-center justify-center">
                  <FileText className="w-7 h-7 text-[hsl(var(--accent))]" />
                </div>
                <div>
                  <p className="font-bold text-[hsl(var(--foreground))] text-[var(--text-sm)]">{file.name}</p>
                  <p className="text-[var(--text-xs)] text-[hsl(var(--muted-foreground))] mt-1">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setResult(null);
                  }}
                  className="flex items-center gap-1.5 text-[var(--text-xs)] font-bold text-[hsl(var(--error))] hover:opacity-80 transition-opacity mt-1"
                >
                  <X className="w-3.5 h-3.5" /> Hapus File
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center">
                  <Upload className="w-7 h-7 text-[hsl(var(--muted-foreground))]" />
                </div>
                <div>
                  <p className="font-bold text-[hsl(var(--foreground))] text-[var(--text-sm)]">
                    Drag & drop file di sini
                  </p>
                  <p className="text-[var(--text-xs)] text-[hsl(var(--muted-foreground))] mt-1">
                    atau klik untuk pilih file .xlsx
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className="card-accent animate-in fade-in slide-in-from-bottom-4">
              <div className="card-accent-inner flex items-start gap-4">
                <CheckCircle2 className="w-5 h-5 text-[hsl(var(--accent))] mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-[hsl(var(--foreground))] text-[var(--text-sm)]">Import Berhasil</p>
                  <p className="text-[var(--text-xs)] text-[hsl(var(--muted-foreground))] mt-1">{result.message}</p>
                  <p className="text-[var(--text-xs)] text-[hsl(var(--accent))] mt-1 font-medium">
                    Periode: {BULAN_NAMES[bulan]} {tahun} \u2014 Jenis:{" "}
                    {JENIS_OPTIONS.find((j) => j.value === jenis)?.label}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit button */}
          <div className="flex justify-end">
            <button
              onClick={() => importMutation.mutate()}
              disabled={!file || importMutation.isPending}
              className="h-9 px-4 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--accent))] hover:text-white transition-colors h-11 px-8"
            >
              {importMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengimport...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Mulai Import
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
