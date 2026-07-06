"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Database, Plus, Search, Settings2, Trash, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePuskesmasList } from "@/hooks/use-puskesmas-list";

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
  grup?: string | null;
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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const userPkmId = (session?.user as any)?.puskesmasId;
  const { data: puskesmasList = [] } = usePuskesmasList();
  const [selectedPkmFilter, setSelectedPkmFilter] = useState<number | null>(null);

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

  const { data: masterJenis = { tpp: [], sarana: [], ttu: [] } } = useQuery<any>({
    queryKey: ["master-jenis"],
    queryFn: async () => {
      const res = await fetch("/api/master/jenis");
      if (!res.ok) throw new Error("Failed to fetch master jenis");
      return res.json();
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

  const baselineParams = [...(category?.parameters?.filter((p) => p.isBaseline) || [])].sort(
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
      const source = p.config?.optionsSource || "auto_category";
      let optionsList: string[] = [];

      const resolvedSource =
        source === "auto_category"
          ? categoryCode?.toLowerCase() === "tpp"
            ? "master_tpp"
            : categoryCode?.toLowerCase() === "ttu"
              ? "master_ttu"
              : "master_sarana"
          : source;

      if (resolvedSource === "master_tpp") {
        optionsList = (masterJenis.tpp || []).map((j: any) => j.nama);
      } else if (resolvedSource === "master_ttu") {
        optionsList = (masterJenis.ttu || []).map((j: any) => j.nama);
      } else if (resolvedSource === "master_sarana") {
        optionsList = (masterJenis.sarana || []).map((j: any) => j.nama);
      } else if (resolvedSource === "entities") {
        optionsList = allSubCats.map((sc) => sc.nama);
      } else {
        optionsList = getOptions(p);
      }

      return (
        <select required={!!p.required} value={value} onChange={(e) => setValue(e.target.value)} className={baseClass}>
          <option value="">Pilih...</option>
          {optionsList.map((opt) => (
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

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [selectedSubCatId, selectedPkmFilter, debouncedSearchTerm]);

  // 2. Fetch Data Sasaran
  const {
    data: sasaranPage = { data: [], total: 0, page: 1, totalPages: 1 },
    isLoading: loadingSasaran,
    isFetching: fetchingSasaran,
  } = useQuery<{ data: any[]; total: number; page: number; totalPages: number }>({
    queryKey: ["sasaran", selectedSubCatId, selectedPkmFilter, debouncedSearchTerm, page],
    queryFn: async () => {
      if (!selectedSubCatId) return { data: [], total: 0, page: 1, totalPages: 1 };
      const params = new URLSearchParams({
        subCategoryId: String(selectedSubCatId),
        paginated: "1",
        page: String(page),
        limit: "25",
      });
      if (selectedPkmFilter) params.set("puskesmasId", String(selectedPkmFilter));
      if (debouncedSearchTerm) params.set("search", debouncedSearchTerm);
      const res = await fetch(`/api/sasaran?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data sasaran");
      return res.json();
    },
    enabled: !!selectedSubCatId,
    staleTime: 30_000,
  });

  const filteredSasarans = sasaranPage.data;

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
      puskesmasId: s.puskesmasId || userPkmId,
      subCategoryId: s.subCategoryId || selectedSubCatId,
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
      puskesmasId: selectedPkmFilter || userPkmId || "",
      subCategoryId: selectedSubCatId,
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

  const getMappedEntityValue = (field: string, fallback = "") => {
    const mappedParam = baselineParams.find((p) => p.config?.syncToEntityField === field);
    if (!mappedParam) return fallback;
    const value = formData.dynamicValues?.[mappedParam.code];
    return value !== undefined && value !== null && String(value).trim() !== "" ? String(value).trim() : fallback;
  };

  const getCoreValue = (field: string, legacyKeys: string[], fallback = "") => {
    const mapped = getMappedEntityValue(field, "");
    if (mapped) return mapped;
    for (const key of legacyKeys) {
      const value = formData.dynamicValues?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
    }
    return fallback;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dynamicName = getCoreValue("nama", ["nama", "nama_sarana", "nama_tempat", "nama_usaha", "nama_sasaran"]);
    const firstDynamicValue = Object.values(formData.dynamicValues || {}).find(
      (v) => v !== undefined && v !== null && String(v).trim() !== "",
    );
    const displayName =
      (baselineParams.length > 0 ? dynamicName || String(firstDynamicValue || "") : formData.nama) || "Data Dasar";

    if (!formData.subCategoryId && !selectedSubCatId) {
      toast.error("Jenis entitas belum dipilih");
      return;
    }
    if (userRole !== "OPERATOR" && !formData.puskesmasId && !userPkmId) {
      toast.error("Puskesmas pemilik wajib dipilih");
      return;
    }

    const dynamicAlamat = getCoreValue("alamat", ["alamat", "alamat_lengkap"], formData.alamat || "");
    const dynamicPemilik = getCoreValue("pemilik", ["pemilik", "pengelola", "nama_pemilik"], formData.pemilik || "");
    const dynamicKontak = getCoreValue("kontak", ["kontak", "telepon", "no_hp", "hp"], formData.kontak || "");
    const dynamicLat = getCoreValue("lat", ["lat", "latitude"], formData.lat || "");
    const dynamicLng = getCoreValue("lng", ["lng", "longitude"], formData.lng || "");

    saveMutation.mutate({
      ...formData,
      nama: displayName,
      alamat: dynamicAlamat,
      pemilik: dynamicPemilik,
      kontak: dynamicKontak,
      lat: dynamicLat ? parseFloat(dynamicLat) : null,
      lng: dynamicLng ? parseFloat(dynamicLng) : null,
      subCategoryId: formData.subCategoryId || selectedSubCatId,
      puskesmasId: formData.puskesmasId || userPkmId,
      dataDinamis: formData.dynamicValues,
    });
  };

  if (session && userRole !== "OPERATOR") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4 bg-[hsl(var(--background))] border-t border-[hsl(var(--border))]">
        <div className="w-12 h-12 rounded-none border border-[hsl(var(--border))] flex items-center justify-center bg-[hsl(var(--card))] text-red-500">
          ⚠️
        </div>
        <div className="space-y-1">
          <h1 className="text-[12px] font-black uppercase tracking-widest text-[hsl(var(--foreground))]">
            Akses Ditolak
          </h1>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
            Halaman ini hanya dapat diakses oleh petugas Puskesmas (Operator).
          </p>
        </div>
        <Link
          href="/dashboard-pkm"
          className="h-9 px-4 inline-flex items-center border border-[hsl(var(--foreground))] text-[10px] font-black uppercase tracking-wider hover:bg-[hsl(var(--foreground))] hover:text-[hsl(var(--background))] transition-colors"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

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
            <div className="flex items-center h-full">
              {allSubCats.map((sc) => (
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
                  {sc.grup && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))] leading-none mb-1">
                      {sc.grup}
                    </span>
                  )}
                  <span className="text-[11px] font-black uppercase tracking-wider">{sc.nama}</span>
                </button>
              ))}
            </div>
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
                {activeSubCat?.grup && (
                  <div className="mt-1 inline-flex h-5 items-center border border-[hsl(var(--border))] px-2 text-[9px] font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Kategori Entitas: {activeSubCat.grup}
                  </div>
                )}
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
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama, pemilik, atau alamat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 bg-[hsl(var(--muted))]/10 border border-[hsl(var(--border))] text-[11px] font-medium rounded-none focus:outline-none focus:border-[hsl(var(--foreground))] focus:bg-transparent transition-all"
                />
              </div>
              {userRole !== "OPERATOR" && (
                <select
                  value={selectedPkmFilter || ""}
                  onChange={(e) => setSelectedPkmFilter(e.target.value ? Number(e.target.value) : null)}
                  className="h-8 px-2 bg-[hsl(var(--muted))]/10 border border-[hsl(var(--border))] text-[11px] font-medium text-[hsl(var(--foreground))] outline-none cursor-pointer shrink-0 max-w-[180px]"
                >
                  <option value="">Semua Puskesmas</option>
                  {puskesmasList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="flex-1 overflow-hidden bg-[hsl(var(--background))]">
            {loadingSasaran ? (
              <div className="p-6 text-center text-[11px] text-[hsl(var(--muted-foreground))] font-medium">
                Memuat data...
              </div>
            ) : filteredSasarans.length === 0 ? (
              <div className="h-full p-10 flex flex-col items-center justify-center text-center gap-3 border-t border-[hsl(var(--border))]">
                <Database className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                <div>
                  <p className="text-[12px] font-black text-[hsl(var(--foreground))]">Belum ada data</p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                    Tambah entitas pertama untuk modul ini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col border-t border-[hsl(var(--border))]">
                <div className="flex-1 overflow-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))]">
                      <tr>
                        {userRole !== "OPERATOR" && (
                          <th className="w-[180px] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                            Puskesmas
                          </th>
                        )}
                        <th className="w-[260px] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                          Nama Entitas
                        </th>
                        <th className="w-[260px] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                          Alamat
                        </th>
                        <th className="w-[180px] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                          Pemilik
                        </th>
                        {baselineParams.slice(0, 5).map((p) => (
                          <th
                            key={p.code}
                            className="w-[160px] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))]"
                          >
                            {p.nama}
                          </th>
                        ))}
                        <th className="w-[100px] px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border))]">
                      {filteredSasarans.map((s) => {
                        const dyn = (s.dataDinamis as Record<string, string>) || {};
                        const isSelected = selectedId === s.id;
                        return (
                          <tr
                            key={s.id}
                            onClick={() => handleSelect(s)}
                            className={`group cursor-pointer transition-colors ${
                              isSelected ? "bg-[hsl(var(--muted))]/20" : "hover:bg-[hsl(var(--muted))]/10"
                            }`}
                          >
                            {userRole !== "OPERATOR" && (
                              <td className="px-4 py-3 align-top text-[11px] font-semibold text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                                {s.puskesmas?.nama || "-"}
                              </td>
                            )}
                            <td className="px-4 py-3 align-top">
                              <div className="text-[12px] font-black text-[hsl(var(--foreground))] truncate max-w-[240px]">
                                {s.nama}
                              </div>
                              <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] mt-1">
                                ID #{s.id}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top text-[11px] text-[hsl(var(--muted-foreground))] max-w-[260px] truncate">
                              {s.alamat || "-"}
                            </td>
                            <td className="px-4 py-3 align-top text-[11px] text-[hsl(var(--foreground))] whitespace-nowrap">
                              {s.pemilik || "-"}
                            </td>
                            {baselineParams.slice(0, 5).map((p) => (
                              <td
                                key={p.code}
                                className="px-4 py-3 align-top text-[11px] text-[hsl(var(--foreground))] max-w-[160px] truncate"
                                title={String(dyn[p.code] || "")}
                              >
                                {dyn[p.code] || "-"}
                              </td>
                            ))}
                            <td className="px-4 py-3 align-top text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelect(s);
                                }}
                                className="h-7 px-2 border border-[hsl(var(--border))] text-[10px] font-black uppercase tracking-wider text-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))] hover:text-[hsl(var(--background))] transition-colors"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="h-10 shrink-0 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 flex items-center justify-between text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  <span>
                    {sasaranPage.total} entitas · halaman {sasaranPage.page}/{Math.max(1, sasaranPage.totalPages)}
                    {fetchingSasaran ? " · sinkronisasi..." : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>
                      {baselineParams.length} field · {syncedParams.length} sync
                    </span>
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="h-6 px-2 border border-[hsl(var(--border))] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[hsl(var(--foreground))]"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={page >= sasaranPage.totalPages}
                      onClick={() => setPage((p) => Math.min(sasaranPage.totalPages, p + 1))}
                      className="h-6 px-2 border border-[hsl(var(--border))] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[hsl(var(--foreground))]"
                    >
                      Next
                    </button>
                  </div>
                </div>
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
                        {/* 1. Dropdown Jenis/Kategori Entitas */}
                        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 px-4 py-4 bg-[hsl(var(--muted))]/10 border-b border-[hsl(var(--border))]">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                              Jenis / Tipe Entitas *
                            </label>
                            <p className="text-[9px] font-mono text-[hsl(var(--muted-foreground))] mt-1">
                              Menentukan skema form & jenis data dasar
                            </p>
                          </div>
                          <div>
                            <select
                              value={formData.subCategoryId || ""}
                              onChange={(e) => {
                                const nextSubCatId = Number(e.target.value);
                                setFormData((prev: any) => ({
                                  ...prev,
                                  subCategoryId: nextSubCatId,
                                }));
                              }}
                              required
                              className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--foreground))] transition-all cursor-pointer"
                            >
                              <option value="">Pilih Jenis</option>
                              {allSubCats.map((sc: any) => (
                                <option key={sc.id} value={sc.id}>
                                  {sc.grup ? `[${sc.grup}] ` : ""}
                                  {sc.nama}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {userRole !== "OPERATOR" && (
                          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 px-4 py-4 bg-[hsl(var(--muted))]/10">
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                                Puskesmas Pemilik *
                              </label>
                              <p className="text-[9px] font-mono text-[hsl(var(--muted-foreground))] mt-1">
                                Entitas milik puskesmas mana
                              </p>
                            </div>
                            <div>
                              <select
                                value={formData.puskesmasId || ""}
                                onChange={(e) => setFormData({ ...formData, puskesmasId: Number(e.target.value) })}
                                required
                                className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--foreground))] transition-all cursor-pointer"
                              >
                                <option value="">Pilih Puskesmas</option>
                                {puskesmasList.map((p: any) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nama}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
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
