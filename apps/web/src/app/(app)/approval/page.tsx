"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, ChevronDown, Inbox, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { LaporanFilter } from "@/components/laporan-filter";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { useLaporanFilter } from "@/hooks/use-laporan-filter";

const BULAN_NAMA = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

type FilterTab = "all" | "SUBMITTED" | "APPROVED" | "DRAFT";

const STATUS_META: Record<string, { chip: string; dot: string; label: string }> = {
  SUBMITTED: {
    chip: "bg-warning-light text-warning border border-warning/25",
    dot: "bg-warning",
    label: "Menunggu",
  },
  APPROVED: {
    chip: "bg-success-light text-success border border-success/25",
    dot: "bg-success",
    label: "Disetujui",
  },
  REJECTED: {
    chip: "bg-error-light text-error border border-error/25",
    dot: "bg-error",
    label: "Ditolak",
  },
  DRAFT: {
    chip: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
    label: "Draft",
  },
};

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
  const stats = {
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

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "Semua", count: stats.total },
    { key: "SUBMITTED", label: "Menunggu", count: stats.submitted },
    { key: "APPROVED", label: "Disetujui", count: stats.approved },
    { key: "DRAFT", label: "Draft", count: stats.draft },
  ];

  // ═══════════════════ RENDER ═══════════════════
  return (
    <div className="w-full fade-in min-h-screen bg-canvas">
      {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
      <div className="w-full bg-surface border-b border-border px-4 sm:px-8 py-4 sm:py-6">
        <div className="w-full max-w-[1600px] mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-5">
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-warning-light border border-warning/25 flex flex-col items-center justify-center shrink-0">
                <span className="text-[20px] sm:text-[22px] font-black tabular-nums leading-none text-warning">
                  {stats.submitted}
                </span>
                <span className="text-[7px] font-extrabold uppercase tracking-[0.15em] text-warning/70 mt-0.5">
                  Menunggu
                </span>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary mb-0.5">Verifikasi</p>
                <h1 className="text-[20px] sm:text-[28px] font-black tracking-tight leading-none text-foreground">
                  Pusat Approval
                </h1>
                <p className="text-[11px] sm:text-[13px] font-medium text-muted-foreground mt-1">
                  <span className="tabular-nums font-bold text-foreground">{stats.approved}</span> disetujui ·{" "}
                  <span className="tabular-nums font-bold text-foreground">{stats.draft}</span> draft ·{" "}
                  <span className="tabular-nums font-bold text-foreground">{stats.total}</span> total
                </p>
              </div>
            </div>

            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-9 sm:h-10 px-3.5 rounded-full bg-surface-subtle hover:bg-surface border border-border text-[11px] sm:text-[12px] font-bold text-foreground outline-none focus:border-primary transition-colors appearance-none cursor-pointer shadow-xs"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.icon} {c.nama}
                  </option>
                ))}
              </select>
              <LaporanFilter />
            </div>
          </div>

          {/* Status tabs — bottom row of masthead */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="inline-flex items-center gap-1 rounded-full bg-surface-subtle border border-border p-1 min-w-max">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilterTab(t.key)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3.5 sm:px-4 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    filterTab === t.key
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                  <span
                    className={`text-[10px] font-extrabold tabular-nums px-1.5 py-px rounded-full ${
                      filterTab === t.key ? "bg-white/20 text-white" : "bg-border text-muted-foreground"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT BODY (CANVAS) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 py-5 sm:py-6 space-y-6">
        {loadingLaporan ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-border border-t-primary animate-spin rounded-full" />
          </div>
        ) : filteredLaporan.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Tidak ada laporan"
            description="Tidak ada laporan untuk diverifikasi pada periode ini. Coba ubah filter bulan, tahun, atau kategori."
          />
        ) : (
          <div className="space-y-6">
            {categories.map((c) => {
              const groupLaporan = filteredLaporan.filter((l) => l.category.code.toLowerCase() === c.code);
              if (groupLaporan.length === 0) return null;
              const pendingCount = groupLaporan.filter((l) => l.status === "SUBMITTED").length;

              return (
                <div key={c.code} className="space-y-2.5">
                  {/* Category header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{c.icon}</span>
                      <h3 className="text-[13px] font-extrabold text-foreground">{c.nama}</h3>
                      <span className="text-[10px] font-extrabold tabular-nums bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {groupLaporan.length}
                      </span>
                      {pendingCount > 0 && (
                        <span className="text-[10px] font-extrabold tabular-nums bg-warning-light text-warning border border-warning/25 px-2 py-0.5 rounded-full">
                          {pendingCount} menunggu
                        </span>
                      )}
                    </div>
                    {pendingCount > 0 && (
                      <button
                        onClick={() => handleGroupApprove(c.code)}
                        className="inline-flex items-center gap-1.5 h-8 px-4 rounded-button bg-primary text-primary-foreground text-[11px] font-extrabold hover:bg-primary-hover active:scale-[0.98] transition"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Setujui {pendingCount}
                      </button>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="space-y-2">
                    {groupLaporan.map((l) => {
                      const meta = STATUS_META[l.status] || STATUS_META.DRAFT;
                      const expanded = expandedId === l.id;
                      return (
                        <div
                          key={l.id}
                          className={`rounded-card bg-surface border border-border shadow-subtle overflow-hidden transition-colors ${
                            expanded ? "border-primary/50" : ""
                          }`}
                        >
                          <button
                            onClick={() => setExpandedId(expanded ? null : l.id)}
                            className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-surface-hover transition-colors"
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[13px] font-bold text-text-main truncate">{l.puskesmas.nama}</h4>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {BULAN_NAMA[l.bulan]} {l.tahun}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 inline-flex items-center h-6 px-2.5 rounded-button text-[10px] font-extrabold uppercase tracking-wider ${meta.chip}`}
                            >
                              {meta.label}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                            />
                          </button>

                          {expanded && (
                            <div className="px-5 pb-5 pt-4 space-y-4 border-t border-border">
                              {/* Detail */}
                              <div className="rounded-card border border-border overflow-hidden bg-surface">
                                {l.category.isRowBased && l.category.subCategories ? (
                                  <div className="overflow-x-auto max-h-[400px]">
                                    <table className="w-full text-left text-[11px] border-collapse">
                                      <thead className="sticky top-0 z-10 bg-surface-subtle shadow-xs">
                                        <tr className="border-b border-border">
                                          <th className="px-3 py-2.5 font-extrabold text-muted-foreground uppercase tracking-wider text-[9px] bg-surface-subtle">
                                            Entitas/Sasaran
                                          </th>
                                          {l.category.parameters?.map((p: any) => (
                                            <th
                                              key={p.id}
                                              className="px-3 py-2.5 font-extrabold text-muted-foreground uppercase tracking-wider text-[9px] bg-surface-subtle"
                                            >
                                              {p.nama}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/60">
                                        {l.category.subCategories?.map((sub: any) => (
                                          <tr key={sub.id} className="hover:bg-surface-hover">
                                            <td className="px-3 py-2.5 font-bold border-r border-border/60">
                                              {sub.nama}
                                            </td>
                                            {l.category.parameters?.map((p: any) => {
                                              const valObj = l.values.find(
                                                (v: any) => v.parameterId === p.id && v.subCategoryId === sub.id,
                                              );
                                              return (
                                                <td key={p.id} className="px-3 py-2.5 tabular-nums font-semibold">
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
                                          <span className="block text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">
                                            {p.nama}
                                          </span>
                                          <span className="block text-[13px] font-extrabold tabular-nums text-text-main">
                                            {valObj?.value || "—"}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {l.catatan && (
                                <div className="px-4 py-3 rounded-card border border-error/25 bg-error-light">
                                  <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-error block mb-1">
                                    Catatan Verifikasi
                                  </span>
                                  <p className="text-[12px] text-text-main">{l.catatan}</p>
                                </div>
                              )}

                              {l.status === "SUBMITTED" && (
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => setRejectModal({ open: true, id: l.id })}
                                    className="inline-flex items-center gap-2 h-9 px-5 rounded-button border border-error/40 text-error text-[11px] font-extrabold uppercase tracking-wider hover:bg-error-light active:scale-[0.98] transition-all"
                                  >
                                    <X className="w-3.5 h-3.5" /> Tolak
                                  </button>
                                  <button
                                    onClick={() => approveMutation.mutate({ ids: [l.id] })}
                                    disabled={approveMutation.isPending}
                                    className="inline-flex items-center gap-2 h-9 px-6 rounded-button bg-primary text-primary-foreground text-[11px] font-extrabold uppercase tracking-wider hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Setujui
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal: Reject ── */}
      <Modal
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, id: null })}
        title="Tolak Laporan"
        description="Berikan alasan penolakan sebagai feedback"
        icon={<X className="w-4.5 h-4.5" />}
        size="sm"
        variant="hero"
        footer={
          <>
            <button
              onClick={() => setRejectModal({ open: false, id: null })}
              className="h-10 px-5 rounded-button text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Batal
            </button>
            <button
              onClick={() => rejectModal.id && rejectMutation.mutate({ id: rejectModal.id, catatan: rejectCatatan })}
              disabled={rejectMutation.isPending || !rejectCatatan}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-button bg-error text-white text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {rejectMutation.isPending ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              Kirim Penolakan
            </button>
          </>
        }
      >
        <textarea
          value={rejectCatatan}
          onChange={(e) => setRejectCatatan(e.target.value)}
          placeholder="Contoh: Data sasaran tidak sesuai dengan kondisi lapangan..."
          rows={5}
          className="w-full text-[13px] font-medium rounded-button border border-border bg-surface text-text-main px-4 py-3 outline-none focus:border-error focus:ring-1 focus:ring-error/25 resize-none transition-all"
        />
      </Modal>
    </div>
  );
}
