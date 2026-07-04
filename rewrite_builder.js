const fs = require('fs');

const code = `"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Component,
  Hash,
  Layers,
  Layout,
  LayoutTemplate,
  List,
  Plus,
  Settings2,
  Trash2,
  Type,
  X,
  Eye,
  Check,
  Loader2,
  ChevronDown
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LaporanBuilderPreview } from "@/components/laporan-builder-preview";
import { cn } from "@/lib/utils";

export default function LaporanBuilderPage() {
  const queryClient = useQueryClient();

  type SaveStatus = "idle" | "saving" | "saved";
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  
  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    umum: true,
    parameter: true,
    entitas: true,
    danger: false
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({...prev, [key]: !prev[key]}));
  };

  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "MODULE" | "PARAM" | "ENTITY", id: number, text: string } | null>(null);

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["master-categories"],
    queryFn: async () => {
      const res = await fetch("/api/master/dynamic-categories");
      if (!res.ok) throw new Error("Failed to fetch dynamic categories");
      return res.json();
    },
  });

  const { data: modules = [] } = useQuery<any[]>({
    queryKey: ["builder-modules"],
    queryFn: async () => {
      const res = await fetch("/api/builder/modules");
      if (!res.ok) throw new Error("Failed to fetch modules");
      return res.json();
    },
  });

  const selectedModule = modules.find((m) => m.id === selectedModuleId);

  // Form states
  const [moduleForm, setModuleForm] = useState({
    nama: "",
    code: "",
    icon: "📋",
    categoryId: "",
    isActive: true,
    isRowBased: true,
    deskripsi: "",
  });

  // Parameter add state
  const [isAddingParam, setIsAddingParam] = useState(false);
  const [paramForm, setParamForm] = useState({
    nama: "",
    type: "NUMBER",
    required: true,
    options: "",
  });

  // Entity add state
  const [isAddingEntity, setIsAddingEntity] = useState(false);
  const [entityForm, setEntityForm] = useState({
    nama: "",
    grup: "NON_PRIORITAS",
  });

  useEffect(() => {
    if (selectedModule) {
      setModuleForm({
        nama: selectedModule.nama,
        code: selectedModule.code,
        icon: selectedModule.icon || "📋",
        categoryId: selectedModule.categoryId?.toString() || "",
        isActive: selectedModule.isActive,
        isRowBased: selectedModule.isRowBased,
        deskripsi: selectedModule.deskripsi || "",
      });
      setIsCreatingModule(false);
    } else if (isCreatingModule) {
      setModuleForm({
        nama: "",
        code: "",
        icon: "📋",
        categoryId: categories.length > 0 ? categories[0].id.toString() : "",
        isActive: true,
        isRowBased: true,
        deskripsi: "",
      });
    }
  }, [selectedModuleId, isCreatingModule, selectedModule, categories]);

  const triggerSaveStatus = () => {
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 600);
  };

  // Mutations
  const createModuleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/builder/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create module");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["builder-modules"] });
      setSelectedModuleId(data.id);
      setIsCreatingModule(false);
      toast.success("Modul berhasil dibuat");
      triggerSaveStatus();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateModuleMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...payload } = data;
      const res = await fetch(\`/api/builder/modules/\${id}\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update module");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["builder-modules"] });
      triggerSaveStatus();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(\`/api/builder/modules/\${id}\`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete module");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["builder-modules"] });
      setSelectedModuleId(null);
      setDeleteConfirm(null);
      toast.success("Modul dihapus");
    },
  });

  const createParamMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/builder/parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create parameter");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["builder-modules"] });
      setIsAddingParam(false);
      setParamForm({ nama: "", type: "NUMBER", required: true, options: "" });
      triggerSaveStatus();
    },
  });

  const deleteParamMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(\`/api/builder/parameters/\${id}\`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete parameter");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["builder-modules"] });
      setDeleteConfirm(null);
    },
  });

  const createEntityMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/builder/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create entity");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["builder-modules"] });
      setIsAddingEntity(false);
      setEntityForm({ nama: "", grup: "NON_PRIORITAS" });
      triggerSaveStatus();
    },
  });

  const deleteEntityMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(\`/api/builder/subcategories/\${id}\`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete entity");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["builder-modules"] });
      setDeleteConfirm(null);
    },
  });

  const reorderParamMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: number; newOrder: number }) => {
      const res = await fetch(\`/api/builder/parameters/\${id}\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urutan: newOrder }),
      });
      if (!res.ok) throw new Error("Failed to reorder parameter");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["builder-modules"] });
    },
  });

  const reorderEntityMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: number; newOrder: number }) => {
      const res = await fetch(\`/api/builder/subcategories/\${id}\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urutan: newOrder }),
      });
      if (!res.ok) throw new Error("Failed to reorder entity");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["builder-modules"] });
    },
  });

  const saveModule = () => {
    if (isCreatingModule) {
      if (!moduleForm.nama || !moduleForm.code || !moduleForm.categoryId) {
        toast.error("Nama, kode, dan kategori wajib diisi");
        return;
      }
      createModuleMutation.mutate({
        ...moduleForm,
        categoryId: parseInt(moduleForm.categoryId),
      });
    } else if (selectedModule) {
      updateModuleMutation.mutate({
        id: selectedModule.id,
        ...moduleForm,
        categoryId: parseInt(moduleForm.categoryId),
      });
    }
  };

  const addParam = () => {
    if (!selectedModuleId || !paramForm.nama) return;
    createParamMutation.mutate({
      ...paramForm,
      moduleId: selectedModuleId,
      urutan: (selectedModule?.parameters?.length || 0) + 1,
      config: paramForm.type === "SELECT" ? { options: paramForm.options } : undefined,
    });
  };

  const addEntity = () => {
    if (!selectedModuleId || !entityForm.nama) return;
    createEntityMutation.mutate({
      ...entityForm,
      moduleId: selectedModuleId,
      urutan: (selectedModule?.subCategories?.length || 0) + 1,
    });
  };

  // Status badge helper
  const renderSaveStatus = () => {
    if (saveStatus === "idle") return null;
    return (
      <div className={cn(
        "flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 transition-all duration-300",
        saveStatus === "saving" ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--success))]"
      )}>
        {saveStatus === "saving" ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> <span>Menyimpan...</span></>
        ) : (
          <><Check className="w-3.5 h-3.5" /> <span>Tersimpan</span></>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] overflow-hidden -mx-4 md:-mx-6 -mb-4 md:-mb-6 bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">

      {/* ═══ LEFT SIDEBAR: Module List ═══ */}
      <aside className="w-60 shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        {/* Header */}
        <div className="h-14 px-4 flex items-center gap-2 border-b border-[hsl(var(--border))]">
          <LayoutTemplate className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <span className="text-[13px] font-bold tracking-tight">Laporan Builder</span>
        </div>

        {/* Module List */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-thin">
          <div className="px-2 py-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Modul</span>
            <button
              onClick={() => { setIsCreatingModule(true); setSelectedModuleId(null); }}
              className="w-5 h-5 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {modules.length === 0 && !isCreatingModule ? (
            <div className="px-3 py-6 text-center">
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Belum ada modul</p>
            </div>
          ) : (
            <>
              {categories.map((cat) => {
                const catModules = modules.filter((m) => m.categoryId === cat.id);
                if (catModules.length === 0) return null;
                return (
                  <div key={cat.id} className="mb-2 last:mb-0">
                    <div className="px-2 py-1 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                      {cat.nama}
                    </div>
                    {catModules.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedModuleId(m.id); setIsCreatingModule(false); }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-2 text-[12px] font-medium transition-colors border border-transparent",
                          selectedModuleId === m.id 
                            ? "bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]" 
                            : "hover:bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]"
                        )}
                      >
                        <span className="text-[14px] shrink-0">{m.icon || "📋"}</span>
                        <span className="truncate">{m.nama}</span>
                        {selectedModuleId === m.id && (
                          <span className="ml-auto w-1.5 h-1.5 bg-[hsl(var(--accent))]" />
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
              
              {isCreatingModule && (
                <div className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[12px] font-medium bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--accent))]">
                  <span className="text-[14px] shrink-0">✨</span>
                  <span className="truncate">Modul Baru...</span>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* ═══ RIGHT PANEL: Form Accordions ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[hsl(var(--background))]">
        {selectedModuleId || isCreatingModule ? (
          <>
            {/* Header */}
            <header className="h-14 shrink-0 border-b border-[hsl(var(--border))] flex items-center justify-between px-6 bg-[hsl(var(--card))]">
              <div className="flex items-center gap-3">
                <span className="text-xl">{isCreatingModule ? "✨" : selectedModule?.icon || "📋"}</span>
                <div>
                  <h1 className="text-[14px] font-bold tracking-tight leading-none">
                    {isCreatingModule ? "Buat Modul Baru" : selectedModule?.nama}
                  </h1>
                  {!isCreatingModule && selectedModule && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <code className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">{selectedModule.code}</code>
                      {selectedModule.isRowBased && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] uppercase">Matrix</span>
                      )}
                      {selectedModule.isActive ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 uppercase">Aktif</span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] uppercase">Nonaktif</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {renderSaveStatus()}
                {!isCreatingModule && selectedModule && (
                  <button
                    onClick={() => setIsPreviewOpen(true)}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                )}
                <Button 
                  onClick={saveModule} 
                  disabled={createModuleMutation.isPending || updateModuleMutation.isPending}
                  size="sm"
                  className="h-8"
                >
                  {createModuleMutation.isPending || updateModuleMutation.isPending ? "Menyimpan..." : "Simpan Modul"}
                </Button>
              </div>
            </header>

            {/* Accordions Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              <div className="max-w-4xl mx-auto space-y-4">
                
                {/* Section 1: Pengaturan Umum */}
                <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                  <button 
                    onClick={() => toggleSection('umum')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 hover:bg-[hsl(var(--muted))]/40 transition-colors"
                  >
                    <Settings2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-[13px] font-bold">Pengaturan Umum</span>
                    <ChevronDown className={cn("w-4 h-4 ml-auto text-[hsl(var(--muted-foreground))] transition-transform", openSections.umum ? "rotate-180" : "")} />
                  </button>
                  
                  {openSections.umum && (
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Nama Modul</label>
                        <Input 
                          value={moduleForm.nama} 
                          onChange={(e) => setModuleForm({ ...moduleForm, nama: e.target.value })} 
                          placeholder="e.g. Inspeksi TPP" 
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Kode Unik</label>
                        <Input 
                          value={moduleForm.code} 
                          onChange={(e) => setModuleForm({ ...moduleForm, code: e.target.value.toUpperCase() })} 
                          placeholder="e.g. TPP_INSPEKSI" 
                          className="h-9 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Kategori Induk</label>
                        <select
                          className="w-full h-9 px-3 border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm outline-none focus:border-[hsl(var(--ring))]"
                          value={moduleForm.categoryId}
                          onChange={(e) => setModuleForm({ ...moduleForm, categoryId: e.target.value })}
                        >
                          <option value="">Pilih Kategori...</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.nama}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Icon (Emoji)</label>
                        <Input 
                          value={moduleForm.icon} 
                          onChange={(e) => setModuleForm({ ...moduleForm, icon: e.target.value })} 
                          placeholder="📋" 
                          className="h-9"
                        />
                      </div>
                      
                      <div className="col-span-2 space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Format Laporan</label>
                        <div className="flex items-center gap-4 mt-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="isRowBased" 
                              checked={moduleForm.isRowBased} 
                              onChange={() => setModuleForm({ ...moduleForm, isRowBased: true })} 
                              className="accent-[hsl(var(--accent))]"
                            />
                            <span className="text-[12px] font-medium">Data Matrix (Baris Entitas x Kolom Parameter)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="isRowBased" 
                              checked={!moduleForm.isRowBased} 
                              onChange={() => setModuleForm({ ...moduleForm, isRowBased: false })} 
                              className="accent-[hsl(var(--accent))]"
                            />
                            <span className="text-[12px] font-medium">Formulir Tunggal (Parameter Saja)</span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="col-span-2 space-y-1 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={moduleForm.isActive} 
                            onChange={(e) => setModuleForm({ ...moduleForm, isActive: e.target.checked })} 
                            className="accent-[hsl(var(--accent))]"
                          />
                          <span className="text-[12px] font-medium">Modul Aktif (bisa diisi oleh Puskesmas)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {!isCreatingModule && selectedModule && (
                  <>
                    {/* Section 2: Field / Parameter */}
                    <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
                        <Component className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        <span className="text-[13px] font-bold">Field / Parameter Data</span>
                        <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] ml-2">
                          {selectedModule.parameters?.length || 0} fields
                        </span>
                        
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => setIsAddingParam(!isAddingParam)}
                            className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Tambah Field
                          </button>
                          <button onClick={() => toggleSection('parameter')} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                            <ChevronDown className={cn("w-4 h-4 transition-transform", openSections.parameter ? "rotate-180" : "")} />
                          </button>
                        </div>
                      </div>

                      {openSections.parameter && (
                        <div>
                          {isAddingParam && (
                            <div className="p-4 bg-[hsl(var(--accent))]/5 border-b border-[hsl(var(--border))]">
                              <h3 className="text-[12px] font-bold mb-3">Field Baru</h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="col-span-2">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Nama Field</label>
                                  <Input value={paramForm.nama} onChange={(e) => setParamForm({...paramForm, nama: e.target.value})} className="h-8 text-xs mt-1" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Tipe</label>
                                  <select 
                                    className="w-full h-8 px-2 mt-1 border border-[hsl(var(--border))] text-xs outline-none"
                                    value={paramForm.type}
                                    onChange={(e) => setParamForm({...paramForm, type: e.target.value})}
                                  >
                                    <option value="NUMBER">Angka Bulat (Number)</option>
                                    <option value="DECIMAL">Angka Desimal (Decimal)</option>
                                    <option value="STRING">Teks Singkat (String)</option>
                                    <option value="SELECT">Pilihan (Select)</option>
                                  </select>
                                </div>
                                <div className="flex items-end pb-1">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={paramForm.required} onChange={(e) => setParamForm({...paramForm, required: e.target.checked})} className="accent-[hsl(var(--accent))]" />
                                    <span className="text-[11px] font-semibold">Wajib Diisi</span>
                                  </label>
                                </div>
                                {paramForm.type === "SELECT" && (
                                  <div className="col-span-4 mt-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Opsi (Pisahkan dengan koma)</label>
                                    <Input value={paramForm.options} onChange={(e) => setParamForm({...paramForm, options: e.target.value})} placeholder="e.g. Baik, Sedang, Buruk" className="h-8 text-xs mt-1" />
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" size="sm" onClick={() => setIsAddingParam(false)} className="h-8">Batal</Button>
                                <Button size="sm" onClick={addParam} disabled={!paramForm.nama || createParamMutation.isPending} className="h-8">Simpan Field</Button>
                              </div>
                            </div>
                          )}

                          {selectedModule.parameters?.length === 0 ? (
                            <div className="px-4 py-8 text-center text-[12px] text-[hsl(var(--muted-foreground))]">Belum ada field data.</div>
                          ) : (
                            <div className="divide-y divide-[hsl(var(--border))]">
                              {selectedModule.parameters?.sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0)).map((p: any, idx: number, arr: any[]) => (
                                <div key={p.id} className="flex items-center gap-3 px-4 py-2 hover:bg-[hsl(var(--muted))]/20 group">
                                  <div className="flex flex-col gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => idx > 0 && reorderParamMutation.mutate({ id: p.id, newOrder: p.urutan - 1 })} disabled={idx === 0} className="hover:text-[hsl(var(--foreground))] disabled:opacity-30">
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => idx < arr.length - 1 && reorderParamMutation.mutate({ id: p.id, newOrder: p.urutan + 1 })} disabled={idx === arr.length - 1} className="hover:text-[hsl(var(--foreground))] disabled:opacity-30">
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                  
                                  <div className="w-6 h-6 flex items-center justify-center bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                                    {p.type === "NUMBER" || p.type === "DECIMAL" ? <Hash className="w-3 h-3" /> : p.type === "SELECT" ? <List className="w-3 h-3" /> : <Type className="w-3 h-3" />}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[13px] font-bold truncate">{p.nama}</span>
                                      {p.required && <span className="text-rose-500 text-lg leading-none">*</span>}
                                    </div>
                                    <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                                      {p.type} {p.config?.options && \`(\${p.config.options})\`}
                                    </div>
                                  </div>

                                  <button onClick={() => setDeleteConfirm({ type: "PARAM", id: p.id, text: p.nama })} className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Section 3: Entitas (If row based) */}
                    {selectedModule.isRowBased && (
                      <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
                          <Layers className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                          <span className="text-[13px] font-bold">Daftar Entitas / Obyek</span>
                          <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] ml-2">
                            {selectedModule.subCategories?.length || 0} entitas
                          </span>
                          
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={() => setIsAddingEntity(!isAddingEntity)}
                              className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Tambah Entitas
                            </button>
                            <button onClick={() => toggleSection('entitas')} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                              <ChevronDown className={cn("w-4 h-4 transition-transform", openSections.entitas ? "rotate-180" : "")} />
                            </button>
                          </div>
                        </div>

                        {openSections.entitas && (
                          <div>
                            {isAddingEntity && (
                              <div className="p-4 bg-[hsl(var(--accent))]/5 border-b border-[hsl(var(--border))]">
                                <h3 className="text-[12px] font-bold mb-3">Entitas Baru</h3>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="col-span-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Nama Entitas</label>
                                    <Input value={entityForm.nama} onChange={(e) => setEntityForm({...entityForm, nama: e.target.value})} className="h-8 text-xs mt-1" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Grup (Opsional)</label>
                                    <select 
                                      className="w-full h-8 px-2 mt-1 border border-[hsl(var(--border))] text-xs outline-none"
                                      value={entityForm.grup}
                                      onChange={(e) => setEntityForm({...entityForm, grup: e.target.value})}
                                    >
                                      <option value="PRIORITAS">Prioritas</option>
                                      <option value="NON_PRIORITAS">Non Prioritas</option>
                                      <option value="KHUSUS">Khusus</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                  <Button variant="outline" size="sm" onClick={() => setIsAddingEntity(false)} className="h-8">Batal</Button>
                                  <Button size="sm" onClick={addEntity} disabled={!entityForm.nama || createEntityMutation.isPending} className="h-8">Simpan Entitas</Button>
                                </div>
                              </div>
                            )}

                            {selectedModule.subCategories?.length === 0 ? (
                              <div className="px-4 py-8 text-center text-[12px] text-[hsl(var(--muted-foreground))]">Belum ada entitas.</div>
                            ) : (
                              <div className="divide-y divide-[hsl(var(--border))]">
                                {selectedModule.subCategories?.sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0)).map((sub: any, idx: number, arr: any[]) => (
                                  <div key={sub.id} className="flex items-center gap-3 px-4 py-2 hover:bg-[hsl(var(--muted))]/20 group">
                                    <div className="flex flex-col gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => idx > 0 && reorderEntityMutation.mutate({ id: sub.id, newOrder: sub.urutan - 1 })} disabled={idx === 0} className="hover:text-[hsl(var(--foreground))] disabled:opacity-30">
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button onClick={() => idx < arr.length - 1 && reorderEntityMutation.mutate({ id: sub.id, newOrder: sub.urutan + 1 })} disabled={idx === arr.length - 1} className="hover:text-[hsl(var(--foreground))] disabled:opacity-30">
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                    
                                    <span className="text-[14px]">{sub.grup === "PRIORITAS" ? "🔴" : sub.grup === "NON_PRIORITAS" ? "⚪" : "📍"}</span>
                                    <div className="flex-1 min-w-0 text-[12px] font-semibold">{sub.nama}</div>
                                    
                                    {sub.grup && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] uppercase border border-[hsl(var(--border))]">
                                        {sub.grup.replace("_", " ")}
                                      </span>
                                    )}

                                    <button onClick={() => setDeleteConfirm({ type: "ENTITY", id: sub.id, text: sub.nama })} className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 transition-all">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Section 4: Danger Zone */}
                    <div className="border border-red-200 bg-white">
                      <button 
                        onClick={() => toggleSection('danger')}
                        className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                        <span className="text-[13px] font-bold text-red-600">Danger Zone</span>
                        <ChevronDown className={cn("w-4 h-4 ml-auto text-red-400 transition-transform", openSections.danger ? "rotate-180" : "")} />
                      </button>
                      
                      {openSections.danger && (
                        <div className="p-4 bg-red-50/20">
                          <p className="text-[12px] text-zinc-600 mb-3">Menghapus modul akan menghapus seluruh data laporan terkait secara permanen.</p>
                          <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm({ type: "MODULE", id: selectedModule.id, text: selectedModule.nama })}>
                            Hapus Modul Ini
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center mb-4">
              <LayoutTemplate className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            </div>
            <h2 className="text-[15px] font-bold mb-1">Pilih atau Buat Modul</h2>
            <p className="text-[12px] text-[hsl(var(--muted-foreground))] max-w-sm">
              Pilih modul dari panel kiri untuk mulai mengedit form laporan, atau buat modul baru.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
            <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
              <h3 className="text-[14px] font-bold text-red-600 flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Konfirmasi Hapus
              </h3>
            </div>
            <div className="p-5">
              <p className="text-[13px]">
                Apakah Anda yakin ingin menghapus {deleteConfirm.type === "MODULE" ? "modul" : deleteConfirm.type === "PARAM" ? "field" : "entitas"} <strong>{deleteConfirm.text}</strong>?
              </p>
              {deleteConfirm.type === "MODULE" && (
                <p className="text-[12px] text-red-500 mt-2 font-medium">Semua field, entitas, dan data laporan yang telah masuk akan ikut terhapus permanen.</p>
              )}
            </div>
            <div className="px-5 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Batal</Button>
              <Button variant="destructive" onClick={() => {
                if (deleteConfirm.type === "MODULE") deleteModuleMutation.mutate(deleteConfirm.id);
                else if (deleteConfirm.type === "PARAM") deleteParamMutation.mutate(deleteConfirm.id);
                else if (deleteConfirm.type === "ENTITY") deleteEntityMutation.mutate(deleteConfirm.id);
              }}>
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <LaporanBuilderPreview 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        module={selectedModule} 
      />
    </div>
  );
}
`;

fs.writeFileSync('apps/web/src/app/(app)/laporan-builder/page.tsx', code);
