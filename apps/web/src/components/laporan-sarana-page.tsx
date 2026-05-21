"use client";

import { Fragment, useState } from "react";
import { ChangelogButton } from "@/components/changelog-button";
import { ExportButton } from "@/components/export-button";
import { LaporanFilter } from "@/components/laporan-filter";
import { PdfExportButton } from "@/components/pdf-export-button";
import { Button } from "@/components/ui/button";
import { useLaporanData, useMasterList } from "@/hooks/use-laporan-data";
import { usePuskesmasList } from "@/hooks/use-puskesmas-list";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

interface Props {
  title: string;
  jenis: string;
  apiUrl: string;
  kategori: string;
}

const FIELDS = ["jumlah", "kk", "pddk", "diperiksaJumlah", "diperiksaMs", "diperiksaKk", "diperiksaPddk"] as const;
const HEADERS = ["Jml", "KK", "Pddk", "Prk", "MS", "KK", "Pddk"];

export function LaporanSaranaPage({ title, jenis, apiUrl, kategori }: Props) {
  const { data, isLoading, bulan, tahun, submitMutation } = useLaporanData<any>(jenis, apiUrl);
  const { data: jenisList = [] } = useMasterList(`/api/master/jenis-sarana?kategori=${kategori}`);
  const { data: puskesmasList = [] } = usePuskesmasList();
  const [showForm, setShowForm] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(0);
  useUnsavedChanges(showForm);
  const [formPkmId, setFormPkmId] = useState<number>(0);
  const [formItems, setFormItems] = useState<any[]>([]);

  function openForm(pkmId?: number) {
    const id = pkmId || puskesmasList[0]?.id || 0;
    setFormPkmId(id);
    const firstItem = data.find((d: any) => d.puskesmasId === id);
    if (firstItem) setSelectedRecordId(firstItem.id);
    setFormItems(
      jenisList.map((j: any) => {
        const ex = data.find((d: any) => d.puskesmasId === id && d.jenisSaranaId === j.id);
        return { jenisSaranaId: j.id, jumlah: ex?.jumlah || 0, kk: ex?.kk || 0, pddk: ex?.pddk || 0, diperiksaJumlah: ex?.diperiksaJumlah || 0, diperiksaMs: ex?.diperiksaMs || 0, diperiksaKk: ex?.diperiksaKk || 0, diperiksaPddk: ex?.diperiksaPddk || 0 };
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
    items: jenisList.map((j: any) => data.find((d: any) => d.puskesmasId === p.id && d.jenisSaranaId === j.id)),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{puskesmasList.length} Puskesmas • {data.length} data</p>
        </div>
        <Button onClick={() => openForm()}>+ Input Data</Button>
      </div>

      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <LaporanFilter />
          <ExportButton jenis={jenis} bulan={bulan} tahun={tahun} />
          <PdfExportButton
            title={`${title} - ${bulan}/${tahun}`}
            headers={["No", "Puskesmas", ...jenisList.flatMap((j: any) => HEADERS.map((h) => `${j.nama} ${h}`))]}
            rows={grouped.map((pkm: any, i: number) => [i + 1, pkm.nama, ...pkm.items.flatMap((item: any) => FIELDS.map((f) => item?.[f] || 0))])}
            filename={`laporan-${jenis}-${bulan}-${tahun}`}
          />
          {selectedRecordId > 0 && <ChangelogButton tableName={`laporan_${jenis}`} recordId={selectedRecordId} />}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider sticky left-0 bg-[hsl(var(--card))] z-10">No</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider sticky left-8 bg-[hsl(var(--card))] z-10">Puskesmas</th>
                {jenisList.map((j: any) => (
                  <th key={j.id} colSpan={7} className="px-2 py-3 text-center text-[10px] font-semibold text-[hsl(var(--primary))] uppercase tracking-wider border-l border-[hsl(var(--border))]">
                    {j.nama}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                <th className="sticky left-0 bg-[hsl(var(--muted))]/30" />
                <th className="sticky left-8 bg-[hsl(var(--muted))]/30" />
                {jenisList.map((j: any) => (
                  <Fragment key={j.id}>
                    {HEADERS.map((h, i) => (
                      <th key={i} className={`px-2 py-2 text-center text-[10px] text-[hsl(var(--muted-foreground))] ${i === 0 ? "border-l border-[hsl(var(--border))]" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[hsl(var(--border))]">
                    <td colSpan={2 + jenisList.length * 7} className="px-4 py-3">
                      <div className="h-4 bg-[hsl(var(--muted))] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : (
                grouped.map((pkm: any, i: number) => (
                  <tr
                    key={pkm.id}
                    className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--primary))]/[0.02] cursor-pointer transition-colors"
                    onClick={() => openForm(pkm.id)}
                  >
                    <td className="px-3 py-2.5 sticky left-0 bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]">{i + 1}</td>
                    <td className="px-3 py-2.5 sticky left-8 bg-[hsl(var(--card))] font-medium">{pkm.nama}</td>
                    {pkm.items.map((item: any, idx: number) => (
                      <Fragment key={idx}>
                        {FIELDS.map((f, fi) => (
                          <td key={f} className={`px-2 py-2.5 text-center ${fi === 0 ? "border-l border-[hsl(var(--border))]" : ""} ${item?.[f] ? "" : "text-[hsl(var(--muted-foreground))]/40"}`}>
                            {item?.[f] || "—"}
                          </td>
                        ))}
                      </Fragment>
                    ))}
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
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto" style={{ boxShadow: "var(--shadow-lg)" }}>
            <h2 className="text-lg font-bold mb-4">Input {title}</h2>
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
              <div className="overflow-x-auto rounded-lg border border-[hsl(220,13%,82%)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[hsl(220,13%,82%)]">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Jenis</th>
                      {HEADERS.map((h) => (<th key={h} className="px-2 py-2.5 text-center text-xs font-semibold text-slate-600 w-16">{h}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {formItems.map((item, idx) => (
                      <tr key={item.jenisSaranaId} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-xs font-medium text-slate-700">{jenisList.find((j: any) => j.id === item.jenisSaranaId)?.nama}</td>
                        {FIELDS.map((f) => (
                          <td key={f} className="px-1 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={item[f]}
                              onChange={(e) => setFormItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [f]: Number(e.target.value) } : it)))}
                              className="w-full px-2 py-1.5 border border-[hsl(220,13%,82%)] bg-white rounded-md text-center text-xs hover:border-[hsl(220,13%,70%)] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/15 transition-all"
                            />
                          </td>
                        ))}
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
