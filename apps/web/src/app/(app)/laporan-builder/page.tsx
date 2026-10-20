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
import { Card } from "tamagui";
import { LaporanBuilderPreview } from "@/components/laporan-builder-preview";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";

type Tab = "umum" | "parameter" | "entitas" | "dataDasar" | "formula";

// ── Shared styles ──
const inputCls =
  "w-full h-9 px-3 rounded-xl border border-border bg-surface text-[12px] font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all";
const labelCls = "block text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground mb-1.5";
const addBtnCls =
  "inline-flex items-center gap-2 h-9 px-4 rounded-button bg-primary text-white text-[11px] font-extrabold uppercase tracking-wider hover:bg-primary-hover shadow-subtle transition";

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

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-11 px-3 rounded-xl border border-border bg-surface hover:border-primary flex items-center gap-3 transition-colors cursor-pointer"
      >
        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[18px] shrink-0 bg-surface-subtle text-foreground border border-border">
          {value || "❓"}
        </span>
        <span className="text-[11px] font-bold text-muted-foreground">{value ? "Ganti ikon" : "Pilih ikon"}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-full mt-2 left-0 w-[288px] rounded-card border border-border shadow-float p-3 bg-surface text-foreground">
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
                    value === emoji ? "bg-primary-subtle text-primary ring-1 ring-primary" : "hover:bg-surface-subtle"
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

