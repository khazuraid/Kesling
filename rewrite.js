const fs = require('fs');

const code = `
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Calculator,
  ChevronRight,
  Database,
  GripVertical,
  Hash,
  Layout,
  LayoutTemplate,
  List,
  Percent,
  Plus,
  Settings2,
  Trash2,
  Type,
  X,
  FileText
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LaporanBuilderPage() {
  const queryClient = useQueryClient();

  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<"MODULE" | "PARAM" | "ENTITY">("MODULE");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // New Module State (when not created yet)
  const [isCreatingModule, setIsCreatingModule] = useState(false);

  const { data: categories = [], isLoading } = useQuery<any[]>({
    queryKey: ["master-categories"],
    queryFn: async () => {
      const res = await fetch("/api/master/dynamic-categories");
      if (!res.ok) throw new Error("Failed to fetch dynamic categories");
      return res.json();
    },
  });

  const selectedModule = categories.find((c) => c.id === selectedModuleId) || null;

  // --- Mutations ---
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
      toast.success("Module created!");
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
      setSelectedModuleId(data.id);
      setIsCreatingModule(false);
      setSelectedItemType("MODULE");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ id, payload }: any) => {
      const res = await fetch(\`/api/master/dynamic-categories/\${id}\`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Module saved!");
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(\`/api/master/dynamic-categories/\${id}\`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Module deleted!");
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
      setSelectedModuleId(null);
    },
    onError: (err: any) => toast.error(err.message),
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
    onSuccess: (data) => {
      toast.success("Parameter added!");
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
      setSelectedItemType("PARAM");
      setSelectedItemId(data.id);
    },
    onError: (err: any) => toast.error(err.message),
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
    onSuccess: () => {
      // toast.success("Saved");
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteParamMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(\`/api/master/dynamic-parameters?id=\${id}\`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Parameter deleted!");
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
      setSelectedItemType("MODULE");
    },
    onError: (err: any) => toast.error(err.message),
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
      toast.success("Entity added!");
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
      setSelectedItemType("ENTITY");
      setSelectedItemId(data.id);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateEntityMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/master/dynamic-subcategories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master-categories"] }),
    onError: (err: any) => toast.error(err.message),
  });

  const deleteEntityMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(\`/api/master/dynamic-subcategories?id=\${id}\`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Entity deleted!");
      queryClient.invalidateQueries({ queryKey: ["master-categories"] });
      setSelectedItemType("MODULE");
    },
    onError: (err: any) => toast.error(err.message),
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

  const moveParam = (index: number, direction: -1 | 1) => {
    if (!selectedModule) return;
    const params = [...selectedModule.parameters].sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
    if (index + direction < 0 || index + direction >= params.length) return;
    const temp = params[index];
    params[index] = params[index + direction];
    params[index + direction] = temp;
    reorderMutation.mutate({
      table: "dynamicParameter",
      items: params.map((p: any, i: number) => ({ id: p.id, urutan: i })),
    });
  };

  const moveEntity = (index: number, direction: -1 | 1) => {
    if (!selectedModule) return;
    const subs = [...selectedModule.subCategories].sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
    if (index + direction < 0 || index + direction >= subs.length) return;
    const temp = subs[index];
    subs[index] = subs[index + direction];
    subs[index + direction] = temp;
    reorderMutation.mutate({
      table: "dynamicSubCategory",
      items: subs.map((s: any, i: number) => ({ id: s.id, urutan: i })),
    });
  };

  // Internal states for local right-panel editing (debounced in real app, explicit save here)
  const [modForm, setModForm] = useState<any>({});
  const [paramForm, setParamForm] = useState<any>({});
  const [entityForm, setEntityForm] = useState<any>({});

  useEffect(() => {
    if (selectedItemType === "MODULE" && selectedModule) {
      setModForm({
        nama: selectedModule.nama,
        code: selectedModule.code,
        deskripsi: selectedModule.deskripsi || "",
        icon: selectedModule.icon || "",
        isActive: selectedModule.isActive,
        isRowBased: selectedModule.isRowBased,
      });
    } else if (selectedItemType === "PARAM" && selectedModule) {
      const p = selectedModule.parameters.find((x: any) => x.id === selectedItemId);
      if (p) {
        setParamForm({
          nama: p.nama,
          code: p.code,
          type: p.type,
          required: p.required,
          isBaseline: p.isBaseline,
          min: p.config?.min || "",
          max: p.config?.max || "",
          options: p.config?.options || "",
        });
      }
    } else if (selectedItemType === "ENTITY" && selectedModule) {
      const e = selectedModule.subCategories.find((x: any) => x.id === selectedItemId);
      if (e) {
        setEntityForm({
          nama: e.nama,
          grup: e.grup || "",
        });
      }
    }
  }, [selectedItemType, selectedItemId, selectedModuleId, categories]);

  const saveModuleSettings = () => {
    if (!selectedModule) return;
    updateModuleMutation.mutate({ id: selectedModule.id, payload: modForm });
  };

  const saveParamSettings = () => {
    if (!selectedModule || !selectedItemId) return;
    const config: any = {};
    if (paramForm.type === "NUMBER" || paramForm.type === "DECIMAL") {
      if (paramForm.min !== "") config.min = Number(paramForm.min);
      if (paramForm.max !== "") config.max = Number(paramForm.max);
    }
    if (paramForm.type === "SELECT" && paramForm.options) {
      config.options = paramForm.options;
    }
    updateParamMutation.mutate({
      id: selectedItemId,
      nama: paramForm.nama,
      code: paramForm.code,
      type: paramForm.type,
      required: paramForm.required,
      isBaseline: paramForm.isBaseline,
      config: Object.keys(config).length > 0 ? config : undefined,
    });
  };

  const saveEntitySettings = () => {
    if (!selectedModule || !selectedItemId) return;
    updateEntityMutation.mutate({
      id: selectedItemId,
      nama: entityForm.nama,
      grup: entityForm.grup || undefined,
    });
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
            <LayoutTemplate className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-semibold text-sm">System Builder Studio</h1>
        </div>
        <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          Workspace Mode
        </div>
      </header>

      {/* 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT COLUMN: Explorer */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Explorer</span>
            <button
              onClick={() => {
                setIsCreatingModule(true);
                setSelectedModuleId(null);
              }}
              className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedModuleId(cat.id);
                  setSelectedItemType("MODULE");
                  setIsCreatingModule(false);
                }}
                className={\`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors \${
                  selectedModuleId === cat.id ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                }\`}
              >
                <Database className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{cat.nama}</span>
              </button>
            ))}
          </div>

          {selectedModule && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Add Elements</span>
              <button
                onClick={() => {
                  const num = selectedModule.parameters.length + 1;
                  addParamMutation.mutate({
                    categoryId: selectedModule.id,
                    nama: \`Field \${num}\`,
                    code: \`field_\${num}\`,
                    type: "NUMBER",
                  });
                }}
                className="w-full bg-white border border-slate-200 shadow-sm rounded-md py-1.5 text-xs font-medium hover:border-indigo-300 hover:text-indigo-600 flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Field
              </button>
              {selectedModule.isRowBased && (
                <button
                  onClick={() => {
                    addEntityMutation.mutate({
                      categoryId: selectedModule.id,
                      nama: "New Row Entity",
                    });
                  }}
                  className="w-full bg-white border border-slate-200 shadow-sm rounded-md py-1.5 text-xs font-medium hover:border-indigo-300 hover:text-indigo-600 flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row Entity
                </button>
              )}
            </div>
          )}
        </aside>

        {/* CENTER COLUMN: Canvas */}
        <main className="flex-1 bg-slate-50/50 overflow-y-auto relative p-8 md:p-12">
          {isCreatingModule ? (
            <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm ring-1 ring-slate-200/50">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6">
                <Database className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Create New Module</h2>
              <p className="text-sm text-slate-500 mb-6">Start building a new reporting structure.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Module Name</label>
                  <Input id="new-mod-name" placeholder="e.g. Inspeksi Air" className="h-10 text-sm" />
                </div>
                <div className="pt-2">
                  <Button 
                    onClick={() => {
                      const val = (document.getElementById("new-mod-name") as HTMLInputElement).value;
                      if (!val) return;
                      createModuleMutation.mutate({
                        nama: val,
                        code: val.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                        isRowBased: true,
                      });
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    Create & Edit
                  </Button>
                </div>
              </div>
            </div>
          ) : selectedModule ? (
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Form Title Preview */}
              <div 
                className={\`p-8 bg-white rounded-2xl shadow-sm ring-1 transition-all cursor-pointer \${selectedItemType === "MODULE" ? "ring-indigo-500 shadow-indigo-100" : "ring-slate-200/50 hover:ring-indigo-300"}\`}
                onClick={() => { setSelectedItemType("MODULE"); setSelectedItemId(null); }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl">{selectedModule.icon || "📄"}</div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedModule.nama}</h2>
                    <p className="text-sm text-slate-500 font-mono mt-1">{selectedModule.code}</p>
                  </div>
                </div>
                <p className="text-slate-600">{selectedModule.deskripsi || "Add a description to guide operators..."}</p>
              </div>

              {/* Form Canvas Area */}
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/50 overflow-hidden pb-4">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Canvas Preview</span>
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                </div>

                <div className="p-6 overflow-x-auto">
                  {selectedModule.parameters.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                      Empty Canvas. Add fields from the left panel.
                    </div>
                  ) : (
                    <table className="w-full text-left min-w-[500px]">
                      <thead>
                        <tr>
                          {selectedModule.isRowBased && (
                            <th className="pb-4 pr-6 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Entities</th>
                          )}
                          {selectedModule.parameters.sort((a:any,b:any) => (a.urutan||0)-(b.urutan||0)).map((p:any) => (
                            <th 
                              key={p.id} 
                              onClick={(e) => { e.stopPropagation(); setSelectedItemType("PARAM"); setSelectedItemId(p.id); }}
                              className={\`pb-4 px-4 text-xs font-bold uppercase tracking-wider border-b border-slate-100 cursor-pointer transition-colors \${
                                selectedItemType === "PARAM" && selectedItemId === p.id ? "text-indigo-600 bg-indigo-50/50 rounded-t-lg" : "text-slate-400 hover:text-slate-700"
                              }\`}
                            >
                              <div className="flex items-center gap-2">
                                {p.type === "NUMBER" || p.type === "DECIMAL" ? <Hash className="w-3.5 h-3.5" /> : p.type === "SELECT" ? <List className="w-3.5 h-3.5" /> : <Type className="w-3.5 h-3.5" />}
                                {p.nama}
                                {p.required && <span className="text-red-400">*</span>}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedModule.isRowBased ? (
                          selectedModule.subCategories.length === 0 ? (
                            <tr><td colSpan={selectedModule.parameters.length + 1} className="py-8 text-center text-sm text-slate-400 italic">No entities added yet.</td></tr>
                          ) : (
                            selectedModule.subCategories.sort((a:any,b:any) => (a.urutan||0)-(b.urutan||0)).map((sub:any) => (
                              <tr 
                                key={sub.id} 
                                onClick={(e) => { e.stopPropagation(); setSelectedItemType("ENTITY"); setSelectedItemId(sub.id); }}
                                className={\`cursor-pointer border-b border-slate-50 transition-colors \${selectedItemType === "ENTITY" && selectedItemId === sub.id ? "bg-indigo-50/50" : "hover:bg-slate-50"}\`}
                              >
                                <td className="py-4 pr-6 font-medium text-slate-800 text-sm">
                                  {sub.nama}
                                  {sub.grup && <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] uppercase font-bold">{sub.grup}</span>}
                                </td>
                                {selectedModule.parameters.sort((a:any,b:any) => (a.urutan||0)-(b.urutan||0)).map((p:any) => (
                                  <td key={p.id} className="py-3 px-4">
                                    <div className="h-9 w-full bg-slate-100/50 rounded border border-slate-200 border-dashed"></div>
                                  </td>
                                ))}
                              </tr>
                            ))
                          )
                        ) : (
                          <tr className="border-b border-slate-50">
                            {selectedModule.parameters.sort((a:any,b:any) => (a.urutan||0)-(b.urutan||0)).map((p:any) => (
                              <td key={p.id} className="py-4 px-4">
                                <div className="h-10 w-full bg-slate-100/50 rounded-md border border-slate-200"></div>
                              </td>
                            ))}
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a module to open the canvas</p>
            </div>
          )}
        </main>

        {/* RIGHT COLUMN: Properties */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Properties</span>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {!selectedModule ? (
              <div className="text-sm text-slate-400 italic">No item selected.</div>
            ) : selectedItemType === "MODULE" ? (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center gap-2 text-indigo-600 mb-6">
                  <Settings2 className="w-4 h-4" />
                  <span className="font-semibold text-sm">Module Settings</span>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Module Name</label>
                  <Input value={modForm.nama || ""} onChange={(e) => setModForm({...modForm, nama: e.target.value})} onBlur={saveModuleSettings} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">System Code</label>
                  <Input value={modForm.code || ""} onChange={(e) => setModForm({...modForm, code: e.target.value})} onBlur={saveModuleSettings} className="h-9 text-sm font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Icon (Emoji)</label>
                  <Input value={modForm.icon || ""} onChange={(e) => setModForm({...modForm, icon: e.target.value})} onBlur={saveModuleSettings} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Description</label>
                  <textarea value={modForm.deskripsi || ""} onChange={(e) => setModForm({...modForm, deskripsi: e.target.value})} onBlur={saveModuleSettings} rows={3} className="w-full text-sm border-slate-200 rounded-md p-2 focus:ring-1 focus:ring-indigo-500 outline-none border" />
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={modForm.isActive || false} onChange={(e) => { setModForm({...modForm, isActive: e.target.checked}); setTimeout(saveModuleSettings, 50); }} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-medium text-slate-700">Module Active</span>
                  </label>
                </div>

                <div className="pt-8">
                  <Button variant="outline" onClick={() => { if(confirm("Delete module?")) deleteModuleMutation.mutate(selectedModule.id); }} className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Module
                  </Button>
                </div>
              </div>
            ) : selectedItemType === "PARAM" ? (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between text-indigo-600 mb-6">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    <span className="font-semibold text-sm">Field Properties</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => {
                      const idx = selectedModule.parameters.sort((a:any,b:any)=>(a.urutan||0)-(b.urutan||0)).findIndex((p:any) => p.id === selectedItemId);
                      moveParam(idx, -1);
                    }} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><ArrowUp className="w-4 h-4" /></button>
                    <button onClick={() => {
                      const idx = selectedModule.parameters.sort((a:any,b:any)=>(a.urutan||0)-(b.urutan||0)).findIndex((p:any) => p.id === selectedItemId);
                      moveParam(idx, 1);
                    }} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><ArrowDown className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Field Label</label>
                  <Input value={paramForm.nama || ""} onChange={(e) => setParamForm({...paramForm, nama: e.target.value})} onBlur={saveParamSettings} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Field Type</label>
                  <select value={paramForm.type || "NUMBER"} onChange={(e) => { setParamForm({...paramForm, type: e.target.value}); setTimeout(saveParamSettings,50); }} className="w-full h-9 border border-slate-200 rounded-md px-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
                    <option value="NUMBER">Integer Number</option>
                    <option value="DECIMAL">Decimal Value</option>
                    <option value="TEXT">Free Text</option>
                    <option value="SELECT">Single Select (Dropdown)</option>
                  </select>
                </div>

                {(paramForm.type === "NUMBER" || paramForm.type === "DECIMAL") && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Min</label>
                      <Input type="number" value={paramForm.min || ""} onChange={(e) => setParamForm({...paramForm, min: e.target.value})} onBlur={saveParamSettings} className="h-8 text-sm bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Max</label>
                      <Input type="number" value={paramForm.max || ""} onChange={(e) => setParamForm({...paramForm, max: e.target.value})} onBlur={saveParamSettings} className="h-8 text-sm bg-white" />
                    </div>
                  </div>
                )}
                {paramForm.type === "SELECT" && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Options (Comma separated)</label>
                    <textarea value={paramForm.options || ""} onChange={(e) => setParamForm({...paramForm, options: e.target.value})} onBlur={saveParamSettings} className="w-full text-sm border-slate-200 rounded-md p-2 bg-white" rows={2} />
                  </div>
                )}

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={paramForm.required || false} onChange={(e) => { setParamForm({...paramForm, required: e.target.checked}); setTimeout(saveParamSettings, 50); }} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-medium text-slate-700">Required Field</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={paramForm.isBaseline || false} onChange={(e) => { setParamForm({...paramForm, isBaseline: e.target.checked}); setTimeout(saveParamSettings, 50); }} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-medium text-slate-700">Is Baseline Data</span>
                  </label>
                </div>

                <div className="pt-8">
                  <Button variant="outline" onClick={() => { if(confirm("Delete field?")) deleteParamMutation.mutate(selectedItemId!); }} className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Field
                  </Button>
                </div>
              </div>
            ) : selectedItemType === "ENTITY" ? (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between text-indigo-600 mb-6">
                  <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4" />
                    <span className="font-semibold text-sm">Entity Properties</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => {
                      const idx = selectedModule.subCategories.sort((a:any,b:any)=>(a.urutan||0)-(b.urutan||0)).findIndex((p:any) => p.id === selectedItemId);
                      moveEntity(idx, -1);
                    }} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><ArrowUp className="w-4 h-4" /></button>
                    <button onClick={() => {
                      const idx = selectedModule.subCategories.sort((a:any,b:any)=>(a.urutan||0)-(b.urutan||0)).findIndex((p:any) => p.id === selectedItemId);
                      moveEntity(idx, 1);
                    }} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><ArrowDown className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Entity Name</label>
                  <Input value={entityForm.nama || ""} onChange={(e) => setEntityForm({...entityForm, nama: e.target.value})} onBlur={saveEntitySettings} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Group Classification</label>
                  <select value={entityForm.grup || ""} onChange={(e) => { setEntityForm({...entityForm, grup: e.target.value}); setTimeout(saveEntitySettings,50); }} className="w-full h-9 border border-slate-200 rounded-md px-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
                    <option value="">No Group</option>
                    <option value="PRIORITAS">Prioritas</option>
                    <option value="NON_PRIORITAS">Non-Prioritas</option>
                  </select>
                </div>

                <div className="pt-8">
                  <Button variant="outline" onClick={() => { if(confirm("Delete entity?")) deleteEntityMutation.mutate(selectedItemId!); }} className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Entity
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('apps/web/src/app/(app)/laporan-builder/page.tsx', code, 'utf8');
console.log('Success completely rewriting page.tsx');
