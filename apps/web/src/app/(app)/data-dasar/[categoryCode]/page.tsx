"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Pencil, Plus, Search, Settings2, Trash, X } from "lucide-react";
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
      "w-full h-10 bg-white border border-[hsl(var(--border))] rounded-lg px-3 text-[13px] font-medium focus:ring-0 focus:outline-none focus:border-[#00A876] transition-colors";

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
    const targetPkm = formData.puskesmasId || userPkmId || puskesmasList[0]?.id;
    if (userRole !== "OPERATOR" && userRole !== "ADMIN" && !targetPkm) {
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
          className="h-10 px-5 inline-flex items-center rounded-full bg-[#BEF264] text-[#06281E] text-[12px] font-extrabold hover:brightness-95 transition"
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
        <Link href="/data-dasar" className="underline text-[#00A876]">
          Kembali
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto pb-4 fade-in">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-[#0C1B16] text-white rounded-b-3xl">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#00A876] opacity-[0.12]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#123527_0%,transparent_55%)]" />
        <div className="relative z-10 px-8 py-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-2">
              <Link href="/data-dasar" className="hover:text-[#7CF5CE] transition-colors">
                Data Dasar
              </Link>
            </p>
            <h1 className="text-[30px] font-black tracking-[-0.03em] leading-none">{category?.nama || "Memuat..."}</h1>
            <p className="text-[13px] font-medium text-white/50 mt-2">
              {sasaranPage.total} entitas · {baselineParams.length} field · {syncedParams.length} sync
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/laporan-builder"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-white/[0.08] border border-white/15 text-white/80 text-[12px] font-extrabold hover:bg-white/15 transition"
            >
              <Settings2 className="w-3.5 h-3.5" /> Builder
            </Link>
            <button
              onClick={handleNew}
              disabled={!selectedSubCatId}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#BEF264] text-[#06281E] text-[12px] font-extrabold hover:brightness-95 transition disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Data
            </button>
          </div>
        </div>
        {/* Sub-category pills */}
        <div className="relative z-10 px-8 pb-5 flex items-center gap-1.5 overflow-x-auto">
          {allSubCats.map((sc) => (
            <button
              key={sc.id}
              onClick={() => {
                setSelectedSubCatId(sc.id);
                setSearchTerm("");
                closeEdit();
              }}
              className={`shrink-0 inline-flex items-center gap-2 h-8 px-4 rounded-full text-[11px] font-bold transition-colors ${
                sc.id === selectedSubCatId
                  ? "bg-[#BEF264] text-[#06281E]"
                  : "bg-white/[0.08] text-white/60 border border-white/15 hover:text-white hover:bg-white/15"
              }`}
            >
              {sc.grup && <span className="text-[9px] font-extrabold opacity-60 uppercase">{sc.grup}</span>}
              {sc.nama}
            </button>
          ))}
        </div>
      </div>

      {/* ── SEARCH + FILTER ── */}
      <div className="mt-6 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Cari nama, pemilik, atau alamat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl text-[13px] font-medium focus:outline-none focus:border-[#00A876] transition-colors"
          />
        </div>
        {userRole !== "OPERATOR" && (
          <select
            value={selectedPkmFilter || ""}
            onChange={(e) => setSelectedPkmFilter(e.target.value ? Number(e.target.value) : null)}
            className="h-10 px-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl text-[12px] font-medium outline-none cursor-pointer shrink-0 max-w-[200px]"
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

      {/* ── LIST ── */}
      <div className="pt-4">
        {loadingSasaran ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[72px] rounded-2xl bg-[hsl(var(--muted))]/20 animate-pulse" />
            ))}
          </div>
        ) : filteredSasarans.length === 0 ? (
          <div className="border border-dashed border-[hsl(var(--border))] rounded-xl p-10 flex flex-col items-center justify-center text-center">
            <Database className="w-8 h-8 text-[hsl(var(--muted-foreground))]/40 mb-3" />
            <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Belum Ada Data</p>
            <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">
              Tambah entitas pertama untuk modul {activeSubCat?.nama || "ini"}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredSasarans.map((s) => {
              const dyn = (s.dataDinamis as Record<string, string>) || {};
              const preview = baselineParams
                .slice(0, 3)
                .map((p) => dyn[p.code])
                .filter(Boolean)
                .join(" · ");
              return (
                <div
                  key={s.id}
                  className="group flex items-stretch rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[#00A876]/40 transition-colors overflow-hidden"
                >
                  <div className="w-1 shrink-0 bg-[#00A876]" />
                  <div className="flex-1 flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-[#00A876]/10 text-[#00A876] flex items-center justify-center shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-extrabold text-[hsl(var(--foreground))] truncate">{s.nama}</h4>
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                        {[s.alamat, s.pemilik].filter(Boolean).join(" · ") || preview || `#${s.id}`}
                      </p>
                    </div>
                    {userRole !== "OPERATOR" && s.puskesmas?.nama && (
                      <span className="hidden md:inline-flex shrink-0 text-[10px] font-bold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]/40 px-2.5 py-1 rounded-full">
                        {s.puskesmas.nama}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelect(s)}
                      className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-bold text-[#00A876] hover:bg-[#00A876]/10 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {filteredSasarans.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
            <span>
              {sasaranPage.total} entitas · halaman {sasaranPage.page}/{Math.max(1, sasaranPage.totalPages)}
              {fetchingSasaran ? " · sinkronisasi..." : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] disabled:opacity-40 hover:border-[#00A876] hover:text-[#00A876] transition-colors"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= sasaranPage.totalPages}
                onClick={() => setPage((p) => Math.min(sasaranPage.totalPages, p + 1))}
                className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] disabled:opacity-40 hover:border-[#00A876] hover:text-[#00A876] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: ADD / EDIT ── */}
      {selectedId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 fade-in">
          <div className="w-full max-w-3xl h-[86vh] flex flex-col bg-[hsl(var(--background))] rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="shrink-0 px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--card))]">
              <div>
                <h2 className="text-[15px] font-extrabold">
                  {selectedId === "new" ? "Tambah Data Dasar" : "Detail Data Dasar"}
                </h2>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  {baselineParams.length} field dari builder · {syncedParams.length} tersinkron
                </p>
              </div>
              <div className="flex items-center gap-1">
                {selectedId !== "new" && (
                  <button
                    onClick={() =>
                      confirm("Hapus permanen data dasar ini? Data IKL terkait dapat terdampak.") &&
                      deleteMutation.mutate(selectedId as number)
                    }
                    className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[#E15A4F] hover:bg-[#E15A4F]/10 rounded-lg transition-colors"
                    title="Hapus Data"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={closeEdit}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6">
              <form id="editor-form" onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
                {baselineParams.length === 0 ? (
                  <div className="border border-dashed border-[hsl(var(--border))] rounded-xl p-8 text-center space-y-3">
                    <p className="text-[13px] font-bold">Belum ada schema Data Dasar</p>
                    <p className="text-[12px] text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
                      Form mengikuti Laporan Builder → tab Data Dasar. Tambahkan field di builder, atau buat 3 field
                      default (Nama, Alamat, No HP).
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => seedDefaultMutation.mutate()}
                        disabled={seedDefaultMutation.isPending}
                        className="inline-flex h-10 px-5 items-center rounded-full bg-[#00A876] text-white text-[12px] font-extrabold hover:brightness-95 transition disabled:opacity-50"
                      >
                        {seedDefaultMutation.isPending ? "Membuat..." : "Buat Field Default"}
                      </button>
                      <Link
                        href="/laporan-builder"
                        className="inline-flex h-10 px-5 items-center rounded-full bg-[#BEF264] text-[#06281E] text-[12px] font-extrabold hover:brightness-95 transition"
                      >
                        Buka Builder
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Jenis entitas */}
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 items-center px-4 py-3 rounded-xl bg-[hsl(var(--muted))]/20">
                      <div>
                        <label className="block text-[11px] font-bold text-[hsl(var(--foreground))]">
                          Jenis / Tipe Entitas *
                        </label>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Skema form & kategori</p>
                      </div>
                      <select
                        value={formData.subCategoryId || ""}
                        onChange={(e) =>
                          setFormData((prev: any) => ({ ...prev, subCategoryId: Number(e.target.value) }))
                        }
                        required
                        className="w-full h-10 px-3 bg-white border border-[hsl(var(--border))] rounded-lg text-[13px] font-medium outline-none focus:border-[#00A876] transition-colors cursor-pointer"
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
                      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 items-center px-4 py-3 rounded-xl bg-[hsl(var(--muted))]/20">
                        <div>
                          <label className="block text-[11px] font-bold text-[hsl(var(--foreground))]">
                            Puskesmas Pemilik *
                          </label>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                            Entitas milik PKM mana
                          </p>
                        </div>
                        <select
                          value={formData.puskesmasId || ""}
                          onChange={(e) => setFormData({ ...formData, puskesmasId: Number(e.target.value) })}
                          required
                          className="w-full h-10 px-3 bg-white border border-[hsl(var(--border))] rounded-lg text-[13px] font-medium outline-none focus:border-[#00A876] transition-colors cursor-pointer"
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
                        className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 items-center px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                      >
                        <div>
                          <label className="block text-[11px] font-bold text-[hsl(var(--foreground))]">
                            {p.nama} {p.required ? <span className="text-[#E15A4F]">*</span> : ""}
                          </label>
                          <p className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] mt-0.5">
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
            <div className="shrink-0 border-t border-[hsl(var(--border))] px-6 py-4 flex items-center justify-between bg-[hsl(var(--card))]">
              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {selectedId === "new" ? "Lengkapi data wajib (*)" : "Perubahan akan tersimpan"}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="h-10 px-4 text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="editor-form"
                  disabled={saveMutation.isPending || baselineParams.length === 0}
                  className="h-10 px-6 rounded-full bg-[#00A876] text-white text-[12px] font-extrabold hover:brightness-95 transition disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