function OrderButtons({
  index,
  total,
  onMoveUp,
  onMoveDown,
  dark = false,
}: {
  index: number;
  total: number;
  onMoveUp: (e: React.MouseEvent) => void;
  onMoveDown: (e: React.MouseEvent) => void;
  dark?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-lg p-0.5 border shrink-0 ${
        dark ? "bg-white/5 border-white/10" : "bg-surface-subtle border-border"
      }`}
    >
      <button
        type="button"
        onClick={onMoveUp}
        disabled={index === 0}
        title="Pindah ke atas"
        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
          dark
            ? "text-white/60 hover:text-emerald-300 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent"
            : "text-muted-foreground hover:text-primary hover:bg-primary-subtle disabled:opacity-25 disabled:hover:bg-transparent"
        }`}
      >
        <ArrowUp className="w-3.5 h-3.5" />
      </button>
      <span
        className={`text-[10px] font-mono font-bold px-1 min-w-[18px] text-center tabular-nums ${
          dark ? "text-white/40" : "text-muted-foreground"
        }`}
      >
        {index + 1}
      </span>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={index === total - 1}
        title="Pindah ke bawah"
        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
          dark
            ? "text-white/60 hover:text-emerald-300 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent"
            : "text-muted-foreground hover:text-primary hover:bg-primary-subtle disabled:opacity-25 disabled:hover:bg-transparent"
        }`}
      >
        <ArrowDown className="w-3.5 h-3.5" />
      </button>
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
    const inGroup = (p: any) =>
      group === "formula"
        ? p.type === "FORMULA"
        : group === "baseline"
          ? p.type !== "FORMULA" && p.isBaseline
          : p.type !== "FORMULA" && !p.isBaseline;

    const groupParams = [...selectedModule.parameters]
      .filter(inGroup)
      .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
    const index = groupParams.findIndex((p: any) => p.id === paramId);
    if (index < 0 || index + direction < 0 || index + direction >= groupParams.length) return;

    const newGroup = [...groupParams];
    const target = newGroup[index + direction];
    newGroup[index + direction] = newGroup[index];
    newGroup[index] = target;

    const items = newGroup.map((p: any, idx: number) => ({
      id: p.id,
      urutan: idx + 1,
    }));

    reorderMutation.mutate({
      table: "dynamicParameter",
      items,
    });
  };

  const moveEntity = (subId: number, direction: -1 | 1) => {
    if (!selectedModule?.subCategories) return;
    const subs = [...selectedModule.subCategories].sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0));
    const index = subs.findIndex((s: any) => s.id === subId);
    if (index < 0 || index + direction < 0 || index + direction >= subs.length) return;

    const newSubs = [...subs];
    const target = newSubs[index + direction];
    newSubs[index + direction] = newSubs[index];
    newSubs[index] = target;

    const items = newSubs.map((s: any, idx: number) => ({
      id: s.id,
      urutan: idx + 1,
    }));

    reorderMutation.mutate({
      table: "dynamicSubCategory",
      items,
    });
  };

  const moveModule = (e: React.MouseEvent, moduleId: number, direction: -1 | 1) => {
    e.stopPropagation();
    const cats = [...categories].sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0));
    const index = cats.findIndex((c: any) => c.id === moduleId);
    if (index < 0 || index + direction < 0 || index + direction >= cats.length) return;

    const newCats = [...cats];
    const target = newCats[index + direction];
    newCats[index + direction] = newCats[index];
    newCats[index] = target;

    const items = newCats.map((c: any, idx: number) => ({
      id: c.id,
      urutan: idx + 1,
    }));

    reorderMutation.mutate({
      table: "dynamicCategory",
      items,
    });
  };

  const reportParams = selectedModule?.parameters?.filter((p: any) => p.type !== "FORMULA" && !p.isBaseline) || [];
  const dataDasarParams = selectedModule?.parameters?.filter((p: any) => p.type !== "FORMULA" && p.isBaseline) || [];
  const numericReportParams = reportParams.filter((p: any) => p.type === "NUMBER" || p.type === "DECIMAL");
  const formulaParams = selectedModule?.parameters?.filter((p: any) => p.type === "FORMULA") || [];

  // ══════════════════ INDEX MODE (no module selected) ══════════════════
  if (!selectedModule) {
    return (
      <div className="w-full fade-in min-h-screen bg-canvas">
        {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
        <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
          <div className="w-full max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary mb-1.5 sm:mb-2">
                Laporan Builder
              </p>
              <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-none text-foreground">
                Format Laporan & Formulir
              </h1>
              <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-2">
                <span className="tabular-nums font-semibold text-foreground">{categories.length}</span> modul terdaftar
                · kelola urutan dan rancang parameter tiap modul
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreatingModule(true)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary-hover transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Modul Baru
              </button>
            </div>
          </div>
        </div>

        {/* ── CONTENT BODY (CANVAS) ── */}
        <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
          {categories.length === 0 ? (
            <EmptyState
              icon={LayoutTemplate}
              title="Belum ada modul"
              description="Buat modul laporan pertama untuk mulai merancang format input puskesmas."
              actionLabel="Buat Modul"
              onAction={() => setIsCreatingModule(true)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat, idx) => {
                const pCount = cat.parameters?.filter((p: any) => p.type !== "FORMULA" && !p.isBaseline).length || 0;
                const ddCount = cat.parameters?.filter((p: any) => p.type !== "FORMULA" && p.isBaseline).length || 0;
                const fCount = cat.parameters?.filter((p: any) => p.type === "FORMULA").length || 0;
                const eCount = cat.subCategories?.length || 0;
                return (
                  <div
                    key={cat.id}
                    className="rounded-card border border-border bg-surface p-5 flex flex-col justify-between hover:border-primary/50 hover:shadow-subtle transition-all group shadow-subtle"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div
                          onClick={() => {
                            setSelectedModuleId(cat.id);
                            setActiveTab("umum");
                          }}
                          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        >
                          <span className="w-10 h-10 rounded-xl bg-surface-subtle flex items-center justify-center text-[18px] shrink-0 border border-border shadow-subtle text-foreground">
                            {cat.icon || "📋"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[14px] font-extrabold text-foreground truncate group-hover:text-primary transition-colors">
                              {cat.nama}
                            </p>
                            <p className="text-[10px] font-mono text-muted-foreground">
                              {cat.code} · {cat.isRowBased ? "Formulir matrix" : "Formulir tunggal"}
                            </p>
                          </div>
                        </div>

                        {/* Order Buttons & Delete */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <OrderButtons
                            index={idx}
                            total={categories.length}
                            onMoveUp={(e) => moveModule(e, cat.id, -1)}
                            onMoveDown={(e) => moveModule(e, cat.id, 1)}
                          />
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm({ type: "MODULE", id: cat.id, text: cat.nama })}
                            title="Hapus Modul"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500/70 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {cat.deskripsi && (
                        <p className="text-[12px] text-muted-foreground line-clamp-2 mb-3">{cat.deskripsi}</p>
                      )}
                    </div>

                    <div
                      onClick={() => {
                        setSelectedModuleId(cat.id);
                        setActiveTab("umum");
                      }}
                      className="cursor-pointer pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-bold text-muted-foreground"
                    >
                      <div className="flex items-center gap-3">
                        <span className="tabular-nums">{pCount} param</span>
                        {cat.isRowBased && <span className="tabular-nums">{eCount} entitas</span>}
                        {ddCount > 0 && <span className="tabular-nums">{ddCount} baseline</span>}
                        {fCount > 0 && <span className="tabular-nums text-primary font-bold">{fCount} formula</span>}
                      </div>
                      <span className="text-[11px] text-primary font-extrabold group-hover:translate-x-0.5 transition-transform">
                        Buka &rarr;
                      </span>
                    </div>
                  </div>
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
    <div className="flex h-screen overflow-hidden bg-canvas text-foreground fade-in">
      {/* ── LEFT: structure rail ── */}
      <aside className="w-[260px] shrink-0 bg-surface flex flex-col border-r border-border h-full shadow-subtle">
        {/* Back + module identity */}
        <div className="px-4 pt-4 pb-3">
          <button
            onClick={() => setSelectedModuleId(null)}
            className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors mb-3 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Semua Modul
          </button>
          <div className="flex items-center gap-3 px-1">
            <span className="w-11 h-11 rounded-2xl bg-surface-subtle border border-border flex items-center justify-center text-[20px] shrink-0 text-foreground shadow-subtle">
              {selectedModule.icon || "📋"}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-foreground leading-tight truncate">{selectedModule.nama}</p>
              <p className="text-[9px] font-bold text-muted-foreground font-mono mt-1 truncate">
                {selectedModule.code}
              </p>
            </div>
          </div>
        </div>

        <div className="mx-4 h-px bg-border" />

        {/* Structure nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV.filter((t) => !t.hidden).map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                  active
                    ? "bg-primary-subtle border border-primary/30 text-primary"
                    : "border border-transparent hover:bg-surface-subtle text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`flex-1 text-[12px] font-bold ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {t.label}
                </span>
                {t.count !== undefined && (
                  <span
                    className={`text-[9px] font-extrabold tabular-nums px-1.5 py-px rounded-full ${
                      active ? "bg-primary text-white" : "bg-surface-subtle text-muted-foreground"
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
            className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-white text-[11px] font-bold uppercase tracking-wider hover:bg-primary-hover shadow-subtle transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" /> Preview Form
          </button>
        </div>
      </aside>

      {/* ── CANVAS ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-canvas">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-border bg-surface px-6 sm:px-8 flex items-center justify-between shrink-0 shadow-subtle">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[12px] font-semibold text-muted-foreground truncate">{selectedModule.nama}</span>
            <span className="text-muted-foreground/40">/</span>
            <h2 className="text-[14px] font-extrabold text-foreground truncate">
              {NAV.find((t) => t.key === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === "parameter" && (
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
                <Plus className="w-3.5 h-3.5" /> Tambah Parameter
              </button>
            )}
            {activeTab === "entitas" && (
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
            )}
            {activeTab === "dataDasar" && (
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
            )}
            {activeTab === "formula" && (
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
            )}
          </div>
        </header>

        {/* Scrollable Canvas Body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
          <div className="max-w-4xl mx-auto space-y-5">
            {/* TAB: UMUM */}
            {activeTab === "umum" && (
              <div className="space-y-5">
                <div className="rounded-card border border-border bg-surface p-5 space-y-4 shadow-subtle">
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
                      className="w-full text-[12px] font-medium px-3 py-2.5 rounded-xl border border-border bg-surface text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none transition-all"
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

                <div className="rounded-card border border-rose-500/25 bg-rose-500/[0.03] p-5 flex items-center justify-between gap-4 shadow-subtle">
                  <div>
                    <p className="text-[12px] font-extrabold text-foreground">Hapus Modul</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Menghapus modul beserta seluruh parameter dan entitasnya.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setDeleteConfirm({ type: "MODULE", id: selectedModule.id, text: selectedModule.nama })
                    }
                    className="shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-full border border-rose-500/40 text-rose-600 dark:text-rose-400 text-[11px] font-extrabold hover:bg-rose-500/10 transition-colors"
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
                  <p className="text-[11px] font-semibold text-muted-foreground">
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

                <div className="space-y-3">
                  {reportParams.map((p: any, idx: number) => {
                    const localState = paramForm[p.id] || p;
                    return (
                      <div
                        key={p.id}
                        className="rounded-card border border-border bg-surface p-4 flex gap-3 hover:border-primary/40 hover:shadow-subtle transition-all shadow-subtle"
                      >
                        <div className="flex flex-col gap-1 shrink-0 pt-1">
                          <OrderButtons
                            index={idx}
                            total={reportParams.length}
                            onMoveUp={() => moveParam(p.id, -1, "report")}
                            onMoveDown={() => moveParam(p.id, 1, "report")}
                          />
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
                              className="mt-5 w-9 h-9 rounded-xl flex items-center justify-center text-rose-500/70 hover:bg-rose-500/10 hover:text-rose-600 shrink-0 border border-border transition-colors"
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
                            <label className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!localState.required}
                                onChange={(e) => {
                                  const u = { ...localState, required: e.target.checked };
                                  setParamForm({ ...paramForm, [p.id]: u });
                                  saveParamSettings(p.id, u);
                                }}
                                className="w-4 h-4 rounded accent-primary"
                              />
                              Wajib diisi
                            </label>
                          </div>
                          {localState.type === "SELECT" && (
                            <div className="col-span-2">
                              <label className={labelCls}>Opsi Dropdown (pisahkan koma/baris)</label>
                              <textarea
                                rows={2}
                                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-[12px] font-medium outline-none focus:border-primary resize-none transition-all text-foreground"
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
                <div className="rounded-xl border border-primary/20 bg-primary-subtle px-4 py-3 text-[12px] text-muted-foreground leading-relaxed">
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

                <div className="space-y-2.5">
                  {selectedModule.subCategories?.length === 0 && (
                    <EmptyState
                      icon={Rows3}
                      title="Belum ada entitas"
                      description="Tambah entitas manual untuk mengisi baris sasaran pada form matrix."
                    />
                  )}
                  {selectedModule.subCategories?.map((sub: any, idx: number) => {
                    const localState = entityForm[sub.id] || { nama: sub.nama, grup: sub.grup || "" };
                    return (
                      <div
                        key={sub.id}
                        className="rounded-card border border-border bg-surface shadow-subtle grid grid-cols-1 md:grid-cols-[auto_1fr_220px_auto] items-end px-4 py-3.5 gap-3 hover:border-primary/40 hover:shadow-subtle transition-all"
                      >
                        <div className="pb-1">
                          <OrderButtons
                            index={idx}
                            total={selectedModule.subCategories.length}
                            onMoveUp={() => moveEntity(sub.id, -1)}
                            onMoveDown={() => moveEntity(sub.id, 1)}
                          />
                        </div>
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
                          className="h-9 w-9 rounded-xl flex items-center justify-center text-rose-500/70 hover:bg-rose-500/10 hover:text-rose-600 border border-border transition-colors"
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
                <div className="rounded-xl border border-primary/20 bg-primary-subtle px-4 py-3 text-[12px] text-muted-foreground leading-relaxed">
                  Field di tab ini muncul di form Data Dasar. Opsional: hubungkan ke parameter laporan agar jumlah data
                  otomatis mengisi laporan bulan berjalan.
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-muted-foreground">
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
                  {dataDasarParams.map((p: any, idx: number) => {
                    const localState = paramForm[p.id] || p;
                    return (
                      <div
                        key={p.id}
                        className="rounded-card border border-border bg-surface p-4 space-y-3 hover:border-primary/40 hover:shadow-subtle transition-all shadow-subtle"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                          <OrderButtons
                            index={idx}
                            total={dataDasarParams.length}
                            onMoveUp={() => moveParam(p.id, -1, "baseline")}
                            onMoveDown={() => moveParam(p.id, 1, "baseline")}
                          />
                          <button
                            onClick={() => setDeleteConfirm({ type: "PARAM", id: p.id, text: p.nama })}
                            className="h-8 w-8 rounded-xl flex items-center justify-center text-rose-500/70 hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_140px] gap-3 items-end">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <label className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">
                                Nama Field
                              </label>
                              {localState.syncToEntityField && (
                                <span className="text-[8px] px-1.5 py-px rounded-full bg-primary-subtle text-primary border border-primary/20 font-extrabold uppercase tracking-wide">
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
                        </div>

                        <label className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!localState.required}
                            onChange={(e) => {
                              const u = { ...localState, required: e.target.checked, isBaseline: true };
                              setParamForm({ ...paramForm, [p.id]: u });
                              saveParamSettings(p.id, u);
                            }}
                            className="w-4 h-4 rounded accent-primary"
                          />
                          Wajib diisi
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border bg-surface-subtle/50">
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
                                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-foreground text-[12px] font-medium outline-none focus:border-primary resize-none transition-all"
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
                  <p className="text-[11px] font-semibold text-muted-foreground">
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
                  {formulaParams.map((p: any, idx: number) => {
                    const localState = paramForm[p.id] || p;
                    return (
                      <div
                        key={p.id}
                        className="rounded-card border border-border bg-surface overflow-hidden hover:border-primary/40 hover:shadow-subtle transition-all shadow-subtle"
                      >
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface-subtle/50">
                          <div className="flex items-center gap-3 flex-1 mr-3">
                            <OrderButtons
                              index={idx}
                              total={formulaParams.length}
                              onMoveUp={() => moveParam(p.id, -1, "formula")}
                              onMoveDown={() => moveParam(p.id, 1, "formula")}
                            />
                            <input
                              type="text"
                              className="font-extrabold text-[13px] bg-transparent outline-none flex-1 text-foreground focus:border-b-2 focus:border-primary"
                              value={localState.nama || ""}
                              onChange={(e) => {
                                const u = { ...localState, nama: e.target.value };
                                setParamForm({ ...paramForm, [p.id]: u });
                              }}
                              onBlur={() => saveParamSettings(p.id, paramForm[p.id] || localState)}
                              placeholder="Nama Formula"
                            />
                          </div>
                          <button
                            onClick={() => setDeleteConfirm({ type: "PARAM", id: p.id, text: p.nama })}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-rose-500/70 hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="px-4 py-7 flex items-center justify-center gap-3 bg-surface-subtle/30">
                          <span className="text-3xl font-light text-muted-foreground/40">(</span>
                          <select
                            className="h-11 px-3.5 rounded-button border border-primary/30 bg-primary-subtle text-primary font-extrabold text-[12px] outline-none focus:border-primary cursor-pointer"
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
                          <span className="text-xl font-black text-muted-foreground">/</span>
                          <select
                            className="h-11 px-3.5 rounded-button border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-extrabold text-[12px] outline-none focus:border-amber-500 cursor-pointer"
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
                          <span className="text-3xl font-light text-muted-foreground/40">)</span>
                          <span className="text-[15px] font-black text-foreground">× 100%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
            className="h-10 px-5 rounded-button text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-button bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold uppercase tracking-wider shadow-subtle transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hapus
          </button>
        </>
      }
    >
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-[12px] text-muted-foreground">
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
            className="h-10 px-5 rounded-button text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="create-module-form"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-button bg-primary text-white text-[11px] font-extrabold uppercase tracking-wider hover:bg-primary-hover shadow-subtle transition disabled:opacity-50"
          >
            {mutation.isPending ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
