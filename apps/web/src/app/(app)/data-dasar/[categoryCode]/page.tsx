"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Pencil, Plus, Search, Settings2, Trash, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePuskesmasList } from "@/hooks/use-puskesmas-list";
import { type BaselineKey, baselineParamKey } from "@/lib/sasaran-meta";

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
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [selectedPkmFilter, setSelectedPkmFilter] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({});

  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const userPkmId = (session?.user as any)?.puskesmasId;

  // 1. Fetch categories
  const { data: cats = [], isLoading: loadingCats } = useQuery<Category[]>({
    queryKey: ["laporan-category-page-data-dasar", categoryCode],
    queryFn: async () => {
      const res = await fetch(`/api/laporan/categories?includeSub=true`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const category = useMemo(
    () => cats.find((c) => c.code.toLowerCase() === categoryCode.toLowerCase()),
    [cats, categoryCode],
  );

  const { data: masterJenis = {} } = useQuery<any>({
    queryKey: ["master-jenis"],
    queryFn: async () => {
      const res = await fetch("/api/master/jenis");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: puskesmasList = [] } = usePuskesmasList();

  const allSubCats = useMemo(
    () => (category?.subCategories || []).map((sc) => ({ ...sc, categoryNama: category?.nama ?? "" })),
    [category],
  );

  const activeSubCat = allSubCats.find((sc) => sc.id === selectedSubCatId);

  const baselineParams: Parameter[] = useMemo(
    () =>
      [...(category?.parameters || [])].filter((p) => p.isBaseline).sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0)),
    [category],
  );
  const syncedParams = baselineParams.filter((p) => p.config?.syncToParamId);

  const getOptions = (p: Parameter): string[] => {
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
      "w-full h-10 rounded-button border border-border bg-surface text-text-main px-3 text-[13px] font-medium focus:outline-none focus:border-primary transition-colors";

    if (p.type === "SELECT") {
      const customOptions = getOptions(p);
      let optionsList: string[] = [];

      if (customOptions.length > 0) {
        optionsList = customOptions;
      } else {
        const source = p.config?.optionsSource || "auto_category";
        const catClean = categoryCode?.toLowerCase() || "";
        const resolvedSource =
          source === "auto_category"
            ? catClean === "tpp"
              ? "master_tpp"
              : catClean === "ttu"
                ? "master_ttu"
                : catClean === "sab" || catClean === "sam" || catClean === "sarana"
                  ? "master_sarana"
                  : "sub_categories"
            : source;

        if (resolvedSource === "master_tpp") {
          optionsList = (masterJenis.tpp || []).map((j: any) => j.nama);
        } else if (resolvedSource === "master_ttu") {
          optionsList = (masterJenis.ttu || []).map((j: any) => j.nama);
        } else if (resolvedSource === "master_sarana") {
          optionsList = (masterJenis.sarana || []).map((j: any) => j.nama);
        } else {
          optionsList = allSubCats.map((sc) => sc.nama);
        }
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

    if (p.type === "BOOLEAN") {
      return (
        <select required={!!p.required} value={value} onChange={(e) => setValue(e.target.value)} className={baseClass}>
          <option value="">Pilih...</option>
          <option value="TRUE">Ya</option>
          <option value="FALSE">Tidak</option>
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

  // Isi kolom Sasaran dari field baseline walaupun operator tidak memasang
  // "Sinkron ke Field Entitas". Field baseline dibuat Laporan Builder dengan
  // kode data_dasar_<timestamp>, jadi daftar kode hardcoded tidak pernah
  // cocok dan kolom alamat/pemilik selalu kosong.
  const fillSasaranColumns = (dynamicValues: Record<string, unknown> | undefined, form: any) => {
    const pick = (key: BaselineKey, fallback: string) => {
      for (const p of baselineParams) {
        if (baselineParamKey(p) !== key) continue;
        const v = String(dynamicValues?.[p.code] ?? "").trim();
        if (v) return v;
      }
      return fallback;
    };
    const lat = pick("lat", form?.lat ? String(form.lat) : "");
    const lng = pick("lng", form?.lng ? String(form.lng) : "");
    return {
      nama: pick("nama", form?.nama || ""),
      alamat: pick("alamat", form?.alamat || ""),
      pemilik: pick("pemilik", form?.pemilik || ""),
      kontak: pick("kontak", form?.kontak || ""),
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
    };
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
      queryClient.invalidateQueries({ queryKey: ["sasaran"] });
      toast.success(selectedId === "new" ? "Data berhasil ditambahkan" : "Data berhasil diperbarui");
      closeEdit();
    },
    onError: (err: any) => toast.error(err.message || "Terjadi kesalahan"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/sasaran/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus data");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sasaran"] });
      toast.success("Data berhasil dihapus");
      closeEdit();
    },
    onError: (err: any) => toast.error(err.message || "Gagal menghapus"),
  });

  const seedDefaultMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/master/dynamic-categories/${category?.id}/seed-baseline`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal membuat field default");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["laporan-category-page-data-dasar", categoryCode] });
      queryClient.invalidateQueries({ queryKey: ["laporan-categories"] });
      if (data.created > 0) toast.success(`${data.created} field default dibuat: ${data.codes.join(", ")}`);
      else toast.info("Semua field default sudah ada");
    },
    onError: (err: any) => toast.error(err.message || "Gagal membuat field default"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Nama entitas dibaca lewat resolusi key, bukan daftar kode, supaya field
    // yang baru dibuat Laporan Builder (data_dasar_<timestamp>) ikut terbaca
    // sebagai nama/alamat/pemilik.
    const sasaranCols = fillSasaranColumns(formData.dynamicValues, formData);
    const displayName = sasaranCols.nama || String(formData.nama || "") || "Data Dasar";

    if (!formData.subCategoryId && !selectedSubCatId) {
      toast.error("Jenis entitas belum dipilih");
      return;
    }
    const targetPkm = formData.puskesmasId || userPkmId || puskesmasList[0]?.id;
    if (userRole !== "OPERATOR" && userRole !== "ADMIN" && !targetPkm) {
      toast.error("Puskesmas pemilik wajib dipilih");
      return;
    }

    saveMutation.mutate({
      ...formData,
      nama: displayName,
      alamat: sasaranCols.alamat || null,
      pemilik: sasaranCols.pemilik || null,
      kontak: sasaranCols.kontak || null,
      lat: sasaranCols.lat,
      lng: sasaranCols.lng,
      subCategoryId: formData.subCategoryId || selectedSubCatId,
      puskesmasId: targetPkm,
      dataDinamis: formData.dynamicValues,
    });
  };

  if (session && userRole !== "OPERATOR" && userRole !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-4">
        <Database className="w-10 h-10 text-[hsl(var(--muted-foreground))] opacity-40" />
        <div>
          <h1 className="text-[16px] font-bold">Akses Ditolak</h1>
          <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-1">
            Halaman ini hanya untuk petugas Puskesmas (Operator).
          </p>
        </div>
        <Link
          href="/dashboard-pkm"
          className="h-10 px-5 inline-flex items-center rounded-xl bg-primary text-white text-[12px] font-extrabold hover:bg-primary-hover transition shadow-subtle"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  if (!category && !loadingCats) {
    return (
      <div className="p-10 text-center text-foreground">
        Kategori tidak ditemukan.{" "}
        <Link href="/data-dasar" className="underline text-primary">
          Kembali
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full fade-in min-h-screen bg-canvas">
      {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
      <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
        <div className="w-full max-w-[1600px] mx-auto space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary mb-1.5 sm:mb-2">
                <Link href="/data-dasar" className="hover:underline transition-colors">
                  ← Data Dasar
                </Link>
              </p>
              <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-none text-foreground">
                {category?.nama || "Memuat..."}
              </h1>
              <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-2">
                <span className="tabular-nums font-bold text-foreground">{sasaranPage.total}</span> entitas ·{" "}
                <span className="tabular-nums font-bold text-foreground">{baselineParams.length}</span> field ·{" "}
                <span className="tabular-nums font-bold text-foreground">{syncedParams.length}</span> sync
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/laporan-builder"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-surface border border-border text-foreground text-[12px] font-extrabold hover:bg-muted transition shadow-xs"
              >
                <Settings2 className="w-3.5 h-3.5" /> Builder
              </Link>
              <button
                onClick={handleNew}
                disabled={!selectedSubCatId}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-white text-[12px] font-black hover:bg-primary-hover active:scale-95 transition shadow-xs disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Data
              </button>
            </div>
          </div>

          {/* Sub-category pills */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1 no-scrollbar">
            {allSubCats.map((sc) => (
              <button
                key={sc.id}
                onClick={() => {
                  setSelectedSubCatId(sc.id);
                  setSearchTerm("");
                  closeEdit();
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[11px] font-bold transition-all ${
                  sc.id === selectedSubCatId
                    ? "bg-primary text-white shadow-xs"
                    : "bg-surface text-muted-foreground border border-border hover:text-foreground hover:bg-muted"
                }`}
              >
                {sc.grup && <span className="text-[11px] font-extrabold opacity-60 uppercase">{sc.grup}</span>}
                <span>{sc.nama}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT BODY (CANVAS) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
        {/* ── SEARCH + FILTER ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama, pemilik, atau alamat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-10 rounded-button border border-border bg-surface text-text-main text-[13px] font-medium outline-none focus:border-primary shadow-subtle transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {userRole !== "OPERATOR" && (
            <select
              value={selectedPkmFilter || ""}
              onChange={(e) => setSelectedPkmFilter(e.target.value ? Number(e.target.value) : null)}
              className="h-10 px-3 rounded-button border border-border bg-surface text-text-main text-[12px] font-medium outline-none focus:border-primary cursor-pointer shrink-0 max-w-[220px] shadow-subtle"
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

        {/* ── TABLE CONTAINER ── */}
        <div className="space-y-3 pt-1">
          {loadingSasaran ? (
            <div className="rounded-card bg-surface border border-border shadow-subtle p-8 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
              <p className="text-[12px] font-medium text-muted-foreground">Memuat data sasaran...</p>
            </div>
          ) : filteredSasarans.length === 0 ? (
            <div className="rounded-card bg-surface border border-dashed border-border shadow-subtle p-10 flex flex-col items-center justify-center text-center">
              <Database className="w-8 h-8 text-muted-foreground/40 mb-3" />
              <p className="text-[13px] font-bold text-foreground">Belum Ada Data</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Tambah entitas pertama untuk modul {activeSubCat?.nama || "ini"}.
              </p>
            </div>
          ) : (
            <div className="rounded-card bg-surface border border-border shadow-subtle overflow-hidden">
              <div className="overflow-x-auto max-h-[calc(100vh-340px)]">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 bg-surface z-10 border-b border-border text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5">Nama Entitas</th>
                      <th className="px-4 py-3.5">Alamat & Pengelola</th>
                      {userRole !== "OPERATOR" && <th className="px-4 py-3.5">Puskesmas</th>}
                      <th className="px-4 py-3.5 hidden md:table-cell">Parameter Data Dasar</th>
                      <th className="px-5 py-3.5 text-right w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredSasarans.map((s) => {
                      const dyn = (s.dataDinamis as Record<string, string>) || {};
                      const preview = baselineParams
                        .slice(0, 3)
                        .map((p) => {
                          const v = dyn[p.code];
                          return v ? `${p.nama}: ${v}` : null;
                        })
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <tr key={s.id} className="hover:bg-surface-subtle/70 transition-colors group">
                          <td className="px-5 py-3.5 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                                <Database className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[13px] font-extrabold text-foreground block truncate group-hover:text-primary transition-colors">
                                  {s.nama}
                                </span>
                                <span className="text-[10px] font-semibold text-muted-foreground block truncate tabular-nums">
                                  ID #{s.id}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="text-[12px] font-medium text-foreground truncate max-w-xs">
                              {s.alamat || <span className="text-muted-foreground/50 italic">Alamat belum diisi</span>}
                            </div>
                            {(s.pemilik || s.kontak) && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-xs">
                                {[s.pemilik, s.kontak].filter(Boolean).join(" · ")}
                              </div>
                            )}
                          </td>
                          {userRole !== "OPERATOR" && (
                            <td className="px-4 py-3.5 align-middle">
                              {s.puskesmas?.nama ? (
                                <span className="inline-flex text-[10px] font-bold text-muted-foreground bg-surface-subtle px-2.5 py-1 rounded-full border border-border">
                                  {s.puskesmas.nama}
                                </span>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/40">—</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3.5 align-middle hidden md:table-cell">
                            <span className="text-[11px] text-muted-foreground block truncate max-w-md">
                              {preview || <span className="text-muted-foreground/40 italic">—</span>}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 align-middle text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleSelect(s)}
                                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-button text-[11px] font-bold text-primary hover:bg-primary-subtle transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Hapus permanen "${s.nama}"? Data IKL terkait dapat terdampak.`)) {
                                    deleteMutation.mutate(s.id);
                                  }
                                }}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-button text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                title="Hapus Data Dasar"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="px-5 py-3.5 border-t border-border bg-surface flex flex-wrap items-center justify-between gap-3 text-[11px] font-bold text-muted-foreground">
                <span>
                  <span className="tabular-nums font-semibold">{sasaranPage.total}</span> entitas · halaman{" "}
                  <span className="tabular-nums font-semibold">{sasaranPage.page}</span>/
                  <span className="tabular-nums font-semibold">{Math.max(1, sasaranPage.totalPages)}</span>
                  {fetchingSasaran ? " · sinkronisasi..." : ""}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 rounded-button border border-border bg-surface text-text-main text-[11px] font-bold disabled:opacity-40 hover:border-primary hover:text-primary transition-colors shadow-subtle"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={page >= sasaranPage.totalPages}
                    onClick={() => setPage((p) => Math.min(sasaranPage.totalPages, p + 1))}
                    className="h-8 px-3 rounded-button border border-border bg-surface text-text-main text-[11px] font-bold disabled:opacity-40 hover:border-primary hover:text-primary transition-colors shadow-subtle"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── MODAL: ADD / EDIT ── */}
        {selectedId && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 fade-in">
            <div className="w-full max-w-3xl h-[86vh] flex flex-col rounded-card bg-surface border border-border shadow-float overflow-hidden">
              {/* Header */}
              <div className="shrink-0 px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
                <div>
                  <h2 className="text-[15px] font-extrabold text-foreground">
                    {selectedId === "new" ? "Tambah Data Dasar" : "Detail Data Dasar"}
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    <span className="tabular-nums font-semibold">{baselineParams.length}</span> field dari builder ·{" "}
                    <span className="tabular-nums font-semibold">{syncedParams.length}</span> tersinkron
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {selectedId !== "new" && (
                    <button
                      onClick={() =>
                        confirm("Hapus permanen data dasar ini? Data IKL terkait dapat terdampak.") &&
                        deleteMutation.mutate(selectedId as number)
                      }
                      className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-button transition-colors"
                      title="Hapus Data"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={closeEdit}
                    className="p-2 text-muted-foreground hover:bg-surface-subtle rounded-button transition-colors"
                    title="Tutup"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto p-6 bg-canvas">
                <form id="editor-form" onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
                  {baselineParams.length === 0 ? (
                    <div className="rounded-card bg-surface border border-dashed border-border shadow-subtle p-8 text-center space-y-3">
                      <p className="text-[13px] font-bold text-foreground">Belum ada schema Data Dasar</p>
                      <p className="text-[12px] text-muted-foreground max-w-md mx-auto">
                        Form mengikuti Laporan Builder → tab Data Dasar. Tambahkan field di builder, atau buat 3 field
                        default (Nama, Alamat, No HP).
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => seedDefaultMutation.mutate()}
                          disabled={seedDefaultMutation.isPending}
                          className="inline-flex h-10 px-5 items-center rounded-button bg-primary text-white text-[12px] font-extrabold hover:bg-primary-hover transition shadow-subtle disabled:opacity-50"
                        >
                          {seedDefaultMutation.isPending ? "Membuat..." : "Buat Field Default"}
                        </button>
                        <Link
                          href="/laporan-builder"
                          className="inline-flex h-10 px-5 items-center rounded-button bg-surface-subtle border border-border text-foreground hover:bg-surface-hover text-[12px] font-extrabold transition shadow-subtle"
                        >
                          Buka Builder
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Jenis entitas */}
                      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 items-center px-4 py-3 rounded-card border border-border bg-surface shadow-subtle">
                        <div>
                          <label className="block text-[11px] font-bold text-foreground">Jenis / Tipe Entitas *</label>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Skema form & kategori</p>
                        </div>
                        <select
                          value={formData.subCategoryId || ""}
                          onChange={(e) =>
                            setFormData((prev: any) => ({ ...prev, subCategoryId: Number(e.target.value) }))
                          }
                          required
                          className="w-full h-10 px-3 rounded-button border border-border bg-surface text-text-main text-[13px] font-medium outline-none focus:border-primary transition-colors cursor-pointer"
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

                      {userRole !== "OPERATOR" && (
                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 items-center px-4 py-3 rounded-card border border-border bg-surface shadow-subtle">
                          <div>
                            <label className="block text-[11px] font-bold text-foreground">Puskesmas Pemilik *</label>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Entitas milik PKM mana</p>
                          </div>
                          <select
                            value={formData.puskesmasId || ""}
                            onChange={(e) => setFormData({ ...formData, puskesmasId: Number(e.target.value) })}
                            required
                            className="w-full h-10 px-3 rounded-button border border-border bg-surface text-text-main text-[13px] font-medium outline-none focus:border-primary transition-colors cursor-pointer"
                          >
                            <option value="">Pilih Puskesmas</option>
                            {puskesmasList.map((p: any) => (
                              <option key={p.id} value={p.id}>
                                {p.nama}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {baselineParams.map((p) => (
                        <div
                          key={p.code}
                          className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 items-center px-4 py-3 rounded-card border border-border bg-surface shadow-subtle"
                        >
                          <div>
                            <label className="block text-[11px] font-bold text-foreground">
                              {p.nama} {p.required ? <span className="text-rose-500">*</span> : ""}
                            </label>
                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              {p.code} · {p.type}
                              {p.config?.syncToParamId ? " · sync" : ""}
                            </p>
                          </div>
                          <div>{renderDynamicInput(p)}</div>
                        </div>
                      ))}
                    </>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-border px-6 py-4 flex items-center justify-between bg-surface">
                {selectedId !== "new" ? (
                  <button
                    type="button"
                    onClick={() =>
                      confirm("Hapus permanen data dasar ini? Data IKL terkait dapat terdampak.") &&
                      deleteMutation.mutate(selectedId as number)
                    }
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center gap-1.5 h-10 px-3.5 text-[12px] font-bold text-rose-600 hover:bg-rose-500/10 rounded-button transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                    {deleteMutation.isPending ? "Menghapus..." : "Hapus Data"}
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Lengkapi data wajib (*)</span>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="h-10 px-4 text-[12px] font-bold text-muted-foreground hover:bg-surface-subtle rounded-button transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    form="editor-form"
                    disabled={saveMutation.isPending || baselineParams.length === 0}
                    className="h-10 px-6 rounded-button bg-primary hover:bg-primary-hover text-white text-[12px] font-extrabold shadow-subtle transition disabled:opacity-50"
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
