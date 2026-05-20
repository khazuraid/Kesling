"use client";

import { Fragment, useState } from "react";
import { ExportButton } from "@/components/export-button";
import { LaporanFilter } from "@/components/laporan-filter";
import { Button } from "@/components/ui/button";
import { useLaporanData, useMasterList } from "@/hooks/use-laporan-data";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

export default function LaporanTtuPage() {
  const { data, isLoading, bulan, tahun, submitMutation } = useLaporanData<any>("ttu", "/api/laporan/ttu");
  const { data: jenisList = [] } = useMasterList("/api/master/jenis-ttu");
  const { data: puskesmasList = [] } = useMasterList("/api/master/puskesmas");
  const [showForm, setShowForm] = useState(false);
  useUnsavedChanges(showForm);
  const [formPkmId, setFormPkmId] = useState<number>(0);
  const [formItems, setFormItems] = useState<any[]>([]);

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

  const grouped = puskesmasList.map((p: any) => ({
    ...p,
    items: jenisList.map((j: any) => data.find((d: any) => d.puskesmasId === p.id && d.jenisTtuId === j.id)),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Laporan TTU</h1>
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <LaporanFilter />
        <ExportButton jenis="ttu" bulan={bulan} tahun={tahun} />
        <Button onClick={() => openForm()}>+ Input Data</Button>
      </div>

      <div className="card overflow-hidden w-full">
        <table className="w-full text-xs whitespace-nowrap min-w-[800px]">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-3 py-2 text-left sticky left-0 bg-slate-50 z-10">No</th>
              <th className="px-3 py-2 text-left sticky left-8 bg-slate-50 z-10">Puskesmas</th>
              {jenisList.map((j: any) => (
                <th key={j.id} colSpan={3} className="px-2 py-2 text-center border-l">
                  {j.nama}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50">
              <th className="sticky left-0 bg-slate-50" />
              <th className="sticky left-8 bg-slate-50" />
              {jenisList.map((j: any) => (
                <Fragment key={j.id}>
                  <th className="px-2 py-1 text-center border-l">Jml</th>
                  <th className="px-2 py-1 text-center">MS</th>
                  <th className="px-2 py-1 text-center">TMS</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={2 + jenisList.length * 3} className="px-4 py-8 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : (
              grouped.map((pkm: any, i: number) => (
                <tr
                  key={pkm.id}
                  className="border-t hover:bg-slate-50 cursor-pointer"
                  onClick={() => openForm(pkm.id)}
                >
                  <td className="px-3 py-2 sticky left-0 bg-white">{i + 1}</td>
                  <td className="px-3 py-2 sticky left-8 bg-white font-medium">{pkm.nama}</td>
                  {pkm.items.map((item: any, idx: number) => (
                    <Fragment key={idx}>
                      <td className="px-2 py-2 text-center border-l">
                        {item?.jumlahTotal || ""}
                      </td>
                      <td className="px-2 py-2 text-center">{item?.ms || ""}</td>
                      <td className="px-2 py-2 text-center">{item?.tms || ""}</td>
                    </Fragment>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <h2 className="text-lg font-bold mb-4">Input Data TTU</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <select
                  value={formPkmId}
                  onChange={(e) => {
                    setFormPkmId(Number(e.target.value));
                    openForm(Number(e.target.value));
                  }}
                  className="w-full h-10 px-4 pr-10 text-sm rounded-lg border border-[hsl(220,13%,82%)] bg-white appearance-none hover:border-[hsl(220,13%,70%)] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/15"
                >
                  {puskesmasList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </div>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-2 text-left">Jenis TTU</th>
                    <th className="px-3 py-2 text-center w-20">Jumlah</th>
                    <th className="px-3 py-2 text-center w-20">MS</th>
                    <th className="px-3 py-2 text-center w-20">TMS</th>
                  </tr>
                </thead>
                <tbody>
                  {formItems.map((item, idx) => (
                    <tr key={item.jenisTtuId} className="border-t">
                      <td className="px-3 py-1">{jenisList.find((j: any) => j.id === item.jenisTtuId)?.nama}</td>
                      {(["jumlahTotal", "ms", "tms"] as const).map((f) => (
                        <td key={f} className="px-1 py-1">
                          <input
                            type="number"
                            min={0}
                            value={item[f]}
                            onChange={(e) =>
                              setFormItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, [f]: Number(e.target.value) } : it)),
                              )
                            }
                            className="w-full px-2 py-1.5 border border-[hsl(220,13%,82%)] bg-white rounded-md text-center hover:border-[hsl(220,13%,70%)] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/15 transition-all"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={submitMutation.isPending}>
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
