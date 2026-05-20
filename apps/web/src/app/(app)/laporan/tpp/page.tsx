"use client";

import { Fragment, useState } from "react";
import { ChangelogButton } from "@/components/changelog-button";
import { ExportButton } from "@/components/export-button";
import { LaporanFilter } from "@/components/laporan-filter";
import { PdfExportButton } from "@/components/pdf-export-button";
import { Button } from "@/components/ui/button";
import { useLaporanData, useMasterList } from "@/hooks/use-laporan-data";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

interface LaporanItem {
  id: number;
  puskesmasId: number;
  jenisTppId: number;
  terdaftar: number;
  diperiksa: number;
  laikJumlah: number;
  laikPersen: number;
}

export default function LaporanTppPage() {
  const { data, isLoading, bulan, tahun, submitMutation } = useLaporanData<LaporanItem>("tpp", "/api/laporan/tpp");
  const { data: jenisList = [] } = useMasterList("/api/master/jenis-tpp");
  const { data: puskesmasList = [] } = useMasterList("/api/master/puskesmas");
  const [showForm, setShowForm] = useState(false);
  const [formPuskesmasId, setFormPuskesmasId] = useState<number>(0);
  const [formItems, setFormItems] = useState<
    { jenisTppId: number; terdaftar: number; diperiksa: number; laikJumlah: number }[]
  >([]);
  const [selectedRecordId, setSelectedRecordId] = useState<number>(0);
  useUnsavedChanges(showForm);

  function openForm(pkmId?: number) {
    const id = pkmId || puskesmasList[0]?.id || 0;
    setFormPuskesmasId(id);
    const existing = data.filter((d) => d.puskesmasId === id);
    if (existing.length > 0) setSelectedRecordId(existing[0].id);
    setFormItems(
      jenisList.map((j: any) => {
        const ex = data.find((d) => d.puskesmasId === id && d.jenisTppId === j.id);
        return {
          jenisTppId: j.id,
          terdaftar: ex?.terdaftar || 0,
          diperiksa: ex?.diperiksa || 0,
          laikJumlah: ex?.laikJumlah || 0,
        };
      }),
    );
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMutation.mutate({ puskesmasId: formPuskesmasId, items: formItems });
    setShowForm(false);
  }

  const grouped = puskesmasList.map((pkm: any) => ({
    ...pkm,
    items: jenisList.map((j: any) => data.find((d) => d.puskesmasId === pkm.id && d.jenisTppId === j.id)),
  }));

  const pdfHeaders = [
    "No",
    "Puskesmas",
    ...jenisList.flatMap((j: any) => [`${j.nama} Tdf`, `${j.nama} Prk`, `${j.nama} Laik`, `${j.nama} %`]),
  ];
  const pdfRows = grouped.map((pkm: any, i: number) => [
    i + 1,
    pkm.nama,
    ...pkm.items.flatMap((item: any) => [
      item?.terdaftar || 0,
      item?.diperiksa || 0,
      item?.laikJumlah || 0,
      item?.laikPersen ? `${item.laikPersen.toFixed(0)}%` : "0%",
    ]),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Laporan TPP</h1>
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <LaporanFilter />
        <ExportButton jenis="tpp" bulan={bulan} tahun={tahun} />
        <PdfExportButton
          title={`Laporan TPP - ${bulan}/${tahun}`}
          headers={pdfHeaders}
          rows={pdfRows}
          filename={`laporan-tpp-${bulan}-${tahun}`}
        />
        {selectedRecordId > 0 && <ChangelogButton tableName="laporan_tpp" recordId={selectedRecordId} />}
        <Button onClick={() => openForm()}>+ Input Data</Button>
      </div>

      <div className="card overflow-hidden w-full">
        <table className="w-full text-xs whitespace-nowrap min-w-[800px]">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-3 py-2 text-left sticky left-0 bg-slate-50 z-10">No</th>
              <th className="px-3 py-2 text-left sticky left-8 bg-slate-50 z-10">Puskesmas</th>
              {jenisList.map((j: any) => (
                <th key={j.id} colSpan={4} className="px-2 py-2 text-center border-l">
                  {j.nama}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50">
              <th className="sticky left-0 bg-slate-50" />
              <th className="sticky left-8 bg-slate-50" />
              {jenisList.map((j: any) => (
                <Fragment key={j.id}>
                  <th className="px-2 py-1 text-center border-l">Tdf</th>
                  <th className="px-2 py-1 text-center">Prk</th>
                  <th className="px-2 py-1 text-center">Laik</th>
                  <th className="px-2 py-1 text-center">%</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={2 + jenisList.length * 4} className="px-4 py-8 text-center text-slate-400">
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
                      <td className="px-2 py-2 text-center border-l">{item?.terdaftar || ""}</td>
                      <td className="px-2 py-2 text-center">{item?.diperiksa || ""}</td>
                      <td className="px-2 py-2 text-center">{item?.laikJumlah || ""}</td>
                      <td className="px-2 py-2 text-center">
                        {item?.laikPersen ? `${item.laikPersen.toFixed(0)}%` : ""}
                      </td>
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
            <h2 className="text-lg font-bold mb-4">Input Data TPP</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Puskesmas</label>
                <select
                  value={formPuskesmasId}
                  onChange={(e) => {
                    setFormPuskesmasId(Number(e.target.value));
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
                    <th className="px-3 py-2 text-left">Jenis TPP</th>
                    <th className="px-3 py-2 text-center w-20">Terdaftar</th>
                    <th className="px-3 py-2 text-center w-20">Diperiksa</th>
                    <th className="px-3 py-2 text-center w-20">Laik HSP</th>
                  </tr>
                </thead>
                <tbody>
                  {formItems.map((item, idx) => (
                    <tr key={item.jenisTppId} className="border-t">
                      <td className="px-3 py-1">{jenisList.find((j: any) => j.id === item.jenisTppId)?.nama}</td>
                      {(["terdaftar", "diperiksa", "laikJumlah"] as const).map((field) => (
                        <td key={field} className="px-1 py-1">
                          <input
                            type="number"
                            min={0}
                            value={item[field]}
                            onChange={(e) =>
                              setFormItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, [field]: Number(e.target.value) } : it)),
                              )
                            }
                            className="w-full px-2 py-1.5 border border-[hsl(220,13%,82%)] bg-white rounded-md text-center hover:border-[hsl(220,13%,70%)] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/15 transition-all"
                          />
                          {field === "laikJumlah" && item.laikJumlah > item.diperiksa && (
                            <span className="text-orange-500 text-[10px]">⚠️ Laik &gt; Diperiksa</span>
                          )}
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
