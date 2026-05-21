"use client";

import { Fragment, useState } from "react";
import { ExportButton } from "@/components/export-button";
import { LaporanFilter } from "@/components/laporan-filter";
import { Button } from "@/components/ui/button";
import { useLaporanData, useMasterList } from "@/hooks/use-laporan-data";
import { usePuskesmasList } from "@/hooks/use-puskesmas-list";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

export default function LaporanTtuPage() {
  const { data, isLoading, bulan, tahun, submitMutation } = useLaporanData<any>("ttu", "/api/laporan/ttu");
  const { data: jenisList = [] } = useMasterList("/api/master/jenis-ttu");
  const { data: puskesmasList = [] } = usePuskesmasList();
  const [showForm, setShowForm] = useState(false);
  useUnsavedChanges(showForm);
  const [formPkmId, setFormPkmId] = useState<number>(0);
  const [formItems, setFormItems] = useState<any[]>([]);

  const prioritas = jenisList.filter((j: any) => j.kategori === "PRIORITAS");
  const nonPrioritas = jenisList.filter((j: any) => j.kategori === "NON_PRIORITAS");
  const ordered = [...prioritas, ...nonPrioritas];

  function openForm(pkmId?: number) {
    const id = pkmId || puskesmasList[0]?.id || 0;
    setFormPkmId(id);
    setFormItems(
      jenisList.map((j: any) => {
        const ex = data.find((d: any) => d.puskesmasId === id && d.jenisTtuId === j.id);
        return { jenisTtuId: j.id, jumlahTotal: ex?.jumlahTotal || 0, ms: ex?.ms || 0, tms: ex?.tms || 0 };
      }),
    );
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMutation.mutate({ puskesmasId: formPkmId, items: formItems });
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Laporan TTU</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{puskesmasList.length} Puskesmas • {data.length} data</p>
        </div>
        <Button onClick={() => openForm()}>+ Input Data</Button>
      </div>

      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <LaporanFilter />
          <ExportButton jenis="ttu" bulan={bulan} tahun={tahun} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs whitespace-nowrap min-w-[800px]">
            <thead>
              {/* Kategori row */}
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider sticky left-0 bg-[hsl(var(--card))] z-10" rowSpan={3}>No</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider sticky left-8 bg-[hsl(var(--card))] z-10" rowSpan={3}>Puskesmas</th>
                {prioritas.length > 0 && (
                  <th colSpan={prioritas.length * 3} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider border-l border-[hsl(var(--border))] text-green-700 bg-green-50/50">
                    Prioritas
                  </th>
                )}
                {nonPrioritas.length > 0 && (
                  <th colSpan={nonPrioritas.length * 3} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider border-l border-[hsl(var(--border))] text-blue-700 bg-blue-50/50">
                    Non Prioritas
                  </th>
                )}
              </tr>
              {/* Jenis row */}
              <tr className="border-b border-[hsl(var(--border))]">
                {ordered.map((j: any) => (
                  <th key={j.id} colSpan={3} className="px-2 py-2 text-center text-[10px] font-semibold text-[hsl(var(--primary))] uppercase tracking-wider border-l border-[hsl(var(--border))]">
                    {j.nama}
                  </th>
                ))}
              </tr>
              {/* Sub-header row */}
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                {ordered.map((j: any) => (
                  <Fragment key={j.id}>
                    <th className="px-1 py-2 text-center text-[10px] text-[hsl(var(--muted-foreground))] border-l border-[hsl(var(--border))]">Jml</th>
                    <th className="px-1 py-2 text-center text-[10px] text-[hsl(var(--muted-foreground))]">MS</th>
                    <th className="px-1 py-2 text-center text-[10px] text-[hsl(var(--muted-foreground))]">TMS</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[hsl(var(--border))]">
                    <td colSpan={2 + ordered.length * 3} className="px-4 py-3">
                      <div className="h-4 bg-[hsl(var(--muted))] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : (
                puskesmasList.map((pkm: any, i: number) => (
                  <tr key={pkm.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--primary))]/[0.02] cursor-pointer transition-colors" onClick={() => openForm(pkm.id)}>
                    <td className="px-3 py-2.5 sticky left-0 bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]">{i + 1}</td>
                    <td className="px-3 py-2.5 sticky left-8 bg-[hsl(var(--card))] font-medium">{pkm.nama}</td>
                    {ordered.map((j: any) => {
                      const item = data.find((d: any) => d.puskesmasId === pkm.id && d.jenisTtuId === j.id);
                      return (
                        <Fragment key={j.id}>
                          <td className={`px-1 py-2.5 text-center border-l border-[hsl(var(--border))] ${item?.jumlahTotal ? "" : "text-[hsl(var(--muted-foreground))]/40"}`}>{item?.jumlahTotal || "—"}</td>
                          <td className={`px-1 py-2.5 text-center ${item?.ms ? "" : "text-[hsl(var(--muted-foreground))]/40"}`}>{item?.ms || "—"}</td>
                          <td className={`px-1 py-2.5 text-center ${item?.tms ? "" : "text-[hsl(var(--muted-foreground))]/40"}`}>{item?.tms || "—"}</td>
                        </Fragment>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[85vh] overflow-y-auto" style={{ boxShadow: "var(--shadow-lg)" }}>
            <h2 className="text-lg font-bold mb-4">Input Data TTU</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5 text-slate-700">Puskesmas</label>
                <select
                  value={formPkmId}
                  onChange={(e) => { setFormPkmId(Number(e.target.value)); openForm(Number(e.target.value)); }}
                  className="w-full h-10 px-4 pr-10 text-sm rounded-lg border border-[hsl(220,13%,82%)] bg-white appearance-none hover:border-[hsl(220,13%,70%)] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/15 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
                >
                  {puskesmasList.map((p: any) => (<option key={p.id} value={p.id}>{p.nama}</option>))}
                </select>
              </div>

              {/* Prioritas */}
              {prioritas.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">TTU Prioritas</h3>
                  <div className="overflow-x-auto rounded-lg border border-[hsl(220,13%,82%)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-green-50 border-b border-[hsl(220,13%,82%)]">
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Jenis TTU</th>
                          <th className="px-2 py-2.5 text-center text-xs font-semibold text-slate-600 w-20">Jumlah</th>
                          <th className="px-2 py-2.5 text-center text-xs font-semibold text-slate-600 w-20">MS</th>
                          <th className="px-2 py-2.5 text-center text-xs font-semibold text-slate-600 w-20">TMS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formItems.filter((it) => prioritas.some((j: any) => j.id === it.jenisTtuId)).map((item) => {
                          const globalIdx = formItems.indexOf(item);
                          return (
                            <tr key={item.jenisTtuId} className="border-t border-slate-100">
                              <td className="px-3 py-2 text-xs font-medium text-slate-700">{jenisList.find((j: any) => j.id === item.jenisTtuId)?.nama}</td>
                              {(["jumlahTotal", "ms", "tms"] as const).map((f) => (
                                <td key={f} className="px-1 py-1.5">
                                  <input type="number" min={0} value={item[f]} onChange={(e) => setFormItems((prev) => prev.map((it, i) => (i === globalIdx ? { ...it, [f]: Number(e.target.value) } : it)))} className="w-full px-2 py-1.5 border border-[hsl(220,13%,82%)] bg-white rounded-md text-center text-xs hover:border-[hsl(220,13%,70%)] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/15 transition-all" />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Non Prioritas */}
              {nonPrioritas.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">TTU Non Prioritas</h3>
                  <div className="overflow-x-auto rounded-lg border border-[hsl(220,13%,82%)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-blue-50 border-b border-[hsl(220,13%,82%)]">
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Jenis TTU</th>
                          <th className="px-2 py-2.5 text-center text-xs font-semibold text-slate-600 w-20">Jumlah</th>
                          <th className="px-2 py-2.5 text-center text-xs font-semibold text-slate-600 w-20">MS</th>
                          <th className="px-2 py-2.5 text-center text-xs font-semibold text-slate-600 w-20">TMS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formItems.filter((it) => nonPrioritas.some((j: any) => j.id === it.jenisTtuId)).map((item) => {
                          const globalIdx = formItems.indexOf(item);
                          return (
                            <tr key={item.jenisTtuId} className="border-t border-slate-100">
                              <td className="px-3 py-2 text-xs font-medium text-slate-700">{jenisList.find((j: any) => j.id === item.jenisTtuId)?.nama}</td>
                              {(["jumlahTotal", "ms", "tms"] as const).map((f) => (
                                <td key={f} className="px-1 py-1.5">
                                  <input type="number" min={0} value={item[f]} onChange={(e) => setFormItems((prev) => prev.map((it, i) => (i === globalIdx ? { ...it, [f]: Number(e.target.value) } : it)))} className="w-full px-2 py-1.5 border border-[hsl(220,13%,82%)] bg-white rounded-md text-center text-xs hover:border-[hsl(220,13%,70%)] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/15 transition-all" />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
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
