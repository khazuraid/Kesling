"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Database,
  Eye,
  FunctionSquare,
  LayoutTemplate,
  ListChecks,
  Plus,
  Rows3,
  Settings2,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LaporanBuilderPreview } from "@/components/laporan-builder-preview";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";

type Tab = "umum" | "parameter" | "entitas" | "dataDasar" | "formula";

// ── Shared styles ──
const inputCls =
  "w-full h-9 px-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[#00A876] focus:shadow-[0_0_0_3px_rgba(0,168,118,0.12)] transition-all";
const labelCls =
  "block text-[9px] font-extrabold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))] mb-1.5";
const addBtnCls =
  "inline-flex items-center gap-2 h-9 px-4 rounded-full bg-[#BEF264] text-[#06281E] text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 transition";

// ── Emoji icon picker ──
const ICON_CHOICES = [
  "🏥",
  "🍽️",
  "🥤",
  "🚰",
  "🚽",
  "🏠",
  "🏫",
  "🏢",
  "🏭",
  "⛺",
  "🧪",
  "🧫",
  "💧",
  "🛁",
  "🧼",
  "🪣",
  "🧹",
  "🗑️",
  "♻️",
  "🌊",
  "🦟",
  "🐀",
  "🪳",
  "🐕",
  "🐄",
  "🌾",
  "🥬",
  "🍗",
  "🥛",
  "🍱",
  "🏪",
  "🛒",
  "🏬",
  "🏨",
  "⛽",
  "🚌",
  "✈️",
  "⚕️",
  "💉",
  "🩺",
  "📋",
  "📊",
  "📈",
  "📁",
  "🗂️",
  "✅",
  "🔍",
  "⚙️",
  "🛡️",
  "🚨",
];

