"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, MoreVertical, Pencil, Plus, Settings2, Trash } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { NumberFlow } from "@/components/ui/number-flow";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { usePuskesmasList } from "@/hooks/use-puskesmas-list";
import { sasaranColumnsFromDynamic } from "@/lib/sasaran-meta";

/** Harus sama dengan `limit` pada query /api/sasaran di bawah. */
const PAGE_SIZE = 25;

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

  const subCatGroups = useMemo(() => {
    const groups = new Map<string, typeof allSubCats>();
    for (const sc of allSubCats) {
      const key = (sc.grup || "").trim() || "Lainnya";
      const bucket = groups.get(key);
      if (bucket) bucket.push(sc);
      else groups.set(key, [sc]);
    }
    return Array.from(groups, ([grup, items]) => ({ grup, items }));
  }, [allSubCats]);

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
        <Select required={!!p.required} value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="">Pilih...</option>
          {optionsList.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      );
    }

    if (p.type === "BOOLEAN") {
      return (
        <Select required={!!p.required} value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="">Pilih...</option>
          <option value="TRUE">Ya</option>
          <option value="FALSE">Tidak</option>
        </Select>
      );
    }

    if (p.type === "TEXTAREA") {
      return (
        <Textarea
          required={!!p.required}
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="resize-none"
        />
      );
    }
    return (
      <Input
        required={!!p.required}
        type={p.type === "NUMBER" || p.type === "DECIMAL" ? "number" : p.type === "DATE" ? "date" : "text"}
        step={p.type === "DECIMAL" ? "any" : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
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
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1);
    }, 250);
    return () => clearTimeout(handle);
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
        limit: String(PAGE_SIZE),
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
    const sasaranCols = sasaranColumnsFromDynamic(formData.dynamicValues, baselineParams, formData);
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
        <Database className="w-10 h-10 text-muted-foreground opacity-40" />
        <div>
          <h1 className="text-[16px] font-bold">Akses Ditolak</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Halaman ini hanya untuk petugas Puskesmas (Operator).
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard-pkm">Kembali ke Dashboard</Link>
        </Button>
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
                <span className="tabular-nums font-bold text-foreground">
                  <NumberFlow value={sasaranPage.total} />
                </span>{" "}
                entitas ·{" "}
                <span className="tabular-nums font-bold text-foreground">
                  <NumberFlow value={baselineParams.length} />
                </span>{" "}
                field ·{" "}
                <span className="tabular-nums font-bold text-foreground">
                  <NumberFlow value={syncedParams.length} />
                </span>{" "}
                sync
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/laporan-builder">
                  <Settings2 className="w-3.5 h-3.5 mr-1" /> Builder
                </Link>
              </Button>
              <Button size="sm" onClick={handleNew} disabled={!selectedSubCatId} className="rounded-full shadow-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Data
              </Button>
            </div>
          </div>

          {/* Subcat groups */}
          <div className="flex flex-col gap-2.5 pt-2">
            {subCatGroups.map((group) => (
              <div key={group.grup} className="flex flex-wrap items-center gap-2">
                {group.grup !== "Lainnya" && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    {group.grup}
                  </span>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  {group.items.map((sc) => {
                    const active = sc.id === selectedSubCatId;
                    return (
                      <Button
                        key={sc.id}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedSubCatId(sc.id);
                          setSearchTerm("");
                          closeEdit();
                        }}
                        aria-pressed={active}
                        className="h-8 px-3.5 rounded-full text-[11px] font-bold gap-1.5"
                      >
                        {sc.nama}
                        {active && <span className="tabular-nums opacity-80">({sasaranPage.total})</span>}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT BODY (CANVAS) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
        {/* ── SEARCH + FILTER ── */}
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Cari nama, pemilik, atau alamat..."
          isFetching={fetchingSasaran}
          activeFilters={[
            ...(selectedSubCatId && activeSubCat
              ? [
                  {
                    key: "subcat",
                    label: `Sub-kategori: ${activeSubCat.nama}`,
                  },
                ]
              : []),
            ...(selectedPkmFilter
              ? [
                  {
                    key: "pkm",
                    label: `Puskesmas: ${puskesmasList.find((p: any) => p.id === selectedPkmFilter)?.nama || selectedPkmFilter}`,
                    onRemove: () => setSelectedPkmFilter(null),
                  },
                ]
              : []),
          ]}
          onReset={() => {
            setSearchTerm("");
            setSelectedPkmFilter(null);
          }}
        >
          {userRole !== "OPERATOR" && (
            <Select
              value={selectedPkmFilter ? String(selectedPkmFilter) : ""}
              onChange={(e) => setSelectedPkmFilter(e.target.value ? Number(e.target.value) : null)}
              aria-label="Saring menurut puskesmas"
              className="h-10 w-auto max-w-[220px] shrink-0 text-[12px] font-medium"
            >
              <option value="">Semua Puskesmas</option>
              {puskesmasList.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </Select>
          )}
        </FilterBar>

        {/* ── TABLE CONTAINER ── */}
        <div className="space-y-3 pt-1">
          {loadingSasaran ? (
            <Card className="p-8 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
              <p className="text-[12px] font-medium text-muted-foreground">Memuat data sasaran...</p>
            </Card>
          ) : filteredSasarans.length === 0 ? (
            <Card className="border-dashed p-10 flex flex-col items-center justify-center text-center">
              <Database className="w-8 h-8 text-muted-foreground/40 mb-3" />
              <p className="text-[13px] font-bold text-foreground">Belum Ada Data</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Tambah entitas pertama untuk modul {activeSubCat?.nama || "ini"}.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto max-h-[calc(100vh-340px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-5">Nama Entitas</TableHead>
                      <TableHead className="px-4">Alamat & Pengelola</TableHead>
                      {userRole !== "OPERATOR" && <TableHead className="px-4">Puskesmas</TableHead>}
                      <TableHead className="px-4 hidden md:table-cell">Parameter Data Dasar</TableHead>
                      <TableHead className="px-5 text-right w-28">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
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
                        <TableRow key={s.id} className="group">
                          <TableCell className="px-5 py-3.5">
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
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <div className="text-[12px] font-medium text-foreground truncate max-w-xs">
                              {s.alamat || <span className="text-muted-foreground/50 italic">Alamat belum diisi</span>}
                            </div>
                            {(s.pemilik || s.kontak) && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-xs">
                                {[s.pemilik, s.kontak].filter(Boolean).join(" · ")}
                              </div>
                            )}
                          </TableCell>
                          {userRole !== "OPERATOR" && (
                            <TableCell className="px-4 py-3.5">
                              {s.puskesmas?.nama ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {s.puskesmas.nama}
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="px-4 py-3.5 hidden md:table-cell">
                            <span className="text-[11px] text-muted-foreground block truncate max-w-md">
                              {preview || <span className="text-muted-foreground/40 italic">—</span>}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelect(s)}
                                className="h-8 px-2.5 text-[11px] font-semibold gap-1"
                                title="Edit Data Dasar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                    title="Aksi Lainnya"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                    <span className="sr-only">Aksi</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => handleSelect(s)} className="gap-2 cursor-pointer">
                                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>Edit Entitas</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (confirm(`Hapus permanen "${s.nama}"? Data IKL terkait dapat terdampak.`)) {
                                        deleteMutation.mutate(s.id);
                                      }
                                    }}
                                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                    <span>Hapus</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="border-t border-border">
                <Pagination
                  page={sasaranPage.page}
                  totalPages={Math.max(1, sasaranPage.totalPages)}
                  total={sasaranPage.total}
                  limit={PAGE_SIZE}
                  onPageChange={setPage}
                  isFetching={fetchingSasaran}
                  noun="entitas"
                  className="border-t-0"
                />
              </div>
            </Card>
          )}
        </div>

        {/* ── DIALOG: ADD / EDIT ── */}
        <Dialog open={!!selectedId} onOpenChange={(open) => !open && closeEdit()}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
              <DialogTitle className="text-[16px]">
                {selectedId === "new" ? "Tambah Data Dasar" : "Detail Data Dasar"}
              </DialogTitle>
              <DialogDescription>
                <span className="tabular-nums font-semibold">{baselineParams.length}</span> field dari builder ·{" "}
                <span className="tabular-nums font-semibold">{syncedParams.length}</span> tersinkron
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 bg-canvas">
              <form id="editor-form" onSubmit={handleSubmit} className="space-y-4">
                {baselineParams.length === 0 ? (
                  <Card className="border-dashed p-8 text-center space-y-3">
                    <p className="text-[13px] font-bold text-foreground">Belum ada schema Data Dasar</p>
                    <p className="text-[12px] text-muted-foreground max-w-md mx-auto">
                      Form mengikuti Laporan Builder → tab Data Dasar. Tambahkan field di builder, atau buat 3 field
                      default (Nama, Alamat, No HP).
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        onClick={() => seedDefaultMutation.mutate()}
                        disabled={seedDefaultMutation.isPending}
                        size="sm"
                      >
                        {seedDefaultMutation.isPending ? "Membuat..." : "Buat Field Default"}
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/laporan-builder">Buka Builder</Link>
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <>
                    <Card className="p-4 space-y-2">
                      <label className="block text-[11px] font-bold text-foreground">Jenis / Tipe Entitas *</label>
                      <Select
                        value={formData.subCategoryId || ""}
                        onChange={(e) =>
                          setFormData((prev: any) => ({ ...prev, subCategoryId: Number(e.target.value) }))
                        }
                        required
                      >
                        <option value="">Pilih Jenis</option>
                        {allSubCats.map((sc: any) => (
                          <option key={sc.id} value={sc.id}>
                            {sc.grup ? `[${sc.grup}] ` : ""}
                            {sc.nama}
                          </option>
                        ))}
                      </Select>
                    </Card>

                    {userRole !== "OPERATOR" && (
                      <Card className="p-4 space-y-2">
                        <label className="block text-[11px] font-bold text-foreground">Puskesmas Pemilik *</label>
                        <Select
                          value={formData.puskesmasId || ""}
                          onChange={(e) => setFormData({ ...formData, puskesmasId: Number(e.target.value) })}
                          required
                        >
                          <option value="">Pilih Puskesmas</option>
                          {puskesmasList.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.nama}
                            </option>
                          ))}
                        </Select>
                      </Card>
                    )}

                    {baselineParams.map((p) => (
                      <Card key={p.code} className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-foreground">
                            {p.nama} {p.required ? <span className="text-rose-500">*</span> : ""}
                          </label>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {p.code} · {p.type}
                            {p.config?.syncToParamId ? " · sync" : ""}
                          </span>
                        </div>
                        <div>{renderDynamicInput(p)}</div>
                      </Card>
                    ))}
                  </>
                )}
              </form>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between bg-surface">
              {selectedId !== "new" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    confirm("Hapus permanen data dasar ini? Data IKL terkait dapat terdampak.") &&
                    deleteMutation.mutate(selectedId as number)
                  }
                  disabled={deleteMutation.isPending}
                  className="text-rose-600 hover:bg-rose-500/10"
                >
                  <Trash className="w-4 h-4 mr-1" />
                  {deleteMutation.isPending ? "Menghapus..." : "Hapus Data"}
                </Button>
              ) : (
                <span className="text-[11px] text-muted-foreground">Lengkapi data wajib (*)</span>
              )}
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={closeEdit}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  form="editor-form"
                  size="sm"
                  disabled={saveMutation.isPending || baselineParams.length === 0}
                >
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan Data"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
