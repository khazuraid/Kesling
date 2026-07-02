"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Database, Plus, Search, Settings2, Trash, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface Parameter {
  id: number;
  nama: string;
  code: string;
  type: string;
  required?: boolean;
  isBaseline: boolean;
  config?: any;
  urutan?: number;
}

interface SubCategory {
  id: number;
  nama: string;
  categoryId: number;
}

interface Category {
  id: number;
  nama: string;
  code: string;
  parameters: Parameter[];
  subCategories: SubCategory[];
}

export default function DataDasarSubCatPage() {
  const queryClient = useQueryClient();
  const params = useParams();
  const categoryCode = typeof params.categoryCode === "string" ? params.categoryCode : "";

  const [selectedSubCatId, setSelectedSubCatId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Master-Detail State
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [formData, setFormData] = useState<any>({ dynamicValues: {} });

  // 1. Fetch Kategori specific to code
  const { data: category, isLoading: loadingCats } = useQuery<Category>({
    queryKey: ["laporan-category-page-data-dasar", categoryCode],
    queryFn: async () => {
      const res = await fetch(`/api/laporan/categories?includeSub=true`);
      if (!res.ok) throw new Error("Gagal mengambil data kategori");
      const cats = await res.json();
      return cats.find((c: any) => c.code.toLowerCase() === categoryCode.toLowerCase());
    },
  });

  const allSubCats = useMemo(
    () =>
      category
        ? category.subCategories.map((sc) => ({
            ...sc,
            categoryNama: category.nama,
            parameters: category.parameters || [],
          }))
        : [],
    [category],
  );

  const activeSubCat = allSubCats.find((sc) => sc.id === selectedSubCatId);
  const baselineParams = [...(activeSubCat?.parameters.filter((p) => p.isBaseline) || [])].sort(
    (a, b) => (a.urutan || 0) - (b.urutan || 0),
  );
  const syncedParams = baselineParams.filter((p) => p.config?.syncToParamId);

  const getOptions = (p: Parameter) => {
    const raw = p.config?.options;
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
    if (typeof raw === "string")
      return raw
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    return [];
  };

  const renderDynamicInput = (p: Parameter) => {
    const value = formData.dynamicValues?.[p.code] || "";
    const setValue = (next: string) =>
      setFormData({
        ...formData,
        dynamicValues: {
          ...(formData.dynamicValues || {}),
          [p.code]: next,
        },
      });
    const baseClass =
      "w-full h-9 bg-[hsl(var(--background))] border border-[hsl(var(--border))] px-3 text-[12px] font-medium focus:ring-0 focus:outline-none focus:border-[hsl(var(--foreground))] transition-colors";

    if (p.type === "SELECT") {
      return (
        <select required={!!p.required} value={value} onChange={(e) => setValue(e.target.value)} className={baseClass}>
          <option value="">Pilih...</option>
          {getOptions(p).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    if (p.type === "TEXTAREA") {
      return (
        <textarea
          required={!!p.required}
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`${baseClass} h-auto py-2 resize-none`}
        />
      );
    }
    return (
      <input
        required={!!p.required}
        type={p.type === "NUMBER" || p.type === "DECIMAL" ? "number" : p.type === "DATE" ? "date" : "text"}
        step={p.type === "DECIMAL" ? "any" : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={baseClass}
      />
    );
  };

  useEffect(() => {
    if (allSubCats.length > 0) {
      if (!selectedSubCatId || !allSubCats.some((sc) => sc.id === selectedSubCatId)) {
        setSelectedSubCatId(allSubCats[0].id);
      }
    }
  }, [allSubCats, selectedSubCatId]);

  // 2. Fetch Data Sasaran
  const { data: sasarans = [], isLoading: loadingSasaran } = useQuery<any[]>({
    queryKey: ["sasaran", selectedSubCatId],
    queryFn: async () => {
      if (!selectedSubCatId) return [];
      const res = await fetch(`/api/sasaran?subCategoryId=${selectedSubCatId}`);
      if (!res.ok) throw new Error("Gagal mengambil data sasaran");
      return res.json();
    },
    enabled: !!selectedSubCatId,
  });

  const filteredSasarans = sasarans.filter((s) => {
    const q = searchTerm.toLowerCase();
    const dynamicText = Object.values(s.dataDinamis || {})
      .join(" ")
      .toLowerCase();
    return (
      s.nama?.toLowerCase().includes(q) ||
      s.pemilik?.toLowerCase().includes(q) ||
      s.alamat?.toLowerCase().includes(q) ||
      dynamicText.includes(q)
    );
  });

  const hydrateDynamicValues = (source: any = {}) => {
    const existing = (source.dataDinamis || source.dynamicValues || {}) as Record<string, string>;
    const next: Record<string, string> = { ...existing };
    const fill = (codes: string[], value: any) => {
      for (const code of codes) {
        if (baselineParams.some((p) => p.code === code) && (next[code] === undefined || next[code] === "")) {
          next[code] = value !== undefined && value !== null ? String(value) : "";
        }
      }
    };

    fill(["nama", "nama_sarana", "nama_tempat", "nama_usaha", "nama_sasaran"], source.nama);
    fill(["alamat", "alamat_lengkap"], source.alamat);
    fill(["pemilik", "pengelola", "nama_pemilik"], source.pemilik);
    fill(["kontak", "telepon", "no_hp", "hp"], source.kontak);
    fill(["lat", "latitude"], source.lat);
    fill(["lng", "longitude"], source.lng);

    for (const p of baselineParams) {
      if (next[p.code] === undefined || next[p.code] === null) next[p.code] = "";
    }
    return next;
  };

  // 3. Handlers
  const handleSelect = (s: any) => {
    setSelectedId(s.id);
    setFormData({
      nama: s.nama,
      alamat: s.alamat || "",
      pemilik: s.pemilik || "",
      kontak: s.kontak || "",
      lat: s.lat ? String(s.lat) : "",
      lng: s.lng ? String(s.lng) : "",
      dynamicValues: hydrateDynamicValues(s),
    });
  };

  const handleNew = () => {
    setSelectedId("new");
    setFormData({
      nama: "",
      alamat: "",
      pemilik: "",
      kontak: "",
      lat: "",
      lng: "",
      dynamicValues: hydrateDynamicValues({}),
    });
  };

  const closeEdit = () => {
    setSelectedId(null);
  };

  const baselineKey = baselineParams.map((p) => p.code).join("|");
  useEffect(() => {
    if (!selectedId) return;
    setFormData((prev: any) => ({ ...prev, dynamicValues: hydrateDynamicValues(prev) }));
  }, [baselineKey, selectedId]);

  // 4. Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = selectedId === "new" ? "/api/sasaran" : `/api/sasaran/${selectedId}`;
      const method = selectedId === "new" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Gagal menyimpan data");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sasaran", selectedSubCatId] });
      toast.success(selectedId === "new" ? "Data berhasil ditambahkan" : "Data berhasil diperbarui");
      closeEdit();
    },
    onError: (err: any) => toast.error(err.message || "Terjadi kesalahan"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/sasaran/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus data");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sasaran", selectedSubCatId] });
      toast.success("Data berhasil dihapus");
      closeEdit();
    },
    onError: (err: any) => toast.error(err.message || "Gagal menghapus"),
  });

  const getCoreValue = (keys: string[], fallback = "") => {
    for (const key of keys) {
      const value = formData.dynamicValues?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
    }
    return fallback;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dynamicName = getCoreValue(["nama", "nama_sarana", "nama_tempat", "nama_usaha", "nama_sasaran"]);
    const firstDynamicValue = Object.values(formData.dynamicValues || {}).find(
      (v) => v !== undefined && v !== null && String(v).trim() !== "",
    );
    const displayName =
      (baselineParams.length > 0 ? dynamicName || String(firstDynamicValue || "") : formData.nama) || "Data Dasar";

    if (!selectedSubCatId) {
      toast.error("Sub-kategori belum dipilih");
      return;
    }

    const dynamicAlamat = getCoreValue(["alamat", "alamat_lengkap"], formData.alamat || "");
    const dynamicPemilik = getCoreValue(["pemilik", "pengelola", "nama_pemilik"], formData.pemilik || "");
    const dynamicKontak = getCoreValue(["kontak", "telepon", "no_hp", "hp"], formData.kontak || "");
    const dynamicLat = getCoreValue(["lat", "latitude"], formData.lat || "");
    const dynamicLng = getCoreValue(["lng", "longitude"], formData.lng || "");

    saveMutation.mutate({
      ...formData,
      nama: displayName,
      alamat: dynamicAlamat,
      pemilik: dynamicPemilik,
      kontak: dynamicKontak,
      lat: dynamicLat ? parseFloat(dynamicLat) : null,
      lng: dynamicLng ? parseFloat(dynamicLng) : null,
      subCategoryId: selectedSubCatId,
      dataDinamis: formData.dynamicValues,
    });
  };

  if (!category && !loadingCats) {
    return (
      <div className="p-10 text-center">
        Kategori tidak ditemukan.{" "}
        <Link href="/data-dasar" className="underline">
          Kembali
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--background))] overflow-hidden fade-in border-t border-[hsl(var(--border))] sm:border-t-0">
      {/* ── TOP NAV: Categories ── */}
      <div className="h-14 shrink-0 border-b border-[hsl(var(--border))] flex items-center bg-[hsl(var(--card))]">
        <div className="flex items-center px-4 border-r border-[hsl(var(--border))] h-full">
          <Link
            href="/data-dasar"
            className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-wider">{category?.nama || "Kembali"}</span>
          </Link>
        </div>
        <div className="flex-1 flex items-center h-full overflow-x-auto hide-scrollbar pl-2">
          {loadingCats ? (
            <span className="text-[11px] px-4 text-[hsl(var(--muted-foreground))]">Memuat modul...</span>
          ) : (
            allSubCats.map((sc) => (
              <button
                key={sc.id}
                onClick={() => {
                  setSelectedSubCatId(sc.id);
                  setSearchTerm("");
                  closeEdit();
                }}
                className={`flex flex-col justify-center h-full px-4 border-b-2 transition-colors whitespace-nowrap ${
                  selectedSubCatId === sc.id
                    ? "border-[hsl(var(--foreground))] text-[hsl(var(--foreground))]"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <span className="text-[11px] font-black uppercase tracking-wider">{sc.nama}</span>
              </button>
            ))
          )}
        </div>
        <Link
          href="/laporan-builder"
          className="h-full px-4 border-l border-[hsl(var(--border))] flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" /> Edit Form
        </Link>
      </div>

      {/* ── WORKSPACE SPLIT ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: MASTER LIST */}
        <div className="flex flex-col h-full w-full">
          {/* Header & Actions */}
          <div className="p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[14px] font-black uppercase tracking-tight">
                  Data Dasar {activeSubCat?.nama || ""}
                </h1>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  Total {filteredSasarans.length} entitas terdaftar
                </p>
              </div>
              <button
                onClick={handleNew}
                disabled={!selectedSubCatId}
                className="flex items-center gap-1.5 h-8 px-3 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Plus size={14} strokeWidth={3} />
                Tambah Baru
              </button>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama, pemilik, atau alamat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-[hsl(var(--muted))]/10 border border-[hsl(var(--border))] text-[11px] font-medium rounded-none focus:outline-none focus:border-[hsl(var(--foreground))] focus:bg-transparent transition-all"
              />
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto bg-[hsl(var(--muted))]/5">
            {loadingSasaran ? (
              <div className="p-6 text-center text-[11px] text-[hsl(var(--muted-foreground))] font-medium">
                Memuat data...
              </div>
            ) : filteredSasarans.length === 0 ? (
              <div className="p-10 flex flex-col items-center text-center gap-3 opacity-50">
                <Database className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                <p className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">Tidak ada data ditemukan.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {filteredSasarans.map((s) => {
                  const dyn = (s.dataDinamis as Record<string, string>) || {};
                  const isSelected = selectedId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelect(s)}
                      className={`group flex flex-col p-4 border-b border-[hsl(var(--border))] cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[hsl(var(--background))] border-l-2 border-l-[hsl(var(--foreground))]"
                          : "hover:bg-[hsl(var(--muted))]/10 border-l-2 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[12px] font-black text-[hsl(var(--foreground))] truncate">{s.nama}</h3>
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                            {s.alamat || "Alamat belum diatur"}
                          </p>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? "text-[hsl(var(--foreground))] translate-x-1" : "text-transparent group-hover:text-[hsl(var(--muted-foreground))]"}`}
                        />
                      </div>

                      {/* Pill Tags for baseline values */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {baselineParams.slice(0, 3).map((p) => (
                          <span
                            key={p.code}
                            className="px-1.5 py-0.5 border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate max-w-[120px]"
                          >
                            {p.nama}: {dyn[p.code] || "-"}
                          </span>
                        ))}
                        {baselineParams.length > 3 && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold text-[hsl(var(--muted-foreground))]">
                            +{baselineParams.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* POPUP: ADD / EDIT DATA */}
        {selectedId && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6 fade-in">
            <div className="w-full max-w-3xl h-[86vh] flex flex-col bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
              {/* Editor Header */}
              <div className="h-16 shrink-0 px-6 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--card))]">
                <div>
                  <h2 className="text-[12px] font-black uppercase tracking-widest">
                    {selectedId === "new" ? "Tambah Data Dasar" : "Detail Data Dasar"}
                  </h2>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                    {baselineParams.length} field dari builder · {syncedParams.length} tersinkron ke laporan
                  </p>
                </div>
                <div className="flex items-center gap-1 -mr-2">
                  <Link
                    href="/laporan-builder"
                    className="h-8 px-3 border border-[hsl(var(--border))] text-[10px] font-black uppercase tracking-wider flex items-center gap-2 hover:border-[hsl(var(--foreground))]"
                  >
                    <Settings2 className="w-3.5 h-3.5" /> Builder
                  </Link>
                  {selectedId !== "new" && (
                    <button
                      onClick={() =>
                        confirm("Hapus permanen data dasar ini? Data IKL terkait dapat terdampak.") &&
                        deleteMutation.mutate(selectedId as number)
                      }
                      className="p-2 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors"
                      title="Hapus Data"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={closeEdit}
                    className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                    title="Tutup Panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editor Form */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-10">
                <form id="editor-form" onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-8 pb-10">
                  {baselineParams.length === 0 && (
                    <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-center space-y-3">
                      <div className="text-[11px] font-black uppercase tracking-widest">
                        Belum ada schema Data Dasar
                      </div>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
                        Form tambah/detail sekarang hanya mengikuti Laporan Builder → tab Data Dasar. Tambahkan field di
                        builder agar form muncul di sini.
                      </p>
                      <Link
                        href="/laporan-builder"
                        className="inline-flex h-9 px-4 items-center justify-center border border-[hsl(var(--foreground))] text-[10px] font-black uppercase tracking-wider hover:bg-[hsl(var(--foreground))] hover:text-[hsl(var(--background))] transition-colors"
                      >
                        Buka Builder → Data Dasar
                      </Link>
                    </div>
                  )}

                  {/* 3. Dynamic Baseline Data */}
                  {baselineParams.length > 0 && (
                    <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                      <div className="px-4 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between">
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--foreground))]">
                            Form Data Dasar — {activeSubCat?.nama}
                          </h3>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                            Struktur field sinkron dari Laporan Builder → tab Data Dasar.
                          </p>
                        </div>
                        <span className="text-[10px] font-black tabular-nums text-[hsl(var(--muted-foreground))]">
                          {baselineParams.length} field
                        </span>
                      </div>
                      <div className="divide-y divide-[hsl(var(--border))]">
                        {baselineParams.map((p) => (
                          <div key={p.code} className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 px-4 py-4">
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                                {p.nama} {p.required ? "*" : ""}
                              </label>
                              <p className="text-[9px] font-mono text-[hsl(var(--muted-foreground))] mt-1">
                                {p.code} · {p.type}
                                {p.config?.syncToParamId ? " · sync" : ""}
                              </p>
                            </div>
                            <div>{renderDynamicInput(p)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Editor Footer Actions */}
              <div className="h-16 shrink-0 border-t border-[hsl(var(--border))] px-6 flex items-center justify-between bg-[hsl(var(--card))]">
                <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
                  {selectedId === "new" ? "Lengkapi data wajib (*)" : "Perubahan akan tersimpan"}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={closeEdit}
                    className="text-[10px] font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    form="editor-form"
                    disabled={saveMutation.isPending || baselineParams.length === 0}
                    className="h-9 px-6 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saveMutation.isPending ? "Menyimpan..." : "Simpan Data"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
