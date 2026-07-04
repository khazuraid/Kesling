"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, ChevronDown, Clock, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { LaporanFilter } from "@/components/laporan-filter";
import { useLaporanFilter } from "@/hooks/use-laporan-filter";

const BULAN_NAMA = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

type FilterTab = "all" | "SUBMITTED" | "APPROVED" | "DRAFT";

export default function ApprovalPage() {
  const { bulan, tahun } = useLaporanFilter();
  const queryClient = useQueryClient();

  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [rejectCatatan, setRejectCatatan] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // ── Queries ──
  const { data: laporan = [], isLoading: loadingLaporan } = useQuery<any[]>({
    queryKey: ["approval", bulan, tahun],
    queryFn: async () => {
      const res = await fetch(`/api/laporan/approval?bulan=${bulan}&tahun=${tahun}`);
      if (!res.ok) throw new Error("Gagal memuat data");
      return res.json();
    },
  });

  // ── Mutations ──
  const approveMutation = useMutation({
    mutationFn: async ({ ids, catatan }: { ids: number[]; catatan?: string }) => {
      if (ids.length === 1) {
        await fetch("/api/laporan/approval", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ laporanId: ids[0], action: "APPROVE", catatan }),
        });
      } else {
        await fetch("/api/laporan/approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ laporanIds: ids, action: "APPROVE" }),
        });
      }
    },
    onSuccess: (_, vars) => {
      toast.success(`${vars.ids.length} laporan disetujui`);
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ["approval"] });
    },
    onError: () => toast.error("Gagal menyetujui laporan"),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, catatan }: { id: number; catatan: string }) => {
      await fetch("/api/laporan/approval", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laporanId: id, action: "REJECT", catatan }),
      });
    },
    onSuccess: () => {
      toast.success("Laporan ditolak");
      setRejectModal({ open: false, id: null });
      setRejectCatatan("");
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ["approval"] });
    },
    onError: () => toast.error("Gagal menolak laporan"),
  });

  // ── Stats ──
  const statsLaporan = {
    total: laporan.length,
    submitted: laporan.filter((l) => l.status === "SUBMITTED").length,
    approved: laporan.filter((l) => l.status === "APPROVED").length,
    draft: laporan.filter((l) => l.status === "DRAFT").length,
  };

  const filteredLaporan = laporan.filter((l) => {
    const categoryMatch = filterCategory === "all" || l.category.code.toLowerCase() === filterCategory.toLowerCase();
    const tabMatch = filterTab === "all" || l.status === filterTab;
    return categoryMatch && tabMatch;
  });

  const categories = useMemo(
    () =>
      Array.from(new Set(laporan.map((l) => l.category.code.toLowerCase()))).map((code) => {
        const item = laporan.find((l) => l.category.code.toLowerCase() === code);
        return { code, nama: item?.category.nama || "", icon: item?.category.icon || "" };
      }),
    [laporan],
  );

  function handleGroupApprove(categoryCode: string) {
    const ids = laporan
      .filter((l) => l.category.code.toLowerCase() === categoryCode && l.status === "SUBMITTED")
      .map((l) => l.id);
    if (ids.length > 0) approveMutation.mutate({ ids });
  }

  const statusStyle = (status: string) => {
    if (status === "APPROVED") return "bg-green-50 text-green-700";
    if (status === "REJECTED") return "bg-red-50 text-red-600";
    if (status === "SUBMITTED") return "bg-amber-50 text-amber-700";
    return "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]";
  };

  // ═══════════════════ RENDER ═══════════════════
  return (
    <div className="w-full mx-auto pb-4 space-y-4 fade-in">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        <div>
          <h1 className="text-[16px] font-bold text-[hsl(var(--foreground))]">Pusat Approval</h1>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            Verifikasi laporan bulanan dari Puskesmas
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <LaporanFilter />
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            Kategori:
          </span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 bg-[hsl(var(--card))] border border-[hsl(var(--border))] px-3 text-[12px] font-medium outline-none focus:border-[hsl(var(--foreground))]/30 transition-colors"
          >
            <option value="all">Semua</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.icon} {c.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {[
          { tab: "all" as const, label: "Semua", val: statsLaporan.total },
          { tab: "SUBMITTED" as const, label: "Diajukan", val: statsLaporan.submitted },
          { tab: "APPROVED" as const, label: "Disetujui", val: statsLaporan.approved },
          { tab: "DRAFT" as const, label: "Draft", val: statsLaporan.draft },
        ].map(({ tab, label, val }, i) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`flex flex-col items-center justify-center py-4 px-2 transition-colors ${
              i < 3 ? "border-r border-[hsl(var(--border))]" : ""
            } ${filterTab === tab ? "bg-[hsl(var(--foreground))]/5" : "hover:bg-[hsl(var(--muted))]/20"}`}
          >
            <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
              {label}
            </span>
            <span className="text-[22px] font-bold tabular-nums leading-none text-[hsl(var(--foreground))]">
              {val}
            </span>
          </button>
        ))}
      </div>

      {/* Laporan List */}
      {loadingLaporan ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[hsl(var(--border))] border-t-[hsl(var(--foreground))] animate-spin" />
        </div>
      ) : filteredLaporan.length === 0 ? (
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col items-center justify-center py-20 gap-2">
          <Clock className="w-8 h-8 text-[hsl(var(--muted-foreground))] opacity-30" />
          <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Tidak ada data</p>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Tidak ada laporan untuk diverifikasi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((c) => {
            const groupLaporan = filteredLaporan.filter((l) => l.category.code.toLowerCase() === c.code);
            if (groupLaporan.length === 0) return null;
            const hasPending = groupLaporan.some((l) => l.status === "SUBMITTED");

            return (
              <div key={c.code} className="space-y-2">
                {/* Category Header */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{c.icon}</span>
                    <h3 className="text-[12px] font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
                      {c.nama}
                    </h3>
                    <span className="text-[10px] font-bold bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5">
                      {groupLaporan.length}
                    </span>
                  </div>
                  {hasPending && (
                    <button
                      onClick={() => handleGroupApprove(c.code)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[hsl(var(--foreground))] hover:opacity-70 transition-opacity"
                    >
                      <Check className="w-3.5 h-3.5" /> Setujui Semua
                    </button>
                  )}
                </div>

                {/* Cards */}
                <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] divide-y divide-[hsl(var(--border))]">
                  {groupLaporan.map((l) => (
                    <div key={l.id}>
                      <div className="flex items-center justify-between gap-4 p-4">
                        <div className="min-w-0">
                          <h4 className="text-[13px] font-bold text-[hsl(var(--foreground))] truncate">
                            {l.puskesmas.nama}
                          </h4>
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                            Periode: {BULAN_NAMA[l.bulan]} {l.tahun}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${statusStyle(l.status)}`}
                          >
                            {l.status === "SUBMITTED"
                              ? "Diajukan"
                              : l.status === "APPROVED"
                                ? "Disetujui"
                                : l.status}
                          </span>
                          <button
                            onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                            className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${expandedId === l.id ? "rotate-180" : ""}`}
                            />
                          </button>
                        </div>
                      </div>

                      {expandedId === l.id && (
                        <div className="px-4 pb-4 pt-4 space-y-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/5">
                          {/* Detail */}
                          <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
                            {l.category.isRowBased && l.category.subCategories ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px] border-collapse">
                                  <thead>
                                    <tr className="bg-[hsl(var(--muted))]/30 border-b border-[hsl(var(--border))]">
                                      <th className="p-2 font-bold text-[hsl(var(--muted-foreground))]">
                                        Entitas/Sasaran
                                      </th>
                                      {l.category.parameters?.map((p: any) => (
                                        <th
                                          key={p.id}
                                          className="p-2 font-bold text-[hsl(var(--muted-foreground))]"
                                        >
                                          {p.nama}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[hsl(var(--border))]/50">
                                    {l.category.subCategories?.map((sub: any) => (
                                      <tr key={sub.id} className="hover:bg-[hsl(var(--muted))]/10">
                                        <td className="p-2 font-medium border-r border-[hsl(var(--border))]/50">
                                          {sub.nama}
                                        </td>
                                        {l.category.parameters?.map((p: any) => {
                                          const valObj = l.values.find(
                                            (v: any) => v.parameterId === p.id && v.subCategoryId === sub.id,
                                          );
                                          return (
                                            <td key={p.id} className="p-2">
                                              {valObj?.value || "—"}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
                                {l.category.parameters?.map((p: any) => {
                                  const valObj = l.values.find((v: any) => v.parameterId === p.id);
                                  return (
                                    <div key={p.id} className="space-y-1">
                                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                                        {p.nama}
                                      </span>
                                      <span className="block text-[12px] font-semibold">
                                        {valObj?.value || "—"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {l.catatan && (
                            <div className="p-3 border border-red-200 bg-red-50">
                              <span className="text-[10px] font-bold text-red-700 block mb-1">
                                Catatan Verifikasi:
                              </span>
                              <p className="text-[11px] text-red-600">{l.catatan}</p>
                            </div>
                          )}

                          {l.status === "SUBMITTED" && (
                            <div className="flex gap-2 justify-end pt-2 border-t border-[hsl(var(--border))]/30">
                              <button
                                onClick={() => setRejectModal({ open: true, id: l.id })}
                                className="h-8 px-4 border border-red-300 text-red-600 text-[11px] font-bold hover:bg-red-50 transition-colors"
                              >
                                Tolak Laporan
                              </button>
                              <button
                                onClick={() => approveMutation.mutate({ ids: [l.id] })}
                                className="h-8 px-4 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[11px] font-bold hover:opacity-80 transition-opacity"
                              >
                                Setujui Laporan
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Reject Laporan ── */}
      {rejectModal.open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
          onClick={() => setRejectModal({ open: false, id: null })}
        >
          <div
            className="bg-[hsl(var(--card))] max-w-md w-full border border-[hsl(var(--border))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
              <h3 className="text-[15px] font-bold text-[hsl(var(--foreground))]">Tolak Laporan</h3>
              <button
                onClick={() => setRejectModal({ open: false, id: null })}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <label className="block text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">
                Alasan Penolakan
              </label>
              <textarea
                value={rejectCatatan}
                onChange={(e) => setRejectCatatan(e.target.value)}
                placeholder="Berikan feedback..."
                rows={4}
                className="w-full text-[11px] border border-[hsl(var(--border))] px-3 py-2 outline-none focus:border-[hsl(var(--foreground))]/30 resize-none transition-colors"
              />
            </div>
            <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex justify-end gap-2">
              <button
                onClick={() => setRejectModal({ open: false, id: null })}
                className="h-8 px-3 border border-[hsl(var(--border))] text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => rejectModal.id && rejectMutation.mutate({ id: rejectModal.id, catatan: rejectCatatan })}
                disabled={rejectMutation.isPending || !rejectCatatan}
                className="h-8 px-3 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[11px] font-bold hover:opacity-80 disabled:opacity-40 transition-opacity"
              >
                Kirim Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
