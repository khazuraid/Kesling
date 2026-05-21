"use client";

import { Fragment, useState } from "react";
import { ExportButton } from "@/components/export-button";
import { LaporanFilter } from "@/components/laporan-filter";
import { Button } from "@/components/ui/button";
import { useLaporanData } from "@/hooks/use-laporan-data";
import { usePuskesmasList } from "@/hooks/use-puskesmas-list";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

const KOMPONEN = [
  { key: "ventilasi", label: "Ventilasi" },
  { key: "penerangan", label: "Penerangan" },
  { key: "lantai", label: "Lantai" },
  { key: "kepadatanHuni", label: "Kpd. Huni" },
  { key: "lubangAsap", label: "Lub. Asap" },
  { key: "jamban", label: "Jamban" },
  { key: "airBersih", label: "Air Bersih" },
  { key: "airLimbah", label: "Air Limbah" },
  { key: "sampah", label: "Sampah" },
  { key: "kandang", label: "Kandang" },
];

export default function LaporanRumahPage() {
  const { data, isLoading, bulan, tahun, submitMutation } = useLaporanData<any>("rumah", "/api/laporan/rumah");
  const { data: puskesmasList = [] } = usePuskesmasList();
  const [showForm, setShowForm] = useState(false);
  useUnsavedChanges(showForm);
  const [form, setForm] = useState<any>({});

  function openForm(pkmId?: number) {
    const id = pkmId || puskesmasList[0]?.id || 0;
    const ex = data.find((d: any) => d.puskesmasId === id);
    setForm({
      puskesmasId: id,
      jumlahRumahAda: ex?.jumlahRumahAda || 0,
      jumlahDiperiksa: ex?.jumlahDiperiksa || 0,
      ...Object.fromEntries(
        KOMPONEN.flatMap((k) => [
          [`${k.key}Ms`, ex?.[`${k.key}Ms`] || 0],
          [`${k.key}Tms`, ex?.[`${k.key}Tms`] || 0],
        ]),
      ),
      kandangTidakAda: ex?.kandangTidakAda || 0,
      hasilMs: ex?.hasilMs || 0,
      hasilTms: ex?.hasilTms || 0,
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMutation.mutate(form);
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Laporan Pemeriksaan Rumah</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{puskesmasList.length} Puskesmas • {data.length} data</p>
        </div>
        <Button onClick={() => openForm()}>+ Input Data</Button>
      </div>

      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <LaporanFilter />
          <ExportButton jenis="rumah" bulan={bulan} tahun={tahun} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider sticky left-0 bg-[hsl(var(--card))] z-10" rowSpan={2}>No</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider sticky left-8 bg-[hsl(var(--card))] z-10" rowSpan={2}>Puskesmas</th>
                <th className="px-2 py-3 text-center text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase" rowSpan={2}>Ada</th>
                <th className="px-2 py-3 text-center text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase" rowSpan={2}>Prk</th>
                {KOMPONEN.map((k) => (
                  <th key={k.key} colSpan={2} className="px-2 py-3 text-center text-[10px] font-semibold text-[hsl(var(--primary))] uppercase tracking-wider border-l border-[hsl(var(--border))]">
                    {k.label}
                  </th>
                ))}
                <th colSpan={2} className="px-2 py-3 text-center text-[10px] font-semibold text-[hsl(var(--primary))] uppercase tracking-wider border-l border-[hsl(var(--border))]">Hasil</th>
              </tr>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                {KOMPONEN.map((k) => (
                  <Fragment key={k.key}>
                    <th className="px-1 py-2 text-center text-[10px] text-[hsl(var(--muted-foreground))] border-l border-[hsl(var(--border))]">MS</th>
                    <th className="px-1 py-2 text-center text-[10px] text-[hsl(var(--muted-foreground))]">TMS</th>
                  </Fragment>
                ))}
                <th className="px-1 py-2 text-center text-[10px] text-[hsl(var(--muted-foreground))] border-l border-[hsl(var(--border))]">MS</th>
                <th className="px-1 py-2 text-center text-[10px] text-[hsl(var(--muted-foreground))]">TMS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[hsl(var(--border))]">
                    <td colSpan={4 + KOMPONEN.length * 2 + 2} className="px-4 py-3">
                      <div className="h-4 bg-[hsl(var(--muted))] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : (
                puskesmasList.map((pkm: any, i: number) => {
                  const d = data.find((r: any) => r.puskesmasId === pkm.id);
                  return (
                    <tr key={pkm.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--primary))]/[0.02] cursor-pointer transition-colors" onClick={() => openForm(pkm.id)}>
                      <td className="px-3 py-2.5 sticky left-0 bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]">{i + 1}</td>
                      <td className="px-3 py-2.5 sticky left-8 bg-[hsl(var(--card))] font-medium">{pkm.nama}</td>
                      <td className={`px-2 py-2.5 text-center ${d?.jumlahRumahAda ? "" : "text-[hsl(var(--muted-foreground))]/40"}`}>{d?.jumlahRumahAda || "—"}</td>
                      <td className={`px-2 py-2.5 text-center ${d?.jumlahDiperiksa ? "" : "text-[hsl(var(--muted-foreground))]/40"}`}>{d?.jumlahDiperiksa || "—"}</td>
                      {KOMPONEN.map((k) => (
                        <Fragment key={k.key}>
                          <td className={`px-1 py-2.5 text-center border-l border-[hsl(var(--border))] ${d?.[`${k.key}Ms`] ? "" : "text-[hsl(var(--muted-foreground))]/40"}`}>{d?.[`${k.key}Ms`] || "—"}</td>
                          <td className={`px-1 py-2.5 text-center ${d?.[`${k.key}Tms`] ? "" : "text-[hsl(var(--muted-foreground))]/40"}`}>{d?.[`${k.key}Tms`] || "—"}</td>
                        </Fragment>
                      ))}
                      <td className={`px-1 py-2.5 text-center border-l border-[hsl(var(--border))] ${d?.hasilMs ? "" : "text-[hsl(var(--muted-foreground))]/40"}`}>{d?.hasilMs || "—"}</td>
                      <td className={`px-1 py-2.5 text-center ${d?.hasilTms ? "" : "text-[hsl(var(--muted-foreground))]/40"}`}>{d?.hasilTms || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto" style={{ boxShadow: "var(--shadow-lg)" }}>
            <h2 className="text-lg font-bold mb-4">Input Pemeriksaan Rumah</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5 text-slate-700">Puskesmas</label>
                <select
                  value={form.puskesmasId}
                  onChange={(e) => openForm(Number(e.target.value))}
                  className="w-full h-10 px-4 pr-10 text-sm rounded-lg border border-[hsl(220,13%,82%)] bg-white appearance-none hover:border-[hsl(220,13%,70%)] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/15 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
                >
                  {puskesmasList.map((p: any) => (<option key={p.id} value={p.id}>{p.nama}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Jumlah Rumah Ada</label>
                  <input type="number" min={0} value={form.jumlahRumahAda} onChange={(e) => setForm({ ...form, jumlahRumahAda: Number(e.target.value) })} className="w-full h-10 px-4 text-sm rounded-lg border border-[hsl(220,13%,82%)] bg-white hover:border-[hsl(220,13%,70%)] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/15 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Jumlah Diperiksa</label>
                  <input type="number" min={0} value={form.jumlahDiperiksa} onChange={(e) => setForm({ ...form, jumlahDiperiksa: Number(e.target.value) })} className="w-full h-10 px-4 text-sm rounded-lg border border-[hsl(220,13%,82%)] bg-white hover:border-[hsl(220,13%,70%)] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/15 transition-all" />
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-[hsl(220,13%,82%)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[hsl(220,13%,82%)]">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Komponen</th>
                      <th className="px-2 py-2.5 text-center text-xs font-semibold text-slate-600 w-24">MS</th>
                      <th className="px-2 py-2.5 text-center text-xs font-semibold text-slate-600 w-24">TMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {KOMPONEN.map((k) => (
                      <tr key={k.key} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-xs font-medium text-slate-700">{k.label}</td>
                        <td className="px-1 py-1.5">
                          <input type="number" min={0} value={form[`${k.key}Ms`] || 0} onChange={(e) => setForm({ ...form, [`${k.key}Ms`]: Number(e.target.value) })} className="w-full px-2 py-1.5 border border-[hsl(220,13%,82%)] bg-white rounded-md text-center text-xs hover:border-[hsl(220,13%,70%)] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/15 transition-all" />
                        </td>
                        <td className="px-1 py-1.5">
                          <input type="number" min={0} value={form[`${k.key}Tms`] || 0} onChange={(e) => setForm({ ...form, [`${k.key}Tms`]: Number(e.target.value) })} className="w-full px-2 py-1.5 border border-[hsl(220,13%,82%)] bg-white rounded-md text-center text-xs hover:border-[hsl(220,13%,70%)] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/15 transition-all" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
                <Button type="submit" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
