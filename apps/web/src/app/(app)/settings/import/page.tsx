"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const BULAN = [
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
const JENIS = [
  { value: "tpp", label: "TPP" },
  { value: "spal", label: "SPAL" },
  { value: "sab", label: "SAB" },
  { value: "jamban", label: "Jamban" },
  { value: "ttu", label: "TTU" },
];

export default function ImportPage() {
  const [jenis, setJenis] = useState("tpp");
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bulan", String(bulan));
    formData.append("tahun", String(tahun));

    try {
      const res = await fetch(`/api/import/${jenis}`, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Gagal mengimport file");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Import Excel</h1>
      <div className="bg-white border rounded-lg p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Jenis Laporan</label>
            <Select value={jenis} onChange={(e) => setJenis(e.target.value)}>
              {JENIS.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Bulan</label>
              <Select value={bulan} onChange={(e) => setBulan(Number(e.target.value))}>
                {BULAN.map((b, i) => (
                  <option key={b} value={i + 1}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tahun</label>
              <Input type="number" value={tahun} onChange={(e) => setTahun(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">File Excel (.xlsx)</label>
            <Input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <Button type="submit" disabled={!file || loading} className="w-full">
            {loading ? "Mengimport..." : "Import"}
          </Button>
        </form>
      </div>
    </div>
  );
}
