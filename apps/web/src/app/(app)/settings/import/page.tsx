"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ChevronLeft, FileText, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
    <div className="w-full fade-in min-h-screen bg-canvas">
      {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
      <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Pengaturan
              </Link>
              <span className="text-muted-foreground/40">•</span>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary">Import Data</p>
            </div>
            <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-none text-foreground">
              Import Excel
            </h1>
            <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-2">
              Upload formulir dan data capaian dari berkas Excel (.xlsx / .xls) secara massal
            </p>
          </div>
        </div>
      </div>

      {/* ── CONTENT BODY (CANVAS) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left -- Config */}
          <div className="space-y-6">
            <Card className="p-5 space-y-4 shadow-subtle">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Konfigurasi Import
              </span>

              {/* Mode */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Mode Import
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={!dynamicCatCode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDynamicCatCode("");
                      setJenis("tpp");
                    }}
                    className="h-10 text-[11px] font-bold"
                  >
                    Static (Legacy)
                  </Button>
                  <Button
                    type="button"
                    variant={dynamicCatCode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDynamicCatCode(dynamicCategories[0]?.code || "")}
                    className="h-10 text-[11px] font-bold"
                  >
                    Dynamic (New)
                  </Button>
                </div>
              </div>

              {/* Dynamic category select */}
              {dynamicCatCode && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Kategori Dynamic
                  </label>
                  <select
                    value={dynamicCatCode}
                    onChange={(e) => setDynamicCatCode(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-[12px] font-medium text-foreground outline-none focus:border-primary shadow-subtle transition-all cursor-pointer"
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
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Jenis Data
                  </label>
                  <select
                    value={jenis}
                    onChange={(e) => setJenis(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-[12px] font-medium text-foreground outline-none focus:border-primary shadow-subtle transition-all cursor-pointer"
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
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bulan</label>
                <select
                  value={bulan}
                  onChange={(e) => setBulan(Number(e.target.value))}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-[12px] font-medium text-foreground outline-none focus:border-primary shadow-subtle transition-all cursor-pointer"
                >
                  {BULAN_NAMES.slice(1).map((nama, i) => (
                    <option key={i + 1} value={i + 1}>
                      {nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tahun */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tahun</label>
                <Input
                  type="number"
                  value={tahun}
                  onChange={(e) => setTahun(Number(e.target.value))}
                  className="h-10"
                  min={2020}
                  max={2100}
                />
              </div>
            </Card>

            {/* Format info */}
            <Card className="bg-primary-subtle/50 border-primary/20 shadow-subtle p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Format File Excel</span>
              </div>
              <ul className="space-y-2 text-[11px] font-medium text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span> File harus berformat .xlsx atau .xls
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span> Ukuran maksimal file 5MB
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span> Kolom pertama: No / Urutan
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span> Kolom kedua: Nama Puskesmas
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span> Kolom berikutnya: Data per jenis sarana
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span> Nama puskesmas harus persis sama dengan data
                  master
                </li>
              </ul>
            </Card>
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
              className={`rounded-card border-2 border-dashed p-10 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                dragOver
                  ? "border-primary bg-primary-subtle/60 shadow-md ring-2 ring-primary/20"
                  : file
                    ? "border-primary/40 bg-primary-subtle/30 shadow-subtle cursor-default"
                    : "border-border bg-surface hover:border-primary/50 hover:bg-surface-hover shadow-subtle"
              }`}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />

              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary-subtle border border-primary/20 flex items-center justify-center text-primary shadow-subtle">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-[14px]">{file.name}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{formatBytes(file.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setResult(null);
                    }}
                    className="gap-1.5 text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-3.5 h-3.5" /> Hapus File
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-surface-subtle border border-border flex items-center justify-center text-muted-foreground shadow-subtle">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-[14px]">Drag & drop file Excel di sini</p>
                    <p className="text-[12px] text-muted-foreground mt-1">atau klik untuk memilih file .xlsx / .xls</p>
                  </div>
                </div>
              )}
            </div>

            {/* Result */}
            {result && (
              <Card className="p-5 shadow-subtle animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-[14px]">Import Berhasil</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{result.message}</p>
                    <p className="text-[11px] text-primary mt-1.5 font-semibold">
                      Periode: {BULAN_NAMES[bulan]} {tahun} — Jenis:{" "}
                      {dynamicCatCode || JENIS_OPTIONS.find((j) => j.value === jenis)?.label}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Submit button */}
            <div className="flex justify-end">
              <Button
                onClick={() => importMutation.mutate()}
                disabled={!file || importMutation.isPending}
                className="gap-2 h-11 px-8 rounded-full uppercase tracking-wider text-[11px] font-bold shadow-subtle"
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
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