function IconPicker({
  value,
  onChange,
  dark = false,
}: {
  value: string;
  onChange: (icon: string) => void;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full h-11 px-3 rounded-xl border flex items-center gap-3 transition-colors ${
          dark
            ? "border-white/15 bg-white/[0.06] hover:border-[#00A876]"
            : "border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:border-[#00A876]"
        }`}
      >
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-[18px] shrink-0 ${
            dark ? "bg-white/10" : "bg-[#0C1B16]"
          }`}
        >
          {value || "❓"}
        </span>
        <span className={`text-[11px] font-bold ${dark ? "text-white/60" : "text-[hsl(var(--muted-foreground))]"}`}>
          {value ? "Ganti ikon" : "Pilih ikon"}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute z-50 top-full mt-2 left-0 w-[288px] rounded-2xl border shadow-2xl p-3 ${
              dark ? "bg-[#0C1B16] border-white/15" : "bg-[hsl(var(--card))] border-[hsl(var(--border))]"
            }`}
          >
            <div className="grid grid-cols-10 gap-1">
              {ICON_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onChange(emoji);
                    setOpen(false);
                  }}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-[15px] transition-colors ${
                    value === emoji
                      ? "bg-[#00A876]/25 ring-1 ring-[#00A876]"
                      : dark
                        ? "hover:bg-white/10"
                        : "hover:bg-[#00A876]/10"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function LaporanBuilderPage() {
  const queryClient = useQueryClient();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("umum");
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "MODULE" | "PARAM" | "ENTITY";
    id: number;
    text: string;
  } | null>(null);

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["master-categories"],
    queryFn: async () => {
      const res = await fetch("/api/master/dynamic-categories");
      if (!res.ok) throw new Error("Failed to fetch dynamic categories");
      return res.json();
    },
  });

  const { data: masterJenis = { tpp: [], sarana: [], ttu: [] } } = useQuery<any>({
    queryKey: ["master-jenis"],
    queryFn: async () => {
      const res = await fetch("/api/master/jenis");
      if (!res.ok) throw new Error("Failed to fetch master jenis");
      return res.json();
    },
  });

  const selectedModule = categories.find((c) => c.id === selectedModuleId) || null;
  const moduleCode = String(selectedModule?.code || "").toLowerCase();
  const availableJenisList =
    moduleCode === "tpp"
      ? masterJenis.tpp || []
      : moduleCode === "ttu"
        ? masterJenis.ttu || []
        : ["spal", "sab", "jamban", "rumah"].includes(moduleCode)
          ? masterJenis.sarana || []
          : [];

  // ── Mutations ──
  const createModuleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/master/dynamic-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Module created");
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
      setSelectedModuleId(data.id);
      setIsCreatingModule(false);
      setActiveTab("umum");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ id, payload }: any) => {
      const res = await fetch(`/api/master/dynamic-categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master-categories"] }),
    onError: (err: any) => toast.error(err.message),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/master/dynamic-categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Module deleted");
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
      setSelectedModuleId(null);
      setDeleteConfirm(null);
    },
  });

  const addParamMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/master/dynamic-parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
    },
  });

  const updateParamMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/master/dynamic-parameters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master-categories"] }),
  });

  const deleteParamMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/master/dynamic-parameters?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Dihapus");
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
      setDeleteConfirm(null);
    },
  });

  const addEntityMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/master/dynamic-subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Entitas ditambahkan");
      if (data?.id) {
        setEntityForm((prev) => ({
          ...prev,
          [data.id]: {
            nama: data.nama ?? prev[data.id]?.nama ?? "",
            grup: data.grup ?? prev[data.id]?.grup ?? "",
          },
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
    },
  });

  const updateEntityMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/master/dynamic-subcategories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update entity");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master-categories"] }),
  });

  const deleteEntityMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/master/dynamic-subcategories?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Dihapus");
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
      setDeleteConfirm(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (payload: { table: string; items: any[] }) => {
      const res = await fetch("/api/master/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to reorder");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master-categories"] }),
  });

  // ── State forms ──
  const [modForm, setModForm] = useState<any>({});
  const [paramForm, setParamForm] = useState<Record<number, any>>({});
  const [entityForm, setEntityForm] = useState<Record<number, any>>({});

  const uniqueEntityGroups: string[] = Array.from(
    new Set<string>((selectedModule?.subCategories || []).map((sub: any) => (sub.grup || "").trim()).filter(Boolean)),
  );

  useEffect(() => {
    if (selectedModule && selectedModuleId !== null) {
      setModForm({
        nama: selectedModule.nama,
        code: selectedModule.code,
        deskripsi: selectedModule.deskripsi || "",
        icon: selectedModule.icon || "",
        isActive: selectedModule.isActive,
        isRowBased: selectedModule.isRowBased,
      });

      const pMap: any = {};
      selectedModule.parameters?.forEach((p: any) => {
        pMap[p.id] = {
          nama: p.nama,
          code: p.code,
          type: p.type,
          required: p.required,
          isBaseline: p.isBaseline,
          min: p.config?.min || "",
          max: p.config?.max || "",
          options: p.config?.options || "",
          optionsSource: p.config?.optionsSource || "",
          syncToParamId: p.config?.syncToParamId || "",
          syncMode: p.config?.syncMode || "COUNT",
          syncToEntityField: p.config?.syncToEntityField || "",
          entitySubCategoryNama: p.config?.entitySubCategoryNama || "",
          numeratorCode: p.config?.formula?.numeratorCode || "",
          denominatorCode: p.config?.formula?.denominatorCode || "",
        };
      });
      setParamForm(pMap);

      const eMap: any = {};
      selectedModule.subCategories?.forEach((sub: any) => {
        eMap[sub.id] = {
          nama: sub.nama,
          grup: sub.grup || "",
        };
      });
      setEntityForm(eMap);
    }
  }, [selectedModuleId]);

  const saveModuleSettings = (override?: any) => {
    if (!selectedModule) return;
    updateModuleMutation.mutate({ id: selectedModule.id, payload: override || modForm });
  };

  const saveParamSettings = (id: number, form: any) => {
    if (!selectedModule) return;
    const config: any = {};
    if (form.type === "NUMBER" || form.type === "DECIMAL") {
      if (form.min !== "") config.min = Number(form.min);
      if (form.max !== "") config.max = Number(form.max);
    }
    if (form.type === "SELECT") {
      if (form.options) config.options = form.options;
      if (form.optionsSource) config.optionsSource = form.optionsSource;
    }
    if (form.isBaseline && form.syncToParamId) {
      config.syncToParamId = Number(form.syncToParamId);
      config.syncMode = form.syncMode || "COUNT";
    }
    if (form.isBaseline && form.syncToEntityField) {
      config.syncToEntityField = form.syncToEntityField;
    }
    if (form.isBaseline && form.entitySubCategoryNama) {
      config.entitySubCategoryNama = form.entitySubCategoryNama;
    }
    if (form.type === "FORMULA") {
      config.formula = {
        numeratorCode: form.numeratorCode || "",
        denominatorCode: form.denominatorCode || "",
      };
    }
    updateParamMutation.mutate({
      id: id,
      nama: form.nama,
      code: form.code,
      type: form.type,
      required: form.required,
      isBaseline: form.isBaseline,
      config: Object.keys(config).length > 0 ? config : null,
    });
  };

  const moveParam = (paramId: number, direction: -1 | 1, group: "report" | "baseline" | "formula" = "report") => {
    if (!selectedModule) return;
    const params = [...selectedModule.parameters].sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
    const inGroup = (p: any) =>
      group === "formula"
        ? p.type === "FORMULA"
        : group === "baseline"
          ? p.type !== "FORMULA" && p.isBaseline
          : p.type !== "FORMULA" && !p.isBaseline;
    const groupParams = params.filter(inGroup);
    const index = groupParams.findIndex((p: any) => p.id === paramId);
    if (index < 0 || index + direction < 0 || index + direction >= groupParams.length) return;

    const a = groupParams[index];
    const b = groupParams[index + direction];
    reorderMutation.mutate({
      table: "dynamicParameter",
      items: params.map((p: any) => ({
        id: p.id,
        urutan: p.id === a.id ? b.urutan || 0 : p.id === b.id ? a.urutan || 0 : p.urutan || 0,
      })),
    });
  };

  const reportParams = selectedModule?.parameters?.filter((p: any) => p.type !== "FORMULA" && !p.isBaseline) || [];
  const dataDasarParams = selectedModule?.parameters?.filter((p: any) => p.type !== "FORMULA" && p.isBaseline) || [];
  const numericReportParams = reportParams.filter((p: any) => p.type === "NUMBER" || p.type === "DECIMAL");
  const formulaParams = selectedModule?.parameters?.filter((p: any) => p.type === "FORMULA") || [];

  // ══════════════════ INDEX MODE (no module selected) ══════════════════
  if (!selectedModule) {
    return (
      <div className="w-full mx-auto pb-4 fade-in">
        {/* Masthead */}
        <div className="relative overflow-hidden bg-[#0C1B16] text-white">
          <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#00A876] opacity-[0.12]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#123527_0%,transparent_55%)]" />
          <div className="relative z-10 px-8 py-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-2">
                Laporan Builder
              </p>
              <h1 className="text-[30px] font-black tracking-[-0.03em] leading-none">Format Laporan</h1>
              <p className="text-[13px] font-medium text-white/50 mt-2">
                {categories.length} modul terdaftar · rancang struktur input tiap modul
              </p>
            </div>
            <button
              onClick={() => setIsCreatingModule(true)}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#BEF264] text-[#06281E] text-[12px] font-extrabold hover:brightness-95 transition"
            >
              <Plus className="w-4 h-4" /> Modul Baru
            </button>
          </div>
        </div>

        {/* Module cards */}
        <div className="pt-6">
          {categories.length === 0 ? (
            <EmptyState
              icon={LayoutTemplate}
              title="Belum ada modul"
              description="Buat modul laporan pertama untuk mulai merancang format input puskesmas."
              actionLabel="Buat Modul"
              onAction={() => setIsCreatingModule(true)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat) => {
                const pCount = cat.parameters?.filter((p: any) => p.type !== "FORMULA" && !p.isBaseline).length || 0;
                const ddCount = cat.parameters?.filter((p: any) => p.type !== "FORMULA" && p.isBaseline).length || 0;
                const fCount = cat.parameters?.filter((p: any) => p.type === "FORMULA").length || 0;
                const eCount = cat.subCategories?.length || 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedModuleId(cat.id);
                      setActiveTab("umum");
                    }}
                    className="group text-left rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[#00A876]/50 p-6 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="w-12 h-12 rounded-2xl bg-[#0C1B16] flex items-center justify-center text-[22px]">
                        {cat.icon || "📋"}
                      </span>
                      <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-1 rounded-full font-mono">
                        {cat.code}
                      </span>
                    </div>
                    <p className="text-[15px] font-extrabold text-[hsl(var(--foreground))] leading-tight mb-1">
                      {cat.nama}
                    </p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">
                      {cat.isRowBased ? "Formulir matrix" : "Formulir tunggal"}
                    </p>
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[hsl(var(--border))]/60 text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                      <span className="tabular-nums">{pCount} param</span>
                      {cat.isRowBased && <span className="tabular-nums">{eCount} entitas</span>}
                      {ddCount > 0 && <span className="tabular-nums">{ddCount} baseline</span>}
                      {fCount > 0 && <span className="tabular-nums text-[#00A876]">{fCount} formula</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <CreateModuleModal
          open={isCreatingModule}
          onClose={() => setIsCreatingModule(false)}
          mutation={createModuleMutation}
        />
        <DeleteModal
          target={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => {
            if (!deleteConfirm) return;
            if (deleteConfirm.type === "MODULE") deleteModuleMutation.mutate(deleteConfirm.id);
            if (deleteConfirm.type === "PARAM") deleteParamMutation.mutate(deleteConfirm.id);
            if (deleteConfirm.type === "ENTITY") deleteEntityMutation.mutate(deleteConfirm.id);
          }}
        />
      </div>
    );
  }

  // ══════════════════ EDITOR MODE ══════════════════
  const NAV: { key: Tab; label: string; icon: any; count?: number; hidden?: boolean }[] = [
    { key: "umum", label: "Umum", icon: Settings2 },
    { key: "parameter", label: "Parameter", icon: ListChecks, count: reportParams.length },
    {
      key: "entitas",
      label: "Entitas",
      icon: Rows3,
      count: selectedModule.subCategories?.length,
      hidden: !selectedModule.isRowBased,
    },
    { key: "dataDasar", label: "Data Dasar", icon: Database, count: dataDasarParams.length },
    { key: "formula", label: "Formula", icon: FunctionSquare, count: formulaParams.length },
  ];

  return (
    <div className="flex h-[calc(100dvh-4rem)] overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] fade-in">
      {/* ── LEFT: structure rail ── */}
      <aside className="w-[248px] shrink-0 bg-[#0C1B16] flex flex-col">
        {/* Back + module identity */}
        <div className="px-4 pt-4 pb-3">
          <button
            onClick={() => setSelectedModuleId(null)}
            className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/40 hover:text-[#7CF5CE] transition-colors mb-3"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Semua Modul
          </button>
          <div className="flex items-center gap-3 px-1">
            <span className="w-11 h-11 rounded-2xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-[20px] shrink-0">
              {selectedModule.icon || "📋"}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-white leading-tight truncate">{selectedModule.nama}</p>
              <p className="text-[9px] font-bold text-white/40 font-mono mt-1 truncate">{selectedModule.code}</p>
            </div>
          </div>
        </div>

        <div className="mx-4 h-px bg-white/[0.07]" />

        {/* Structure nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV.filter((t) => !t.hidden).map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  active ? "bg-[#00A876]/15 border border-[#00A876]/30" : "border border-transparent hover:bg-white/5"
                }`}
              >
                <t.icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-[#7CF5CE]" : "text-white/40"}`} />
                <span className={`flex-1 text-[12px] font-bold ${active ? "text-[#7CF5CE]" : "text-white/70"}`}>
                  {t.label}
                </span>
                {t.count !== undefined && (
                  <span
                    className={`text-[9px] font-extrabold tabular-nums px-1.5 py-px rounded-full ${
                      active ? "bg-[#BEF264] text-[#06281E]" : "bg-white/10 text-white/50"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Preview CTA bottom */}
        <div className="p-3">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-[#BEF264] text-[#06281E] text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 transition"
          >
            <Eye className="w-3.5 h-3.5" /> Preview Form
          </button>
        </div>
      </aside>

      {/* ── CANVAS ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-7">
          {/* Section heading */}
          <div className="mb-6">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#00A876] mb-1">
              {selectedModule.nama}
            </p>
            <h2 className="text-[22px] font-black tracking-[-0.02em] text-[hsl(var(--foreground))]">
              {NAV.find((t) => t.key === activeTab)?.label}
            </h2>
          </div>

          {/* TAB: UMUM */}
          {activeTab === "umum" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
                <div>
                  <label className={labelCls}>Nama Modul</label>
                  <input
                    value={modForm.nama || ""}
                    onChange={(e) => setModForm({ ...modForm, nama: e.target.value })}
                    onBlur={() => saveModuleSettings()}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Deskripsi Singkat</label>
                  <textarea
                    value={modForm.deskripsi || ""}
                    onChange={(e) => setModForm({ ...modForm, deskripsi: e.target.value })}
                    onBlur={() => saveModuleSettings()}
                    rows={3}
                    className="w-full text-[12px] font-medium px-3 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] outline-none focus:border-[#00A876] focus:shadow-[0_0_0_3px_rgba(0,168,118,0.12)] resize-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Icon Modul</label>
                    <IconPicker
                      value={modForm.icon || ""}
                      onChange={(emoji) => {
                        const u = { ...modForm, icon: emoji };
                        setModForm(u);
                        saveModuleSettings(u);
                      }}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Format Input Data</label>
                    <select
                      value={modForm.isRowBased ? "true" : "false"}
                      onChange={(e) => {
                        const nextVal = e.target.value === "true";
                        setModForm({ ...modForm, isRowBased: nextVal });
                        saveModuleSettings({ ...modForm, isRowBased: nextVal });
                      }}
                      className={inputCls}
                    >
                      <option value="false">Formulir Kolom Tunggal</option>
                      <option value="true">Formulir Tabel (Matrix)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E15A4F]/25 bg-[#E15A4F]/[0.03] p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[12px] font-extrabold text-[hsl(var(--foreground))]">Hapus Modul</p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    Menghapus modul beserta seluruh parameter dan entitasnya.
                  </p>
                </div>
                <button
                  onClick={() => setDeleteConfirm({ type: "MODULE", id: selectedModule.id, text: selectedModule.nama })}
                  className="shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-full border border-[#E15A4F]/40 text-[#E15A4F] text-[11px] font-extrabold hover:bg-[#E15A4F]/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              </div>
            </div>
          )}

          {/* TAB: PARAMETER */}
          {activeTab === "parameter" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                  {reportParams.length} parameter laporan
                </p>
                <button
                  onClick={() =>
                    addParamMutation.mutate({
                      categoryId: selectedModule.id,
                      nama: "Parameter Baru",
                      code: `param_${Date.now()}`,
                      type: "NUMBER",
                      isBaseline: false,
                    })
                  }
                  className={addBtnCls}
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              </div>

              {reportParams.length === 0 && (
                <EmptyState
                  icon={ListChecks}
                  title="Belum ada parameter"
                  description="Tambahkan parameter pertama — kolom input yang akan diisi puskesmas setiap bulan."
                />
              )}

              <div className="space-y-2.5">
                {reportParams.map((p: any, idx: number) => {
                  const localState = paramForm[p.id] || p;
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 flex gap-3 hover:border-[#00A876]/30 transition-colors"
                    >
                      <div className="flex flex-col gap-1 shrink-0 pt-1">
                        <button
                          onClick={() => moveParam(p.id, -1, "report")}
                          disabled={idx === 0}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[#00A876] hover:bg-[#00A876]/10 disabled:opacity-25 transition-colors"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveParam(p.id, 1, "report")}
                          disabled={idx === reportParams.length - 1}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[#00A876] hover:bg-[#00A876]/10 disabled:opacity-25 transition-colors"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Nama Parameter</label>
                          <input
                            type="text"
                            className={inputCls}
                            value={localState.nama || ""}
                            onChange={(e) => {
                              const u = { ...localState, nama: e.target.value };
                              setParamForm({ ...paramForm, [p.id]: u });
                            }}
                            onBlur={() => saveParamSettings(p.id, paramForm[p.id] || localState)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className={labelCls}>Tipe Input</label>
                            <select
                              className={inputCls}
                              value={localState.type}
                              onChange={(e) => {
                                const u = { ...localState, type: e.target.value };
                                setParamForm({ ...paramForm, [p.id]: u });
                                saveParamSettings(p.id, u);
                              }}
                            >
                              <option value="NUMBER">Angka Bulat</option>
                              <option value="DECIMAL">Angka Desimal</option>
                              <option value="TEXT">Teks Singkat</option>
                              <option value="TEXTAREA">Teks Panjang</option>
                              <option value="SELECT">Pilihan (Dropdown)</option>
                              <option value="DATE">Tanggal</option>
                            </select>
                          </div>
                          <button
                            onClick={() => setDeleteConfirm({ type: "PARAM", id: p.id, text: p.nama })}
                            className="mt-5 w-9 h-9 rounded-xl flex items-center justify-center text-[#E15A4F]/70 hover:bg-[#E15A4F]/10 hover:text-[#E15A4F] shrink-0 border border-[hsl(var(--border))] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div>
                          <label className={labelCls}>Kode</label>
                          <input
                            type="text"
                            className={`${inputCls} font-mono`}
                            value={localState.code || ""}
                            onChange={(e) => {
                              const u = { ...localState, code: e.target.value };
                              setParamForm({ ...paramForm, [p.id]: u });
                            }}
                            onBlur={() => saveParamSettings(p.id, paramForm[p.id] || localState)}
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!localState.required}
                              onChange={(e) => {
                                const u = { ...localState, required: e.target.checked };
                                setParamForm({ ...paramForm, [p.id]: u });
                                saveParamSettings(p.id, u);
                              }}
                              className="w-4 h-4 rounded accent-[#00A876]"
                            />
                            Wajib diisi
                          </label>
                        </div>
                        {localState.type === "SELECT" && (
                          <div className="col-span-2">
                            <label className={labelCls}>Opsi Dropdown (pisahkan koma/baris)</label>
                            <textarea
                              rows={2}
                              className="w-full px-3 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[12px] font-medium outline-none focus:border-[#00A876] resize-none transition-all"
                              value={localState.options || ""}
                              onChange={(e) => {
                                const u = { ...localState, options: e.target.value };
                                setParamForm({ ...paramForm, [p.id]: u });
                              }}
                              onBlur={() => saveParamSettings(p.id, paramForm[p.id] || localState)}
                              placeholder="Aktif, Tidak Aktif, Proses"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: ENTITAS */}
          {activeTab === "entitas" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#00A876]/20 bg-[#00A876]/[0.04] px-4 py-3 text-[12px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                Entitas dipakai untuk mengelompokkan data di halaman Data Dasar. Kosongkan kolom Kategori jika tidak
                perlu pengelompokan.
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() =>
                    addEntityMutation.mutate({
                      categoryId: selectedModule.id,
                      nama: "Entitas Baru",
                      grup: null,
                    })
                  }
                  className={addBtnCls}
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Entitas
                </button>
              </div>

              <div className="space-y-2">
                {selectedModule.subCategories?.length === 0 && (
                  <EmptyState
                    icon={Rows3}
                    title="Belum ada entitas"
                    description="Tambah entitas manual untuk mengisi baris sasaran pada form matrix."
                  />
                )}
                {selectedModule.subCategories?.map((sub: any) => {
                  const localState = entityForm[sub.id] || { nama: sub.nama, grup: sub.grup || "" };
                  return (
                    <div
                      key={sub.id}
                      className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] grid grid-cols-1 md:grid-cols-[1fr_220px_auto] items-end px-4 py-3.5 gap-3 hover:border-[#00A876]/30 transition-colors"
                    >
                      <div>
                        <label className={labelCls}>Nama Entitas</label>
                        <input
                          type="text"
                          className={inputCls}
                          value={localState.nama || ""}
                          onChange={(e) =>
                            setEntityForm({ ...entityForm, [sub.id]: { ...localState, nama: e.target.value } })
                          }
                          onBlur={() =>
                            updateEntityMutation.mutate({ id: sub.id, ...(entityForm[sub.id] || localState) })
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Kategori / Grup</label>
                        {availableJenisList.length > 0 ? (
                          <select
                            className={inputCls}
                            value={localState.grup || ""}
                            onChange={(e) => {
                              const u = { ...localState, grup: e.target.value };
                              setEntityForm({ ...entityForm, [sub.id]: u });
                              updateEntityMutation.mutate({ id: sub.id, ...u });
                            }}
                          >
                            <option value="">— Tanpa Kategori —</option>
                            {Array.from(
                              new Set<string>(availableJenisList.map((j: any) => j.kategori).filter(Boolean)),
                            ).map((kat) => (
                              <option key={String(kat)} value={String(kat)}>
                                {String(kat)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            list={`entity-groups-${selectedModule.id}`}
                            className={inputCls}
                            value={localState.grup || ""}
                            onChange={(e) =>
                              setEntityForm({
                                ...entityForm,
                                [sub.id]: { ...localState, grup: e.target.value },
                              })
                            }
                            onBlur={() =>
                              updateEntityMutation.mutate({ id: sub.id, ...(entityForm[sub.id] || localState) })
                            }
                            placeholder="Tanpa kategori"
                          />
                        )}
                        <datalist id={`entity-groups-${selectedModule.id}`}>
                          {uniqueEntityGroups.map((group) => (
                            <option key={group} value={group} />
                          ))}
                        </datalist>
                      </div>
                      <button
                        onClick={() => setDeleteConfirm({ type: "ENTITY", id: sub.id, text: sub.nama })}
                        className="h-9 w-9 rounded-xl flex items-center justify-center text-[#E15A4F]/70 hover:bg-[#E15A4F]/10 hover:text-[#E15A4F] border border-[hsl(var(--border))] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: DATA DASAR */}
          {activeTab === "dataDasar" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#00A876]/20 bg-[#00A876]/[0.04] px-4 py-3 text-[12px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                Field di tab ini muncul di form Data Dasar. Opsional: hubungkan ke parameter laporan agar jumlah data
                otomatis mengisi laporan bulan berjalan.
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                  {dataDasarParams.length} field baseline
                </p>
                <button
                  onClick={() =>
                    addParamMutation.mutate({
                      categoryId: selectedModule.id,
                      nama: "Field Data Dasar Baru",
                      code: `data_dasar_${Date.now()}`,
                      type: "TEXT",
                      required: false,
                      isBaseline: true,
                    })
                  }
                  className={addBtnCls}
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Field
                </button>
              </div>

              {dataDasarParams.length === 0 && (
                <EmptyState
                  icon={Database}
                  title="Belum ada field data dasar"
                  description="Data dasar adalah field baseline yang diisi sekali per tahun (mis. jumlah sasaran wilayah)."
                />
              )}

              <div className="space-y-3">
                {dataDasarParams.map((p: any) => {
                  const localState = paramForm[p.id] || p;
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3 hover:border-[#00A876]/30 transition-colors"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_140px_auto] gap-3 items-end">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <label className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))]">
                              Nama Field
                            </label>
                            {localState.syncToEntityField && (
                              <span className="text-[8px] px-1.5 py-px rounded-full bg-[#00A876]/10 text-[#00A876] border border-[#00A876]/25 font-extrabold uppercase tracking-wide">
                                🔗 {localState.syncToEntityField}
                              </span>
                            )}
                          </div>
                          <input
                            className={inputCls}
                            value={localState.nama || ""}
                            onChange={(e) =>
                              setParamForm({ ...paramForm, [p.id]: { ...localState, nama: e.target.value } })
                            }
                            onBlur={() => saveParamSettings(p.id, paramForm[p.id] || localState)}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Kode</label>
                          <input
                            className={`${inputCls} font-mono`}
                            value={localState.code || ""}
                            onChange={(e) =>
                              setParamForm({ ...paramForm, [p.id]: { ...localState, code: e.target.value } })
                            }
                            onBlur={() => saveParamSettings(p.id, paramForm[p.id] || localState)}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Tipe</label>
                          <select
                            className={inputCls}
                            value={localState.type || "TEXT"}
                            onChange={(e) => {
                              const u = { ...localState, type: e.target.value, isBaseline: true };
                              setParamForm({ ...paramForm, [p.id]: u });
                              saveParamSettings(p.id, u);
                            }}
                          >
                            <option value="TEXT">Teks</option>
                            <option value="TEXTAREA">Teks Panjang</option>
                            <option value="SELECT">Dropdown</option>
                            <option value="DATE">Tanggal</option>
                            <option value="NUMBER">Angka</option>
                            <option value="DECIMAL">Desimal</option>
                          </select>
                        </div>
                        <button
                          onClick={() => setDeleteConfirm({ type: "PARAM", id: p.id, text: p.nama })}
                          className="h-9 w-9 rounded-xl flex items-center justify-center text-[#E15A4F]/70 hover:bg-[#E15A4F]/10 hover:text-[#E15A4F] border border-[hsl(var(--border))] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <label className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!localState.required}
                          onChange={(e) => {
                            const u = { ...localState, required: e.target.checked, isBaseline: true };
                            setParamForm({ ...paramForm, [p.id]: u });
                            saveParamSettings(p.id, u);
                          }}
                          className="w-4 h-4 rounded accent-[#00A876]"
                        />
                        Wajib diisi
                      </label>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl border border-[hsl(var(--border))]/70 bg-[hsl(var(--muted))]/20">
                        <div>
                          <label className={labelCls}>Sinkron ke Parameter</label>
                          <select
                            className={inputCls}
                            value={localState.syncToParamId || ""}
                            onChange={(e) => {
                              const u = { ...localState, syncToParamId: e.target.value, isBaseline: true };
                              setParamForm({ ...paramForm, [p.id]: u });
                              saveParamSettings(p.id, u);
                            }}
                          >
                            <option value="">Tidak dihubungkan</option>
                            {reportParams
                              .filter((tp: any) => tp.type === "NUMBER" || tp.type === "DECIMAL")
                              .map((tp: any) => (
                                <option key={tp.id} value={tp.id}>
                                  {tp.nama} ({tp.code})
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Sinkron ke Field Entitas</label>
                          <select
                            className={inputCls}
                            value={localState.syncToEntityField || ""}
                            onChange={(e) => {
                              const u = { ...localState, syncToEntityField: e.target.value, isBaseline: true };
                              setParamForm({ ...paramForm, [p.id]: u });
                              saveParamSettings(p.id, u);
                            }}
                          >
                            <option value="">Tidak dihubungkan</option>
                            <option value="nama">Nama Entitas</option>
                            <option value="alamat">Alamat</option>
                            <option value="pemilik">Pemilik / Pengelola</option>
                            <option value="kontak">Kontak / Telepon</option>
                            <option value="lat">Latitude (Y)</option>
                            <option value="lng">Longitude (X)</option>
                          </select>
                        </div>
                        <div>
                          {localState.syncToParamId && (
                            <>
                              <label className={labelCls}>Metode Hitung</label>
                              <select
                                className={inputCls}
                                value={localState.syncMode || "COUNT"}
                                onChange={(e) => {
                                  const u = { ...localState, syncMode: e.target.value, isBaseline: true };
                                  setParamForm({ ...paramForm, [p.id]: u });
                                  saveParamSettings(p.id, u);
                                }}
                              >
                                <option value="COUNT">Hitung jumlah entri</option>
                                {(localState.type === "NUMBER" || localState.type === "DECIMAL") && (
                                  <option value="SUM">Jumlahkan nilai</option>
                                )}
                              </select>
                            </>
                          )}
                        </div>
                      </div>

                      {localState.type === "SELECT" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Sumber Pilihan</label>
                            <select
                              className={inputCls}
                              value={localState.optionsSource || "manual"}
                              onChange={(e) => {
                                const u = {
                                  ...localState,
                                  optionsSource: e.target.value,
                                  isBaseline: true,
                                };
                                setParamForm({ ...paramForm, [p.id]: u });
                                saveParamSettings(p.id, u);
                              }}
                            >
                              <option value="auto_category">Kategori Sesuai Modul</option>
                              <option value="manual">Opsi Manual</option>
                              <option value="entities">Daftar Entitas</option>
                              <option value="master_tpp">Master Jenis TPP</option>
                              <option value="master_ttu">Master Jenis TTU</option>
                              <option value="master_sarana">Master Jenis Sarana</option>
                            </select>
                          </div>
                          <div>
                            {(!localState.optionsSource || localState.optionsSource === "manual") && (
                              <>
                                <label className={labelCls}>Opsi (per baris / koma)</label>
                                <textarea
                                  rows={2}
                                  className="w-full px-3 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[12px] font-medium outline-none focus:border-[#00A876] resize-none transition-all"
                                  value={localState.options || ""}
                                  onChange={(e) =>
                                    setParamForm({
                                      ...paramForm,
                                      [p.id]: { ...localState, options: e.target.value, isBaseline: true },
                                    })
                                  }
                                  onBlur={() => saveParamSettings(p.id, paramForm[p.id] || localState)}
                                  placeholder="Aktif, Tidak Aktif, Proses"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: FORMULA */}
          {activeTab === "formula" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                  {formulaParams.length} formula penilaian
                </p>
                <button
                  onClick={() =>
                    addParamMutation.mutate({
                      categoryId: selectedModule.id,
                      nama: "Formula Baru",
                      code: `formula_${Date.now()}`,
                      type: "FORMULA",
                    })
                  }
                  className={addBtnCls}
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Formula
                </button>
              </div>

              {formulaParams.length === 0 && (
                <EmptyState
                  icon={FunctionSquare}
                  title="Belum ada formula"
                  description="Formula menghitung persen capaian otomatis dari parameter numerik (pembilang ÷ penyebut × 100%)."
                />
              )}

              <div className="space-y-3">
                {formulaParams.map((p: any) => {
                  const localState = paramForm[p.id] || p;
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-[hsl(var(--border))]/70 flex items-center justify-between bg-[hsl(var(--muted))]/20">
                        <input
                          type="text"
                          className="font-extrabold text-[13px] bg-transparent outline-none w-1/2 text-[hsl(var(--foreground))] focus:border-b-2 focus:border-[#00A876]"
                          value={localState.nama || ""}
                          onChange={(e) => {
                            const u = { ...localState, nama: e.target.value };
                            setParamForm({ ...paramForm, [p.id]: u });
                          }}
                          onBlur={() => saveParamSettings(p.id, paramForm[p.id] || localState)}
                          placeholder="Nama Formula"
                        />
                        <button
                          onClick={() => setDeleteConfirm({ type: "PARAM", id: p.id, text: p.nama })}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-[#E15A4F]/70 hover:bg-[#E15A4F]/10 hover:text-[#E15A4F] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="px-4 py-7 flex items-center justify-center gap-3 bg-[#0C1B16]/[0.03]">
                        <span className="text-3xl font-light text-[hsl(var(--muted-foreground))]/40">(</span>
                        <select
                          className="h-11 px-3.5 rounded-xl border-2 border-[#00A876]/40 bg-[#00A876]/[0.07] text-[#00A876] font-extrabold text-[12px] outline-none focus:border-[#00A876] cursor-pointer"
                          value={localState.numeratorCode || ""}
                          onChange={(e) => {
                            const u = { ...localState, numeratorCode: e.target.value };
                            setParamForm({ ...paramForm, [p.id]: u });
                            saveParamSettings(p.id, u);
                          }}
                        >
                          <option value="">+ Pembilang</option>
                          {numericReportParams.map((dp: any) => (
                            <option key={dp.code} value={dp.code}>
                              {dp.nama}
                            </option>
                          ))}
                        </select>
                        <span className="text-xl font-black text-[hsl(var(--muted-foreground))]">/</span>
                        <select
                          className="h-11 px-3.5 rounded-xl border-2 border-[#E8A33D]/40 bg-[#E8A33D]/[0.07] text-[#C07F1F] font-extrabold text-[12px] outline-none focus:border-[#E8A33D] cursor-pointer"
                          value={localState.denominatorCode || ""}
                          onChange={(e) => {
                            const u = { ...localState, denominatorCode: e.target.value };
                            setParamForm({ ...paramForm, [p.id]: u });
                            saveParamSettings(p.id, u);
                          }}
                        >
                          <option value="">+ Penyebut</option>
                          {numericReportParams.map((dp: any) => (
                            <option key={dp.code} value={dp.code}>
                              {dp.nama}
                            </option>
                          ))}
                        </select>
                        <span className="text-3xl font-light text-[hsl(var(--muted-foreground))]/40">)</span>
                        <span className="text-[15px] font-black text-[hsl(var(--foreground))]">× 100%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <DeleteModal
        target={deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (!deleteConfirm) return;
          if (deleteConfirm.type === "MODULE") deleteModuleMutation.mutate(deleteConfirm.id);
          if (deleteConfirm.type === "PARAM") deleteParamMutation.mutate(deleteConfirm.id);
          if (deleteConfirm.type === "ENTITY") deleteEntityMutation.mutate(deleteConfirm.id);
        }}
      />
      <LaporanBuilderPreview isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} module={selectedModule} />
    </div>
  );
}

// ─── Sub-modals ───────────────────────────────────────────────────────────────

function DeleteModal({
  target,
  onClose,
  onConfirm,
}: {
  target: { type: string; id: number; text: string } | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Hapus Data?"
      description={`Anda yakin ingin menghapus "${target?.text}"? Tindakan ini tidak bisa dibatalkan.`}
      icon={<Trash2 className="w-4.5 h-4.5" />}
      size="sm"
      variant="hero"
      footer={
        <>
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-[#E15A4F] text-white text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hapus
          </button>
        </>
      }
    >
      <div className="rounded-2xl border border-[#E15A4F]/25 bg-[#E15A4F]/[0.05] px-4 py-3 text-[12px] text-[hsl(var(--muted-foreground))]">
        Data yang sudah terhapus tidak dapat dikembalikan. Pastikan tidak ada laporan aktif yang bergantung pada item
        ini.
      </div>
    </Modal>
  );
}

function CreateModuleModal({
  open,
  onClose,
  mutation,
}: {
  open: boolean;
  onClose: () => void;
  mutation: { isPending: boolean; mutate: (payload: any) => void };
}) {
  const [icon, setIcon] = useState("📋");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buat Modul Laporan"
      description="Modul baru akan muncul sebagai menu laporan di sidebar"
      icon={<LayoutTemplate className="w-4.5 h-4.5" />}
      size="sm"
      variant="hero"
      footer={
        <>
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="create-module-form"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-[#BEF264] text-[#06281E] text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 transition disabled:opacity-50"
          >
            {mutation.isPending ? (
              <span className="w-3.5 h-3.5 border-2 border-[#06281E]/30 border-t-[#06281E] rounded-full animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Simpan & Lanjutkan
          </button>
        </>
      }
    >
      <form
        id="create-module-form"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          mutation.mutate({
            nama: fd.get("nama"),
            code: fd.get("code"),
            icon,
            isRowBased: true,
            isActive: true,
          });
        }}
        className="space-y-4"
      >
        <div>
          <label className={labelCls}>Icon Modul</label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
        <div>
          <label className={labelCls}>Nama Modul</label>
          <input name="nama" required className={inputCls} placeholder="cth: Tempat Pengolahan Pangan" />
        </div>
        <div>
          <label className={labelCls}>Kode (Unik)</label>
          <input name="code" required className={`${inputCls} font-mono`} placeholder="cth: tpp" />
        </div>
      </form>
    </Modal>
  );
}
