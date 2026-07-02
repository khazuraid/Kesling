"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, LayoutTemplate, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LaporanBuilderPreview } from "@/components/laporan-builder-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LaporanBuilderPage() {
  const queryClient = useQueryClient();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);

  // Tab states
  type Tab = "umum" | "parameter" | "entitas" | "dataDasar" | "formula";
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

  const selectedModule = categories.find((c) => c.id === selectedModuleId) || null;

  // Mutations
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
    onSuccess: () => {
      toast.success("Entitas ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
    },
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

  // State forms
  const [modForm, setModForm] = useState<any>({});
  const [paramForm, setParamForm] = useState<Record<number, any>>({});

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
          syncToParamId: p.config?.syncToParamId || "",
          syncMode: p.config?.syncMode || "COUNT",
          numeratorCode: p.config?.formula?.numeratorCode || "",
          denominatorCode: p.config?.formula?.denominatorCode || "",
        };
      });
      setParamForm(pMap);
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
    if (form.type === "SELECT" && form.options) config.options = form.options;
    if (form.isBaseline && form.syncToParamId) {
      config.syncToParamId = Number(form.syncToParamId);
      config.syncMode = form.syncMode || "COUNT";
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

  // Separate parameter lists based on function
  const reportParams = selectedModule?.parameters?.filter((p: any) => p.type !== "FORMULA" && !p.isBaseline) || [];
  const dataDasarParams = selectedModule?.parameters?.filter((p: any) => p.type !== "FORMULA" && p.isBaseline) || [];
  const dataParams = reportParams;
  const numericReportParams = reportParams.filter((p: any) => p.type === "NUMBER" || p.type === "DECIMAL");
  const formulaParams = selectedModule?.parameters?.filter((p: any) => p.type === "FORMULA") || [];

  return (
    <div className="flex h-[calc(100dvh-4rem)] overflow-hidden bg-[hsl(var(--card))] text-[hsl(var(--foreground))] font-sans">
      {/* LEFT PANE: Module List */}
      <aside className="w-[280px] shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 flex flex-col">
        <div className="h-14 px-6 flex items-center gap-2 border-b border-[hsl(var(--border))]">
          <LayoutTemplate className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <span className="text-[13px] font-bold tracking-tight">Laporan Builder</span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-6 py-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Daftar Modul
            </span>
            <button
              onClick={() => {
                setIsCreatingModule(true);
                setSelectedModuleId(null);
              }}
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedModuleId(cat.id);
                setActiveTab("umum");
              }}
              className={`w-full flex items-center gap-3 px-6 py-3 text-[12px] font-medium transition-colors border-l-2 ${
                selectedModuleId === cat.id
                  ? "border-black bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/40"
              }`}
            >
              <span className="text-[16px] shrink-0">{cat.icon || "📋"}</span>
              <span className="truncate">{cat.nama}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* RIGHT PANE: Split Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[hsl(var(--card))]">
        <header className="h-14 shrink-0 border-b border-[hsl(var(--border))] flex items-center justify-between px-6 bg-[hsl(var(--card))]">
          {selectedModule ? (
            <>
              <div className="flex items-center gap-4">
                <span className="text-2xl">{selectedModule.icon || "📋"}</span>
                <div>
                  <h1 className="text-[15px] font-bold tracking-tight leading-none">{selectedModule.nama}</h1>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1 font-mono">
                    {selectedModule.code}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/20"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview Form
                </button>
              </div>
            </>
          ) : (
            <h1 className="text-[14px] font-bold tracking-tight text-[hsl(var(--muted-foreground))]">
              Pilih atau buat modul baru
            </h1>
          )}
        </header>

        <div className="flex-1 flex overflow-hidden">
          {!selectedModule ? (
            <div className="m-auto text-center">
              <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Workspace Kosong</p>
            </div>
          ) : (
            <>
              {/* Inline Workspace Editor */}
              <div className="flex-1 flex flex-col overflow-hidden border-r border-[hsl(var(--border))]">
                <nav className="flex gap-6 border-b border-[hsl(var(--border))] px-6 bg-[hsl(var(--card))] shrink-0">
                  {(["umum", "parameter", "entitas", "dataDasar", "formula"] as Tab[]).map((tab) => {
                    if (tab === "entitas" && !selectedModule.isRowBased) return null;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-4 text-[11px] font-bold uppercase tracking-wider relative transition-colors ${
                          activeTab === tab
                            ? "text-[hsl(var(--foreground))]"
                            : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--muted-foreground))]"
                        }`}
                      >
                        {tab === "dataDasar" ? "data dasar" : tab}
                        {activeTab === tab && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--foreground))]" />
                        )}
                      </button>
                    );
                  })}
                </nav>

                <div className="flex-1 overflow-y-auto p-6 bg-[hsl(var(--muted))]/30">
                  {/* TAB: UMUM */}
                  {activeTab === "umum" && (
                    <div className="space-y-4 max-w-xl">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
                          Nama Modul
                        </label>
                        <Input
                          value={modForm.nama || ""}
                          onChange={(e) => setModForm({ ...modForm, nama: e.target.value })}
                          onBlur={() => saveModuleSettings()}
                          className="w-full text-xs h-9 rounded-none bg-[hsl(var(--card))]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
                          Deskripsi Singkat
                        </label>
                        <textarea
                          value={modForm.deskripsi || ""}
                          onChange={(e) => setModForm({ ...modForm, deskripsi: e.target.value })}
                          onBlur={() => saveModuleSettings()}
                          rows={3}
                          className="w-full text-xs px-3 py-2 border border-[hsl(var(--border))] outline-none focus:border-black resize-none bg-[hsl(var(--card))]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
                            Icon (Emoji)
                          </label>{" "}
                          <Input
                            value={modForm.icon || ""}
                            onChange={(e) => setModForm({ ...modForm, icon: e.target.value })}
                            onBlur={() => saveModuleSettings()}
                            className="w-full text-xs h-9 rounded-none bg-[hsl(var(--card))]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
                            Format Input Data
                          </label>
                          <select
                            value={modForm.isRowBased ? "true" : "false"}
                            onChange={(e) => {
                              const nextVal = e.target.value === "true";
                              setModForm({ ...modForm, isRowBased: nextVal });
                              saveModuleSettings({ ...modForm, isRowBased: nextVal });
                            }}
                            className="w-full text-xs h-9 px-2 border border-[hsl(var(--border))] bg-[hsl(var(--card))] outline-none focus:border-black"
                          >
                            <option value="false">Formulir Kolom Tunggal (Single)</option>
                            <option value="true">Formulir Tabel Sasaran (Matrix)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: PARAMETER */}
                  {activeTab === "parameter" && (
                    <div className="space-y-4 max-w-2xl">
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
                        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-4 py-2 border-2 border-black bg-[hsl(var(--card))] hover:bg-[hsl(var(--foreground))] hover:text-white transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Input / Baris
                      </button>
                      <div className="space-y-3">
                        {reportParams.map((p: any, idx: number) => {
                          const localState = paramForm[p.id] || p;
                          return (
                            <div
                              key={p.id}
                              className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex p-3 gap-4 group"
                            >
                              <div className="flex flex-col gap-1 shrink-0">
                                <button
                                  onClick={() => moveParam(p.id, -1, "report")}
                                  disabled={idx === 0}
                                  className="w-5 h-5 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/40 disabled:opacity-30"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => moveParam(p.id, 1, "report")}
                                  disabled={idx === reportParams.length - 1}
                                  className="w-5 h-5 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/40 disabled:opacity-30"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex-1 grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-[hsl(var(--muted-foreground))] mb-1">
                                    Nama Parameter
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full h-8 px-2 border border-[hsl(var(--border))] text-xs"
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
                                    <label className="block text-[10px] font-bold text-[hsl(var(--muted-foreground))] mb-1">
                                      Tipe Input
                                    </label>
                                    <select
                                      className="w-full h-8 px-2 border border-[hsl(var(--border))] text-xs bg-[hsl(var(--card))]"
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
                                    className="mt-5 w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 shrink-0 border border-[hsl(var(--border))]"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-[hsl(var(--muted-foreground))] mb-1">
                                    Kode
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full h-8 px-2 border border-[hsl(var(--border))] text-xs font-mono"
                                    value={localState.code || ""}
                                    onChange={(e) => {
                                      const u = { ...localState, code: e.target.value };
                                      setParamForm({ ...paramForm, [p.id]: u });
                                    }}
                                    onBlur={() => saveParamSettings(p.id, paramForm[p.id] || localState)}
                                  />
                                </div>
                                <div className="flex items-end gap-4 pb-1">
                                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                                    <input
                                      type="checkbox"
                                      checked={!!localState.required}
                                      onChange={(e) => {
                                        const u = { ...localState, required: e.target.checked };
                                        setParamForm({ ...paramForm, [p.id]: u });
                                        saveParamSettings(p.id, u);
                                      }}
                                      className="w-3.5 h-3.5 rounded-none"
                                    />
                                    Wajib
                                  </label>
                                </div>
                                {localState.type === "SELECT" && (
                                  <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-[hsl(var(--muted-foreground))] mb-1">
                                      Opsi Dropdown (pisahkan koma/baris)
                                    </label>
                                    <textarea
                                      rows={2}
                                      className="w-full px-2 py-2 border border-[hsl(var(--border))] text-xs bg-[hsl(var(--card))] resize-none"
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
                    <div className="space-y-4 max-w-2xl">
                      <button
                        onClick={() =>
                          addEntityMutation.mutate({ categoryId: selectedModule.id, nama: "Entitas Baru" })
                        }
                        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-4 py-2 border-2 border-black bg-[hsl(var(--card))] hover:bg-[hsl(var(--foreground))] hover:text-white transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Baris Entitas{" "}
                      </button>
                      <div className="space-y-2">
                        {selectedModule.subCategories?.map((sub: any) => (
                          <div
                            key={sub.id}
                            className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center px-4 py-2 gap-3"
                          >
                            <input
                              type="text"
                              className="flex-1 text-sm outline-none font-medium"
                              defaultValue={sub.nama}
                              onBlur={(e) => {
                                sub.nama = e.target.value;
                              }}
                            />
                            <button
                              onClick={() => setDeleteConfirm({ type: "ENTITY", id: sub.id, text: sub.nama })}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB: DATA DASAR */}
                  {activeTab === "dataDasar" && (
                    <div className="space-y-4 max-w-3xl">
                      <div className="p-4 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[12px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                        Field di tab ini muncul di form Tambah Baru Data Dasar. Opsional: hubungkan ke parameter laporan
                        agar jumlah data otomatis mengisi laporan bulan berjalan.
                      </div>
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
                        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-4 py-2 border-2 border-black bg-[hsl(var(--card))] hover:bg-[hsl(var(--foreground))] hover:text-white transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Field Data Dasar
                      </button>
                      <div className="space-y-3">
                        {dataDasarParams.map((p: any) => {
                          const localState = paramForm[p.id] || p;
                          return (
                            <div
                              key={p.id}
                              className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_140px_auto] gap-3 items-end">
                                <div>
                                  <label className="block text-[10px] font-bold text-[hsl(var(--muted-foreground))] mb-1">
                                    Nama Field
                                  </label>
                                  <input
                                    className="w-full h-8 px-2 border border-[hsl(var(--border))] text-xs font-medium"
                                    value={localState.nama || ""}
                                    onChange={(e) =>
                                      setParamForm({ ...paramForm, [p.id]: { ...localState, nama: e.target.value } })
                                    }
                                    onBlur={() => saveParamSettings(p.id, paramForm[p.id] || localState)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-[hsl(var(--muted-foreground))] mb-1">
                                    Kode
                                  </label>
                                  <input
                                    className="w-full h-8 px-2 border border-[hsl(var(--border))] text-xs font-mono"
                                    value={localState.code || ""}
                                    onChange={(e) =>
                                      setParamForm({ ...paramForm, [p.id]: { ...localState, code: e.target.value } })
                                    }
                                    onBlur={() => saveParamSettings(p.id, paramForm[p.id] || localState)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-[hsl(var(--muted-foreground))] mb-1">
                                    Tipe
                                  </label>
                                  <select
                                    className="w-full h-8 px-2 border border-[hsl(var(--border))] text-xs bg-[hsl(var(--card))]"
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
                                  className="h-8 px-3 text-red-500 hover:bg-red-50 border border-red-200 text-[11px] font-bold"
                                >
                                  Hapus
                                </button>
                              </div>

                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                                  <input
                                    type="checkbox"
                                    checked={!!localState.required}
                                    onChange={(e) => {
                                      const u = { ...localState, required: e.target.checked, isBaseline: true };
                                      setParamForm({ ...paramForm, [p.id]: u });
                                      saveParamSettings(p.id, u);
                                    }}
                                    className="w-3.5 h-3.5 rounded-none"
                                  />
                                  Wajib
                                </label>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
                                <div>
                                  <label className="block text-[10px] font-bold text-[hsl(var(--foreground))] mb-1">
                                    Sinkron ke Parameter Laporan
                                  </label>
                                  <select
                                    className="w-full h-8 px-2 border border-[hsl(var(--border))] text-xs bg-[hsl(var(--card))]"
                                    value={localState.syncToParamId || ""}
                                    onChange={(e) => {
                                      const u = { ...localState, syncToParamId: e.target.value, isBaseline: true };
                                      setParamForm({ ...paramForm, [p.id]: u });
                                      saveParamSettings(p.id, u);
                                    }}
                                  >
                                    <option value="">Tidak dihubungkan — hanya Data Dasar</option>
                                    {reportParams
                                      .filter((tp: any) => tp.type === "NUMBER" || tp.type === "DECIMAL")
                                      .map((tp: any) => (
                                        <option key={tp.id} value={tp.id}>
                                          {tp.nama} ({tp.code})
                                        </option>
                                      ))}
                                  </select>
                                </div>
                                {localState.syncToParamId && (
                                  <div>
                                    <label className="block text-[10px] font-bold text-[hsl(var(--foreground))] mb-1">
                                      Metode Hitung
                                    </label>
                                    <select
                                      className="w-full h-8 px-2 border border-[hsl(var(--border))] text-xs bg-[hsl(var(--card))]"
                                      value={localState.syncMode || "COUNT"}
                                      onChange={(e) => {
                                        const u = { ...localState, syncMode: e.target.value, isBaseline: true };
                                        setParamForm({ ...paramForm, [p.id]: u });
                                        saveParamSettings(p.id, u);
                                      }}
                                    >
                                      <option value="COUNT">Hitung jumlah entri</option>
                                      {(localState.type === "NUMBER" || localState.type === "DECIMAL") && (
                                        <option value="SUM">Jumlahkan nilai field ini</option>
                                      )}
                                    </select>
                                  </div>
                                )}
                              </div>

                              {localState.type === "SELECT" && (
                                <div>
                                  <label className="block text-[10px] font-bold text-[hsl(var(--muted-foreground))] mb-1">
                                    Opsi Dropdown
                                  </label>
                                  <textarea
                                    rows={2}
                                    className="w-full px-2 py-2 border border-[hsl(var(--border))] text-xs bg-[hsl(var(--card))] resize-none"
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
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB: FORMULA KHUSUS */}
                  {activeTab === "formula" && (
                    <div className="space-y-4 max-w-2xl">
                      <button
                        onClick={() =>
                          addParamMutation.mutate({
                            categoryId: selectedModule.id,
                            nama: "Formula Baru",
                            code: `formula_${Date.now()}`,
                            type: "FORMULA",
                          })
                        }
                        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-4 py-2 border-2 border-indigo-500 text-indigo-600 bg-[hsl(var(--card))] hover:bg-indigo-50 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Formula Penilaian
                      </button>
                      <div className="space-y-4">
                        {formulaParams.map((p: any) => {
                          const localState = paramForm[p.id] || p;
                          return (
                            <div
                              key={p.id}
                              className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] relative"
                            >
                              <div className="p-3 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--muted))]/50">
                                <input
                                  type="text"
                                  className="font-bold text-[13px] bg-transparent outline-none w-1/2 focus:border-b focus:border-black"
                                  value={localState.nama || ""}
                                  onChange={(e) => {
                                    const u = { ...localState, nama: e.target.value };
                                    setParamForm({ ...paramForm, [p.id]: u });
                                  }}
                                  onBlur={() => saveParamSettings(p.id, paramForm[p.id] || localState)}
                                  placeholder="Nama Formula (misal: Kepatuhan Sanitasi)"
                                />
                                <button
                                  onClick={() => setDeleteConfirm({ type: "PARAM", id: p.id, text: p.nama })}
                                  className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                                </button>
                              </div>
                              <div className="p-4 flex items-center justify-center gap-4 py-8 bg-slate-50/50">
                                <span className="text-3xl font-light text-[hsl(var(--muted-foreground))]/40">(</span>
                                {/* Pembilang (Numerator) */}
                                <select
                                  className="h-10 px-3 border-2 border-emerald-400 bg-emerald-50 text-emerald-800 font-bold text-xs"
                                  value={localState.numeratorCode || ""}
                                  onChange={(e) => {
                                    const u = { ...localState, numeratorCode: e.target.value };
                                    setParamForm({ ...paramForm, [p.id]: u });
                                    saveParamSettings(p.id, u);
                                  }}
                                >
                                  <option value="">+ Pembilang (Capaian)</option>
                                  {numericReportParams.map((dp: any) => (
                                    <option key={dp.code} value={dp.code}>
                                      {dp.nama}
                                    </option>
                                  ))}
                                </select>
                                <span className="text-xl font-bold text-[hsl(var(--muted-foreground))]">/</span>
                                {/* Penyebut (Denominator) */}
                                <select
                                  className="h-10 px-3 border-2 border-blue-400 bg-blue-50 text-blue-800 font-bold text-xs"
                                  value={localState.denominatorCode || ""}
                                  onChange={(e) => {
                                    const u = { ...localState, denominatorCode: e.target.value };
                                    setParamForm({ ...paramForm, [p.id]: u });
                                    saveParamSettings(p.id, u);
                                  }}
                                >
                                  <option value="">+ Penyebut (Target)</option>
                                  {numericReportParams.map((dp: any) => (
                                    <option key={dp.code} value={dp.code}>
                                      {dp.nama}
                                    </option>
                                  ))}
                                </select>
                                <span className="text-3xl font-light text-[hsl(var(--muted-foreground))]/40">)</span>
                                <span className="text-lg font-bold text-neutral-800">× 100%</span>
                              </div>
                            </div>
                          );
                        })}
                        {formulaParams.length === 0 && (
                          <div className="py-12 border border-dashed border-[hsl(var(--border))] text-center">
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                              Modul ini belum memiliki sistem formula/penilaian otomatis.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT PANE: Live Layout Preview */}
              <div className="w-[380px] lg:w-[450px] shrink-0 bg-[hsl(var(--muted))]/20 border-l border-[hsl(var(--border))] flex flex-col">
                <div className="h-12 flex items-center justify-center border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Live Form Preview
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {selectedModule.isRowBased ? (
                    /* Matrix Layout Preview */
                    <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-[hsl(var(--muted))]/20 border-b border-[hsl(var(--border))]">
                              <th className="p-2 font-bold text-[hsl(var(--muted-foreground))] min-w-[120px]">
                                Sasaran / Entitas
                              </th>
                              {dataParams.map((p: any) => (
                                <th
                                  key={p.id}
                                  className="p-2 font-bold text-[hsl(var(--muted-foreground))] min-w-[80px]"
                                >
                                  {p.nama}
                                </th>
                              ))}
                              {formulaParams.map((p: any) => (
                                <th
                                  key={p.id}
                                  className="p-2 font-bold text-indigo-600 bg-indigo-50/50 min-w-[80px] border-l border-[hsl(var(--border))]"
                                >
                                  {p.nama} (%)
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedModule.subCategories?.length === 0 ? (
                              <tr>
                                {" "}
                                <td
                                  colSpan={dataParams.length + formulaParams.length + 1}
                                  className="p-4 text-center text-[hsl(var(--muted-foreground))]"
                                >
                                  Tambah entitas di tab Entitas
                                </td>
                              </tr>
                            ) : (
                              selectedModule.subCategories?.map((sub: any) => (
                                <tr key={sub.id} className="border-b border-[hsl(var(--border))]">
                                  <td className="p-2 font-medium bg-[hsl(var(--muted))]/30 border-r border-[hsl(var(--border))]">
                                    {sub.nama}
                                  </td>
                                  {dataParams.map((p: any) => (
                                    <td key={p.id} className="p-1">
                                      <input
                                        type="text"
                                        className="w-full p-1 border border-[hsl(var(--border))] text-xs"
                                        placeholder="..."
                                      />
                                    </td>
                                  ))}
                                  {formulaParams.map((p: any) => (
                                    <td key={p.id} className="p-1 border-l border-[hsl(var(--border))]">
                                      <div className="w-full p-1 bg-[hsl(var(--muted))]/40 text-center font-mono font-bold text-[hsl(var(--muted-foreground))]">
                                        0%
                                      </div>
                                    </td>
                                  ))}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Single Form Preview */
                    <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 space-y-4 shadow-sm">
                      <h3 className="text-sm font-bold text-[hsl(var(--foreground))] border-b border-[hsl(var(--border))] pb-2 mb-4">
                        {selectedModule.nama}
                      </h3>
                      {dataParams.map((p: any) => (
                        <div key={p.id} className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">
                            {p.nama}
                          </label>
                          <input
                            type="text"
                            className="w-full h-9 px-3 border border-[hsl(var(--border))] text-xs"
                            placeholder="..."
                          />
                        </div>
                      ))}
                      {formulaParams.length > 0 && (
                        <div className="mt-6 p-4 border border-indigo-200 bg-indigo-50/30 space-y-4">
                          <h4 className="text-[10px] font-bold uppercase text-indigo-500">Hasil Kalkulasi</h4>
                          {formulaParams.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between">
                              {" "}
                              <span className="text-xs font-semibold">{p.nama}</span>
                              <span className="text-sm font-bold text-indigo-700">0%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground))]/40">
          <div className="bg-[hsl(var(--card))] p-6 max-w-sm w-full space-y-4 border border-[hsl(var(--border))]">
            <h3 className="text-lg font-bold">Hapus Data?</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Anda yakin ingin menghapus "{deleteConfirm.text}"? Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteConfirm.type === "MODULE") deleteModuleMutation.mutate(deleteConfirm.id);
                  if (deleteConfirm.type === "PARAM") deleteParamMutation.mutate(deleteConfirm.id);
                  if (deleteConfirm.type === "ENTITY") deleteEntityMutation.mutate(deleteConfirm.id);
                }}
              >
                {" "}
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Module Modal */}
      {isCreatingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground))]/40">
          <div className="bg-[hsl(var(--card))] p-6 max-w-sm w-full border border-[hsl(var(--border))]">
            <h3 className="text-lg font-bold mb-4">Buat Modul Laporan</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                createModuleMutation.mutate({
                  nama: fd.get("nama"),
                  code: fd.get("code"),
                  isRowBased: true,
                  isActive: true,
                });
              }}
            >
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold">Nama Modul</label>
                  <Input name="nama" required className="mt-1 rounded-none" />
                </div>
                <div>
                  <label className="text-xs font-bold">Kode (Unik)</label>
                  <Input name="code" required className="mt-1 rounded-none" placeholder="cth: laporan_tpp" />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsCreatingModule(false)}>
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))] text-white rounded-none"
                  >
                    Simpan & Lanjutkan
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      <LaporanBuilderPreview isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} module={selectedModule} />
    </div>
  );
}
