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
    chip: "bg-[#E8A33D]/10 text-[#C07F1F] border border-[#E8A33D]/25",
    dot: "bg-[#E8A33D]",
    label: "Menunggu",
  },
  APPROVED: {
    chip: "bg-[#00A876]/10 text-[#00A876] border border-[#00A876]/25",
    dot: "bg-[#00A876]",
    label: "Disetujui",
  },
  REJECTED: {
    chip: "bg-[#E15A4F]/10 text-[#E15A4F] border border-[#E15A4F]/25",
    dot: "bg-[#E15A4F]",
    label: "Ditolak",
  },
  DRAFT: {
    chip: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]",
    dot: "bg-[hsl(var(--muted-foreground))]",
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
    <div className="w-full mx-auto pb-4 fade-in">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-[#0C1B16] text-white">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#00A876] opacity-[0.12]" />
        <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-[#E8A33D] opacity-[0.07]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#123527_0%,transparent_55%)]" />

        <div className="relative z-10 px-8 py-7 flex flex-wrap items-center gap-8">
          {/* Big pending number */}
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 rounded-3xl bg-[#E8A33D]/15 border border-[#E8A33D]/25 flex flex-col items-center justify-center">
              <span className="text-[30px] font-black tabular-nums leading-none text-[#F5C97C]">{stats.submitted}</span>
              <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[#F5C97C]/60 mt-1">
                Menunggu
              </span>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-1.5">
                Verifikasi
              </p>
              <h1 className="text-[28px] font-black tracking-[-0.03em] leading-none">Pusat Approval</h1>
              <p className="text-[12px] font-medium text-white/50 mt-2">
                {stats.approved} disetujui · {stats.draft} draft · {stats.total} total
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {/* Category select — dark pill */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-10 px-4 rounded-full bg-white/[0.08] border border-white/15 text-[12px] font-bold text-white outline-none focus:border-[#00A876] transition-colors appearance-none cursor-pointer [&>option]:text-black"
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

        {/* Status tabs — bottom edge of hero */}
        <div className="relative z-10 px-8 pb-5">
          <div className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterTab(t.key)}
                className={`inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
                  filterTab === t.key ? "bg-[#BEF264] text-[#06281E]" : "text-white/60 hover:text-white"
                }`}
              >
                {t.label}
                <span
                  className={`text-[10px] font-extrabold tabular-nums px-1.5 py-px rounded-full ${
                    filterTab === t.key ? "bg-[#06281E]/15 text-[#06281E]" : "bg-white/10 text-white/70"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── LIST ── */}
      <div className="pt-6">
        {loadingLaporan ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[hsl(var(--border))] border-t-[#00A876] animate-spin rounded-full" />
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
                      <h3 className="text-[13px] font-extrabold text-[hsl(var(--foreground))]">{c.nama}</h3>
                      <span className="text-[10px] font-extrabold tabular-nums bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded-full">
                        {groupLaporan.length}
                      </span>
                      {pendingCount > 0 && (
                        <span className="text-[10px] font-extrabold tabular-nums bg-[#E8A33D]/10 text-[#C07F1F] border border-[#E8A33D]/25 px-2 py-0.5 rounded-full">
                          {pendingCount} menunggu
                        </span>
                      )}
                    </div>
                    {pendingCount > 0 && (
                      <button
                        onClick={() => handleGroupApprove(c.code)}
                        className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-[#BEF264] text-[#06281E] text-[11px] font-extrabold hover:brightness-95 transition"
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
                          className={`rounded-2xl border bg-[hsl(var(--card))] overflow-hidden transition-colors ${
                            expanded ? "border-[#00A876]/40" : "border-[hsl(var(--border))]"
                          }`}
                        >
                          <button
                            onClick={() => setExpandedId(expanded ? null : l.id)}
                            className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[hsl(var(--muted))]/30 transition-colors"
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[13px] font-bold text-[hsl(var(--foreground))] truncate">
                                {l.puskesmas.nama}
                              </h4>
                              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                                {BULAN_NAMA[l.bulan]} {l.tahun}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 inline-flex items-center h-6 px-2.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${meta.chip}`}
                            >
                              {meta.label}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 shrink-0 text-[hsl(var(--muted-foreground))] transition-transform ${expanded ? "rotate-180" : ""}`}
                            />
                          </button>

                          {expanded && (
                            <div className="px-5 pb-5 pt-4 space-y-4 border-t border-[hsl(var(--border))]/60">
                              {/* Detail */}
                              <div className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
                                {l.category.isRowBased && l.category.subCategories ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[11px] border-collapse">
                                      <thead>
                                        <tr className="bg-[hsl(var(--muted))]/40 border-b border-[hsl(var(--border))]">
                                          <th className="px-3 py-2.5 font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-[9px]">
                                            Entitas/Sasaran
                                          </th>
                                          {l.category.parameters?.map((p: any) => (
                                            <th
                                              key={p.id}
                                              className="px-3 py-2.5 font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-[9px]"
                                            >
                                              {p.nama}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[hsl(var(--border))]/50">
                                        {l.category.subCategories?.map((sub: any) => (
                                          <tr key={sub.id} className="hover:bg-[hsl(var(--muted))]/20">
                                            <td className="px-3 py-2.5 font-bold border-r border-[hsl(var(--border))]/50">
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
                                          <span className="block text-[9px] font-extrabold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))]">
                                            {p.nama}
                                          </span>
                                          <span className="block text-[13px] font-extrabold tabular-nums">
                                            {valObj?.value || "—"}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {l.catatan && (
                                <div className="px-4 py-3 rounded-2xl border border-[#E15A4F]/25 bg-[#E15A4F]/[0.05]">
                                  <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#E15A4F] block mb-1">
                                    Catatan Verifikasi
                                  </span>
                                  <p className="text-[12px] text-[hsl(var(--foreground))]">{l.catatan}</p>
                                </div>
                              )}

                              {l.status === "SUBMITTED" && (
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => setRejectModal({ open: true, id: l.id })}
                                    className="inline-flex items-center gap-2 h-9 px-5 rounded-full border border-[#E15A4F]/40 text-[#E15A4F] text-[11px] font-extrabold uppercase tracking-wider hover:bg-[#E15A4F]/10 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" /> Tolak
                                  </button>
                                  <button
                                    onClick={() => approveMutation.mutate({ ids: [l.id] })}
                                    disabled={approveMutation.isPending}
                                    className="inline-flex items-center gap-2 h-9 px-6 rounded-full bg-[#BEF264] text-[#06281E] text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 transition disabled:opacity-50"
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
              className="h-10 px-5 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              Batal
            </button>
            <button
              onClick={() => rejectModal.id && rejectMutation.mutate({ id: rejectModal.id, catatan: rejectCatatan })}
              disabled={rejectMutation.isPending || !rejectCatatan}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-[#E15A4F] text-white text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 transition disabled:opacity-50"
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
          className="w-full text-[13px] font-medium rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 outline-none focus:border-[#E15A4F] focus:shadow-[0_0_0_3px_rgba(225,90,79,0.12)] resize-none transition-all"
        />
      </Modal>
    </div>
  );
}
