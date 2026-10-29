"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Compass,
  Database,
  Download,
  Droplets,
  Edit3,
  Eye,
  FileCheck,
  FileText,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  SkipForward,
  Sparkles,
  Store,
  Trash2,
  UserCheck,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DateRangeInputs, FilterBar } from "@/components/ui/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { usePuskesmasList } from "@/hooks/use-puskesmas-list";
import { sasaranColumnsFromDynamic, sasaranMetaValue } from "@/lib/sasaran-meta";
import {
  buildRiwayatParams,
  matchesTemplateOwner,
  matchesTemplateSearch,
  templateCategoryName,
  templateCategoryOptions,
} from "@/lib/template-filter";
import { FormView, isFieldDisabledInfo, isSignatureField } from "./FormView";

/** Label dropdown pemilik formulir di tab Formulir. */
const TEMPLATE_OWNER_LABEL: Record<string, string> = {
  all: "Semua Pemilik",
  dinkes: "🏛️ Dinkes",
  own: "🏥 Puskesmas Saya",
  other: "🏥 Puskesmas Lain",
};

import { generateInspectionPDF } from "./pdf-generator";

function getTodayLocalDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSasaranIcon(subCatName?: string, nama?: string) {
  const text = `${subCatName || ""} ${nama || ""}`.toLowerCase();
  if (text.includes("air") || text.includes("depot") || text.includes("dam")) {
    return {
      icon: Droplets,
      bg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
    };
  }
  if (
    text.includes("makan") ||
    text.includes("restoran") ||
    text.includes("pangan") ||
    text.includes("jajanan") ||
    text.includes("ketoprak") ||
    text.includes("soto") ||
    text.includes("tahu") ||
    text.includes("warung") ||
    text.includes("kfc") ||
    text.includes("kuliner")
  ) {
    return {
      icon: UtensilsCrossed,
      bg: "bg-primary-subtle text-primary border border-primary/25",
    };
  }
  return {
    icon: Store,
    bg: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  };
}

export default function PemeriksaanPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const userRole = (session?.user as any)?.role;
  const userPkmId = (session?.user as any)?.puskesmasId;
  const { data: puskesmasList = [] } = usePuskesmasList();
  const queryClient = useQueryClient();
  const [activeForm, setActiveForm] = useState<any>(null);
  const [pendingForm, setPendingForm] = useState<any>(null);
  const [sasaranSearch, setSasaranSearch] = useState("");
  const [sasaranCategoryFilter, setSasaranCategoryFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<Record<number, any>>({});
  const [metaValues, setMetaValues] = useState<Record<number, any>>({});
  const [tanggalPemeriksaan, setTanggalPemeriksaan] = useState<string>(getTodayLocalDate());
  const [activeTab, setActiveTab] = useState<"formulir" | "riwayat">("formulir");
  const [sasaranId, setSasaranId] = useState<number | null>(null);

  // Pagination & Search states
  const [riwayatPage, setRiwayatPage] = useState(1);
  const [riwayatSearch, setRiwayatSearch] = useState("");
  const [formulirPage, setFormulirPage] = useState(1);
  const [formulirLimit, setFormulirLimit] = useState(10);
  const [formulirSearch, setFormulirSearch] = useState("");
  const [formulirCategory, setFormulirCategory] = useState("all");
  // Dinkes | own | other | public — lihat TEMPLATE_OWNER_LABEL.
  const [formulirOwner, setFormulirOwner] = useState("all");

  // Filter riwayat (server-side; semuanya diteruskan sebagai query param).
  const [riwayatDateFrom, setRiwayatDateFrom] = useState("");
  const [riwayatDateTo, setRiwayatDateTo] = useState("");
  const [riwayatStatus, setRiwayatStatus] = useState("all");
  const [riwayatTemplateId, setRiwayatTemplateId] = useState("all");
  const [riwayatUserId, setRiwayatUserId] = useState("all");
  const [riwayatLimit, setRiwayatLimit] = useState(10);

  // Modal tambah sasaran baru langsung dari form (format identik Data Dasar)
  const [isNewSasaranModalOpen, setIsNewSasaranModalOpen] = useState(false);
  const [newSasaranForm, setNewSasaranForm] = useState({
    nama: "",
    subCategoryId: null as number | null,
    puskesmasId: "" as number | string,
    alamat: "",
    pemilik: "",
    kontak: "",
    lat: null as number | null,
    lng: null as number | null,
  });
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["laporan-categories-all"],
    queryFn: async () => {
      const res = await fetch("/api/laporan/categories?includeSub=true");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const targetCategory = useMemo(() => {
    if (!pendingForm) return null;
    const catId = Number(
      pendingForm.config?.dataDasarCategoryId ??
        pendingForm.dataDasarCategory?.id ??
        pendingForm.subCategory?.category?.id ??
        pendingForm.subCategory?.categoryId,
    );
    if (catId && categories.length > 0) {
      const byId = categories.find((c: any) => c.id === catId);
      if (byId) return byId;
    }
    const code = (
      pendingForm.dataDasarCategory?.code ||
      pendingForm.subCategory?.category?.code ||
      pendingForm.config?.categoryCode ||
      ""
    ).toLowerCase();
    if (code && categories.length > 0) {
      const byCode = categories.find((c: any) => c.code.toLowerCase() === code);
      if (byCode) return byCode;
    }
    if (pendingForm.subCategoryId && categories.length > 0) {
      const bySub = categories.find((c: any) =>
        (c.subCategories || []).some((sc: any) => sc.id === pendingForm.subCategoryId),
      );
      if (bySub) return bySub;
    }
    return pendingForm.dataDasarCategory || pendingForm.subCategory?.category || null;
  }, [pendingForm, categories]);

  const { data: sasaranResult = { data: [], total: 0, page: 1, totalPages: 1 } } = useQuery<any>({
    queryKey: ["sasarans-data-dasar", targetCategory?.id || pendingForm?.config?.dataDasarCategoryId],
    queryFn: async () => {
      const categoryId = targetCategory?.id || pendingForm?.config?.dataDasarCategoryId;
      if (!categoryId) return { data: [], total: 0, page: 1, totalPages: 1 };
      const params = new URLSearchParams({ categoryId: String(categoryId), paginated: "1", page: "1", limit: "100" });
      const res = await fetch(`/api/sasaran?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat Data Dasar");
      return res.json();
    },
    enabled: Boolean(targetCategory?.id || pendingForm?.config?.dataDasarCategoryId),
    staleTime: 30_000,
  });
  const sasarans = sasaranResult.data || [];

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["inspection-templates"],
    queryFn: () => fetch("/api/inspection/templates").then((r) => r.json()),
  });

  const { data: riwayatData = { data: [], total: 0, page: 1, totalPages: 1 }, isLoading: isLoadingRiwayat } = useQuery({
    queryKey: [
      "inspection-results",
      riwayatPage,
      riwayatLimit,
      riwayatSearch,
      riwayatDateFrom,
      riwayatDateTo,
      riwayatStatus,
      riwayatTemplateId,
      riwayatUserId,
    ],
    queryFn: async () => {
      const sp = buildRiwayatParams({
        page: riwayatPage,
        limit: riwayatLimit,
        search: riwayatSearch,
        dateFrom: riwayatDateFrom,
        dateTo: riwayatDateTo,
        status: riwayatStatus,
        templateId: riwayatTemplateId,
        userId: riwayatUserId,
      });
      const res = await fetch(`/api/inspection/results?${sp.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat riwayat");
      return res.json();
    },
    staleTime: 15_000,
  });

  const paginatedResults = riwayatData.data || [];
  const totalRiwayat = riwayatData.total ?? 0;
  const totalRiwayatPages = Math.max(1, riwayatData.totalPages || 1);

  // Halaman detail berada di rute sendiri, sedangkan form editnya hidup di
  // sini. Tombol "Edit Pemeriksaan" di sana karena itu kembali ke daftar
  // membawa ?edit=<id>, dan efek ini yang membuka formnya.
  const editParam = searchParams.get("edit");
  const handledEditParam = useRef<string | null>(null);
  useEffect(() => {
    if (searchParams.get("tab") !== "riwayat") return;
    setActiveTab("riwayat");
  }, [searchParams]);
  useEffect(() => {
    if (!editParam || handledEditParam.current === editParam) return;
    if (isLoadingRiwayat) return;
    // Nilai detail lengkap tidak ada di proyeksi ringan daftar; handleEditResult
    // memuatnya sendiri lewat /api/inspection/results/[id].
    const row = paginatedResults.find((r: any) => String(r.id) === editParam);
    if (!row) return;
    handledEditParam.current = editParam;
    setActiveTab("riwayat");
    void handleEditResult(row);
  }, [editParam, isLoadingRiwayat, paginatedResults]);

  // Pagination & Filtering
  const formulirCategoryOptions = useMemo(() => templateCategoryOptions(templates), [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(
      (t: any) =>
        matchesTemplateSearch(t, formulirSearch) &&
        (formulirCategory === "all" || templateCategoryName(t) === formulirCategory) &&
        matchesTemplateOwner(t, formulirOwner, userPkmId),
    );
  }, [templates, formulirSearch, formulirCategory, formulirOwner, userPkmId]);

  const totalFormulirPages = Math.max(1, Math.ceil(filteredTemplates.length / formulirLimit));
  const paginatedTemplates = useMemo(() => {
    const start = (formulirPage - 1) * formulirLimit;
    return filteredTemplates.slice(start, start + formulirLimit);
  }, [filteredTemplates, formulirPage, formulirLimit]);

  const totalVariabel = useMemo(() => {
    return templates.reduce((acc, t: any) => {
      const cnt = (t.fields || []).filter((f: any) => f.grup !== "__META__").length;
      return acc + cnt;
    }, 0);
  }, [templates]);

  const sasaranSubCategories = useMemo(() => {
    const map = new Map<string, number>();
    sasarans.forEach((s: any) => {
      const name = s.subCategory?.nama || "Lainnya";
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([nama, count]) => ({ nama, count }));
  }, [sasarans]);

  const submitMut = useMutation({
    mutationFn: async (data: any) => {
      const isEdit = !!data.id;
      const url = isEdit ? `/api/inspection/results/${data.id}` : "/api/inspection/results";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "Gagal menyimpan");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspection-results"] });
      setActiveForm(null);
      setEditingId(null);
      setFormValues({});
      setMetaValues({});
      toast.success("Pemeriksaan tersimpan");
    },
    onError: (err: any) => toast.error(err.message || "Gagal menyimpan"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/inspection/results/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspection-results"] });
      toast.success("Pemeriksaan dihapus");
    },
    onError: () => toast.error("Gagal menghapus"),
  });

  const createSasaranMut = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/sasaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Gagal membuat sasaran baru");
      }
      return res.json();
    },
    onSuccess: (newSasaran) => {
      queryClient.invalidateQueries({
        queryKey: ["sasarans-data-dasar"],
      });
      toast.success(`Data Dasar "${newSasaran.nama}" berhasil disimpan`);
      setIsNewSasaranModalOpen(false);
      if (pendingForm) {
        openFormWithSasaran(pendingForm, newSasaran);
      }
    },
    onError: (err: any) => toast.error(err.message || "Gagal membuat sasaran baru"),
  });

  const seedDefaultMutation = useMutation({
    mutationFn: async () => {
      const catId = targetCategory?.id;
      if (!catId) throw new Error("Kategori tidak valid");
      const res = await fetch(`/api/master/dynamic-categories/${catId}/seed-baseline`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal membuat field default");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["laporan-categories-all"] });
      queryClient.invalidateQueries({ queryKey: ["inspection-templates"] });
      if (data.created > 0) toast.success(`${data.created} field default dibuat: ${data.codes.join(", ")}`);
      else toast.info("Semua field default sudah ada");
    },
    onError: (err: any) => toast.error(err.message || "Gagal membuat field default"),
  });

  const { data: masterJenis = {} } = useQuery<any>({
    queryKey: ["master-jenis"],
    queryFn: async () => {
      const res = await fetch("/api/master/jenis");
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 60_000,
  });

  const allSubCats = useMemo(() => {
    return (targetCategory?.subCategories || []).map((sc: any) => ({
      ...sc,
      categoryNama: targetCategory?.nama ?? "",
    }));
  }, [targetCategory]);

  const baselineParams = useMemo(() => {
    return [...(targetCategory?.parameters || [])]
      .filter((p: any) => p.isBaseline)
      .sort((a: any, b: any) => (a.urutan ?? 0) - (b.urutan ?? 0));
  }, [targetCategory]);

  const syncedParams = useMemo(() => {
    return baselineParams.filter((p: any) => p.config?.syncToParamId);
  }, [baselineParams]);

  const categoryCode = useMemo(() => {
    return (targetCategory?.code || "").toLowerCase();
  }, [targetCategory]);

  useEffect(() => {
    if (isNewSasaranModalOpen && allSubCats.length > 0 && !newSasaranForm.subCategoryId) {
      setNewSasaranForm((prev) => ({
        ...prev,
        subCategoryId: allSubCats[0].id,
      }));
    }
  }, [isNewSasaranModalOpen, allSubCats, newSasaranForm.subCategoryId]);

  useEffect(() => {
    if (isNewSasaranModalOpen && userRole !== "OPERATOR" && !newSasaranForm.puskesmasId && puskesmasList.length > 0) {
      setNewSasaranForm((prev) => ({
        ...prev,
        puskesmasId: userPkmId || puskesmasList[0].id,
      }));
    }
  }, [isNewSasaranModalOpen, userRole, newSasaranForm.puskesmasId, puskesmasList, userPkmId]);

  const getParamOptions = (p: any): string[] => {
    const raw = p.config?.options;
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
    if (typeof raw === "string")
      return raw
        .split(/[\n,]/)
        .map((s: string) => s.trim())
        .filter(Boolean);
    return [];
  };

  const renderSasaranDynamicInput = (p: any) => {
    const value = dynamicValues[p.code] || "";
    const setValue = (next: string) =>
      setDynamicValues((prev) => ({
        ...prev,
        [p.code]: next,
      }));
    const baseClass =
      "w-full h-10 rounded-button border border-border bg-surface text-text-main px-3 text-[13px] font-medium focus:outline-none focus:border-primary transition-colors";

    if (p.type === "SELECT") {
      const customOptions = getParamOptions(p);
      let optionsList: string[] = [];

      if (customOptions.length > 0) {
        optionsList = customOptions;
      } else {
        const source = p.config?.optionsSource || "auto_category";
        const catClean = categoryCode || "";
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
          optionsList = allSubCats.map((sc: any) => sc.nama);
        }
      }

      return (
        <select required={!!p.required} value={value} onChange={(e) => setValue(e.target.value)} className={baseClass}>
          <option value="">Pilih...</option>
          {optionsList.map((opt: string) => (
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

  function handleCreateSasaranSubmit(e: React.FormEvent) {
    e.preventDefault();

    const resolvedSubCatId = Number(newSasaranForm.subCategoryId);
    if (!resolvedSubCatId) {
      toast.error("Jenis / Tipe Entitas wajib dipilih");
      return;
    }

    const targetPkm = userRole === "OPERATOR" ? userPkmId : Number(newSasaranForm.puskesmasId);
    if (!targetPkm) {
      toast.error("Puskesmas wajib dipilih");
      return;
    }

    // Nama/alamat/pemilik dibaca lewat resolusi key (nama parameter), bukan
    // daftar kode hardcoded: field data dasar dibuat Laporan Builder dengan kode
    // data_dasar_<timestamp> sehingga daftar kode tidak pernah cocok dan kolom
    // Sasaran selalu kosong.
    if (baselineParams.length > 0) {
      const missing = baselineParams
        .filter((p: any) => p.required && (!dynamicValues[p.code] || String(dynamicValues[p.code]).trim() === ""))
        .map((p: any) => p.nama);
      if (missing.length > 0) {
        toast.error(`Field wajib belum diisi: ${missing.join(", ")}`);
        return;
      }
    }

    const cols = sasaranColumnsFromDynamic(dynamicValues, baselineParams, newSasaranForm);
    const displayName = cols.nama || "Data Dasar";

    if (!displayName.trim()) {
      toast.error("Nama wajib diisi (minimal satu field terisi)");
      return;
    }

    createSasaranMut.mutate({
      nama: displayName.trim(),
      subCategoryId: resolvedSubCatId,
      puskesmasId: targetPkm,
      alamat: cols.alamat.trim() || null,
      pemilik: cols.pemilik.trim() || null,
      kontak: cols.kontak.trim() || null,
      lat: cols.lat,
      lng: cols.lng,
      dataDinamis: { ...dynamicValues },
    });
  }

  const handleFieldChange = useCallback((fieldId: number, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleMetaChange = useCallback((fieldId: number, value: any) => {
    setMetaValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  function openFormWithoutSasaran(template: any) {
    setEditingId(null);
    setSasaranId(null);
    setTanggalPemeriksaan(getTodayLocalDate());
    const initVal: Record<number, any> = {};
    const initMeta: Record<number, any> = {};
    const isDefaultYa = !!template.config?.defaultYa;
    const accountName = session?.user?.name || "";
    const accountPuskesmas = (session?.user as any)?.puskesmasNama || "";

    template.fields.forEach((f: any) => {
      const q = (f.pertanyaan || "").toLowerCase();
      const autoFillSource = f.config?.autoFill || f.autoFill;
      const isPemeriksa = autoFillSource === "USER_NAME" || q.includes("pemeriksa") || q.includes("petugas");
      const isWilayah =
        autoFillSource === "USER_PUSKESMAS" ||
        q.includes("wilayah") ||
        q.includes("puskesmas") ||
        q.includes("unit kerja");

      let accountDefault = "";
      if (isPemeriksa && accountName) accountDefault = accountName;
      else if (isWilayah && accountPuskesmas) accountDefault = accountPuskesmas;

      if (f.grup === "__META__") {
        initMeta[f.id] = accountDefault;
        initVal[f.id] = null;
      } else if (f.tipe === "TEXT" && accountDefault) {
        initVal[f.id] = accountDefault;
      } else if (isDefaultYa && f.tipe === "BOOLEAN") {
        initVal[f.id] = "TRUE";
      } else if (f.tipe === "MATRIX_AREA") {
        initVal[f.id] = [];
      } else {
        initVal[f.id] = null;
      }
    });
    setFormValues(initVal);
    setMetaValues(initMeta);
    setPendingForm(null);
    setActiveForm(template);
  }

  function handleOpenForm(template: any) {
    setEditingId(null);
    setSasaranId(null);
    setSasaranSearch("");
    const resolvedCat =
      categories.find(
        (c: any) =>
          c.id ===
            Number(
              template.config?.dataDasarCategoryId ||
                template.dataDasarCategory?.id ||
                template.subCategory?.categoryId ||
                template.subCategory?.category?.id,
            ) ||
          (template.subCategoryId && (c.subCategories || []).some((sc: any) => sc.id === template.subCategoryId)),
      ) ||
      template.dataDasarCategory ||
      template.subCategory?.category;

    const dataDasarCategoryId = Number(
      template.config?.dataDasarCategoryId ?? resolvedCat?.id ?? template.subCategory?.category?.id,
    );
    if (!Number.isInteger(dataDasarCategoryId) || dataDasarCategoryId <= 0) {
      openFormWithoutSasaran(template);
      return;
    }
    const defaultSubCat = template.subCategoryId || resolvedCat?.subCategories?.[0]?.id || null;

    const defaultPkm = userRole === "OPERATOR" ? userPkmId : template.puskesmasId || userPkmId || "";

    setNewSasaranForm({
      nama: "",
      subCategoryId: defaultSubCat ? Number(defaultSubCat) : null,
      puskesmasId: defaultPkm,
      alamat: "",
      pemilik: "",
      kontak: "",
      lat: null,
      lng: null,
    });
    const initialDyn: Record<string, string> = {};
    const params = (resolvedCat?.parameters || []).filter((p: any) => p.isBaseline);
    params.forEach((p: any) => {
      initialDyn[p.code] = "";
    });
    setDynamicValues(initialDyn);
    setPendingForm({
      ...template,
      dataDasarCategory: resolvedCat,
      config: { ...template.config, dataDasarCategoryId },
    });
  }

  function openFormWithSasaran(template: any, sasaran: any) {
    setEditingId(null);
    setTanggalPemeriksaan(new Date().toISOString().split("T")[0]);
    const initVal: Record<number, any> = {};
    const initMeta: Record<number, any> = {};
    const resolvedCatId = Number(
      template.config?.dataDasarCategoryId ??
        template.dataDasarCategory?.id ??
        targetCategory?.id ??
        template.subCategory?.category?.id,
    );
    const resolvedCatFromAll = categories.find((c: any) => c.id === resolvedCatId);
    const bParams =
      resolvedCatFromAll?.parameters ||
      targetCategory?.parameters ||
      template.dataDasarCategory?.parameters ||
      template.subCategory?.category?.parameters ||
      [];
    const isDefaultYa = !!template.config?.defaultYa;
    const accountName = session?.user?.name || "";
    const accountPuskesmas = (session?.user as any)?.puskesmasNama || "";

    template.fields.forEach((f: any) => {
      const q = (f.pertanyaan || "").toLowerCase();
      const autoFillSource = f.config?.autoFill || f.autoFill;
      const isPemeriksa = autoFillSource === "USER_NAME" || q.includes("pemeriksa") || q.includes("petugas");
      const isWilayah =
        autoFillSource === "USER_PUSKESMAS" ||
        q.includes("wilayah") ||
        q.includes("puskesmas") ||
        q.includes("unit kerja");

      let accountDefault = "";
      if (isPemeriksa && accountName) accountDefault = accountName;
      else if (isWilayah && accountPuskesmas) accountDefault = accountPuskesmas;

      if (f.grup === "__META__") {
        // Data dasar bisa berada di Sasaran.dataDinamis (kode parameter sebagai
        // key — tidak selalu bisa ditebak, mis. data_dasar_<timestamp>), di
        // kolom Sasaran, atau lewat parameter yang dipetakan syncToParamId.
        // Resolver mencocokkan field dengan parameter kategorinya.
        initMeta[f.id] = sasaranMetaValue(sasaran, f, bParams) || accountDefault;
        initVal[f.id] = null;
      } else if (f.tipe === "TEXT" && accountDefault) {
        initVal[f.id] = accountDefault;
      } else if (isDefaultYa && f.tipe === "BOOLEAN") {
        initVal[f.id] = "TRUE";
      } else if (f.tipe === "MATRIX_AREA") {
        initVal[f.id] = [];
      } else {
        initVal[f.id] = null;
      }
    });
    setSasaranId(sasaran.id);
    setFormValues(initVal);
    setMetaValues(initMeta);
    setPendingForm(null);
    setActiveForm(template);
  }

  async function handleEditResult(result: any) {
    let fullResult = result;
    // Lazy load detail lengkap jika values belum ada (karena list endpoint menggunakan proyeksi ringan)
    if (!result.values || result.values.length === 0) {
      try {
        const res = await fetch(`/api/inspection/results/${result.id}`);
        if (res.ok) {
          fullResult = await res.json();
        }
      } catch (err) {
        console.error("Gagal memuat detail hasil pemeriksaan:", err);
      }
    }

    const template = templates.find((t) => t.id === fullResult.templateId) || fullResult.template;
    if (!template) {
      toast.error("Template form tidak ditemukan");
      return;
    }
    setEditingId(fullResult.id);
    const rawDate = fullResult.tanggal || fullResult.createdAt;
    if (rawDate) {
      try {
        setTanggalPemeriksaan(new Date(rawDate).toISOString().split("T")[0]);
      } catch {
        setTanggalPemeriksaan(new Date().toISOString().split("T")[0]);
      }
    } else {
      setTanggalPemeriksaan(new Date().toISOString().split("T")[0]);
    }

    const initVal: Record<number, any> = {};
    const initMeta: Record<number, any> = {};
    // Hasil lama sering tidak membawa alamat/pengelola, sebagian bahkan tidak
    // terhubung ke Sasaran (sasaranId null) — pada modal keduanya tampil "-"
    // dan "Alamat belum diisi". Nilai dari Sasaran dipakai sebagai awalan agar
    // membuka hasil lama lalu menyimpannya kembali ikut melengkapi
    // identitasnya; jawaban yang sudah tersimpan tetap menang karena
    // menimpanya pada loop di bawah.
    const editCatId = Number(
      template.config?.dataDasarCategoryId ?? template.dataDasarCategory?.id ?? template.subCategory?.category?.id,
    );
    const editCatFromAll = categories.find((c: any) => c.id === editCatId);
    const editMetaParams =
      editCatFromAll?.parameters ||
      targetCategory?.parameters ||
      template.dataDasarCategory?.parameters ||
      template.subCategory?.category?.parameters ||
      [];
    template.fields.forEach((f: any) => {
      if (f.grup === "__META__") {
        initMeta[f.id] = sasaranMetaValue(fullResult.sasaran, f, editMetaParams);
      }
      initVal[f.id] = null;
    });
    fullResult.values?.forEach((v: any) => {
      const field = template.fields.find((f: any) => f.id === v.fieldId);
      if (field) {
        let val =
          v.valueJson ??
          v.valueString ??
          (v.valueNumber !== null && v.valueNumber !== undefined ? String(v.valueNumber) : null);
        if (field.tipe === "MATRIX_AREA") {
          if (Array.isArray(v.valueJson)) {
            val = v.valueJson;
          } else if (typeof v.valueString === "string" && v.valueString.trim()) {
            try {
              const p = JSON.parse(v.valueString);
              val = Array.isArray(p)
                ? p
                : v.valueString
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean);
            } catch {
              val = v.valueString
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean);
            }
          } else {
            val = [];
          }
        } else if (field.tipe === "BOOLEAN" && typeof val === "string") {
          const u = val.toUpperCase();
          if (u === "TRUE" || u === "FALSE" || u === "NA") val = u;
        }
        if (field.grup === "__META__") {
          initMeta[field.id] = v.valueString ?? "";
          initVal[field.id] = val;
        } else {
          initVal[field.id] = val;
        }
      }
    });

    // Pulihkan tanda tangan dan foto dari signatureData & fotoPaths jika belum terisi dari values
    const sigMap =
      fullResult.signatureData && typeof fullResult.signatureData === "object"
        ? (fullResult.signatureData as Record<string, string>)
        : {};
    const fotoList = Array.isArray(fullResult.fotoPaths) ? fullResult.fotoPaths : [];
    let fotoIdx = 0;
    template.fields.forEach((f: any) => {
      if (f.tipe === "SIGNATURE" && !initVal[f.id] && sigMap[f.pertanyaan]) {
        initVal[f.id] = sigMap[f.pertanyaan];
        if (f.grup === "__META__") initMeta[f.id] = sigMap[f.pertanyaan];
      }
      if (f.tipe === "PHOTO" && !initVal[f.id] && fotoIdx < fotoList.length) {
        initVal[f.id] = fotoList[fotoIdx++];
        if (f.grup === "__META__") initMeta[f.id] = initVal[f.id];
      }
    });

    setFormValues(initVal);
    setMetaValues(initMeta);
    setSasaranId(fullResult.sasaranId ?? null);
    setPendingForm(null);
    setActiveForm(template);
  }

  function handleGPS(id: number) {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung geolokasi GPS");
      return;
    }
    const tId = toast.loading("Mengambil titik koordinat GPS lokasi...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss(tId);
        const coords = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
        const field = activeForm?.fields?.find((f: any) => f.id === id);
        if (field?.grup === "__META__") {
          handleMetaChange(id, coords);
        } else {
          handleFieldChange(id, coords);
        }
        const acc = pos.coords.accuracy ? ` (akurasi ±${Math.round(pos.coords.accuracy)}m)` : "";
        toast.success(`Koordinat GPS diperoleh${acc}`);
      },
      (err) => {
        toast.dismiss(tId);
        let msg = "Gagal mengambil lokasi GPS";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Izin lokasi GPS ditolak oleh browser. Mohon aktifkan izin lokasi di pengaturan browser.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Sinyal GPS tidak tersedia. Pastikan fitur lokasi perangkat aktif.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Waktu pencarian sinyal GPS habis. Silakan coba lagi.";
        }
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  }

  async function handleExportPDF(res: any) {
    let fullRes = res;
    if (!res.values || res.values.length === 0 || res.fotoPaths === undefined) {
      try {
        const detailRes = await fetch(`/api/inspection/results/${res.id}`);
        if (detailRes.ok) {
          fullRes = await detailRes.json();
        }
      } catch (err) {
        console.error("Gagal memuat detail PDF:", err);
      }
    }

    const template = templates.find((t) => t.id === fullRes.templateId) || fullRes.template;
    try {
      toast.info("Menyiapkan dokumen PDF Berita Acara & Foto...");
      await generateInspectionPDF(fullRes, template);
      toast.success("Berita Acara & Hasil Inspeksi PDF berhasil diunduh");
    } catch (err) {
      console.error("Gagal generate PDF:", err);
      toast.error("Gagal mengunduh file PDF");
    }
  }

  function handleSubmit() {
    const signatures: Record<string, string> = {};
    const fotoPaths: string[] = [];
    let tanggalFinal = tanggalPemeriksaan || new Date().toISOString().split("T")[0];

    const valuesArray = Object.entries(formValues)
      .map(([fid, val]) => {
        const numId = Number(fid);
        const field = activeForm.fields.find((f: any) => f.id === numId);
        if (val && (field?.tipe === "SIGNATURE" || isSignatureField(field) || numId === -1)) {
          const sigName = field?.pertanyaan || "Tanda Tangan Pemeriksa";
          signatures[sigName] = String(val);
        }
        if (field?.tipe === "PHOTO" && val) {
          fotoPaths.push(String(val));
        }
        if (field?.tipe === "DATE" && val && val !== "") {
          tanggalFinal = String(val);
        }
        let valueString: string | null = null;
        let valueJson: any = null;
        let valueNumber: number | null = null;

        if (field?.tipe === "MATRIX_AREA") {
          const codes = Array.isArray(val) ? val : [];
          valueJson = codes;
          valueString = codes.join(", ");
        } else if (field?.tipe === "NUMBER") {
          valueNumber = val !== null && val !== undefined && val !== "" ? parseFloat(val) || 0 : null;
        } else {
          valueString = val !== null && val !== undefined && val !== "" ? String(val) : null;
        }

        return {
          fieldId: numId,
          valueString,
          valueNumber,
          valueJson,
        };
      })
      .filter((v) => v.fieldId > 0);

    const metaArray = Object.entries(metaValues).map(([fid, val]) => {
      const field = activeForm.fields.find((f: any) => f.id === Number(fid));
      if (val && (field?.tipe === "SIGNATURE" || isSignatureField(field))) {
        const sigName = field?.pertanyaan || "Tanda Tangan Pengesahan";
        signatures[sigName] = String(val);
      }
      if (field?.tipe === "PHOTO" && val) {
        fotoPaths.push(String(val));
      }
      if (field?.tipe === "DATE" && val && val !== "") {
        tanggalFinal = String(val);
      }
      return {
        fieldId: Number(fid),
        valueString: val !== null && val !== undefined && val !== "" ? String(val) : null,
        valueNumber: null,
      };
    });

    // Cari field meta berdasarkan prioritas kata kunci. Dicek terurut agar
    // "Nama Tempat / Usaha Jajanan" tidak tertukar dengan field Pengelola, dan
    // alamat tidak salah cocok ke "tempat" (yang justru bagian dari nama tempat).
    const findMeta = (...keys: string[]) => {
      for (const key of keys) {
        const hit = Object.entries(metaValues).find(([fid]) => {
          const f = activeForm.fields.find((x: any) => x.id === Number(fid));
          return String(f?.pertanyaan || "")
            .toLowerCase()
            .includes(key);
        });
        if (hit) return hit;
      }
      return undefined;
    };

    const namaMeta = findMeta("nama tempat", "nama sarana", "nama usaha", "nama unit", "nama") || findMeta("sarana");
    const alamatMeta = findMeta("alamat", "lokasi");

    const gpsMeta =
      Object.entries(metaValues).find(([fid, val]) => {
        const f = activeForm.fields.find((f: any) => f.id === Number(fid));
        return (
          (f?.tipe === "GPS" ||
            f?.pertanyaan?.toLowerCase().includes("gps") ||
            f?.pertanyaan?.toLowerCase().includes("koordinat")) &&
          Boolean(val)
        );
      }) ||
      Object.entries(formValues).find(([fid, val]) => {
        const f = activeForm.fields.find((f: any) => f.id === Number(fid));
        return (
          (f?.tipe === "GPS" ||
            f?.pertanyaan?.toLowerCase().includes("gps") ||
            f?.pertanyaan?.toLowerCase().includes("koordinat")) &&
          Boolean(val)
        );
      });

    let lat: number | null = null;
    let lng: number | null = null;
    if (gpsMeta?.[1] && typeof gpsMeta[1] === "string" && gpsMeta[1].includes(",")) {
      const parts = gpsMeta[1].split(",").map((p) => p.trim());
      const pLat = parseFloat(parts[0]);
      const pLng = parseFloat(parts[1]);
      if (!Number.isNaN(pLat)) lat = pLat;
      if (!Number.isNaN(pLng)) lng = pLng;
    }
    const currentSasaran = sasarans.find((s: any) => s.id === sasaranId);
    const latFinal = lat ?? (currentSasaran?.lat ? Number(currentSasaran.lat) : null);
    const lngFinal = lng ?? (currentSasaran?.lng ? Number(currentSasaran.lng) : null);

    let bulan = new Date().getMonth() + 1;
    let tahun = new Date().getFullYear();
    if (tanggalFinal) {
      const d = new Date(tanggalFinal);
      if (!Number.isNaN(d.getTime())) {
        bulan = d.getMonth() + 1;
        tahun = d.getFullYear();
      }
    }

    submitMut.mutate({
      id: editingId || undefined,
      templateId: activeForm.id,
      sasaranId: sasaranId,
      namaSasaran: namaMeta?.[1] || "Tanpa Nama",
      alamatSasaran: alamatMeta?.[1] || "",
      lat: latFinal,
      lng: lngFinal,
      bulan,
      tahun,
      tanggalPemeriksaan: tanggalFinal,
      signatureData: Object.keys(signatures).length > 0 ? signatures : null,
      fotoPaths: fotoPaths.length > 0 ? fotoPaths : null,
      values: [...valuesArray, ...metaArray],
    });
  }

  const fieldsToChecklist = useMemo(
    () => activeForm?.fields.filter((f: any) => f.grup !== "__META__") || [],
    [activeForm],
  );

  const selectedGolongan = useMemo(() => {
    if (!activeForm?.fields) return "";
    for (const f of activeForm.fields) {
      const val = String((f.grup === "__META__" ? metaValues[f.id] : formValues[f.id]) ?? "").trim();
      if (!val) continue;
      const q = (f.pertanyaan || "").toLowerCase();
      if (q.includes("golongan") || q.includes("tipe") || val.toLowerCase().includes("golongan")) {
        return val;
      }
    }
    if (sasaranId && sasarans?.length > 0) {
      const s = sasarans.find((item: any) => item.id === sasaranId);
      if (s) {
        if (s.subCategory?.nama) return s.subCategory.nama;
        if (s.dynamicValues) {
          for (const [k, v] of Object.entries(s.dynamicValues)) {
            if (k.toLowerCase().includes("golongan") || k.toLowerCase().includes("tipe")) {
              return String(v);
            }
          }
        }
      }
    }
    return "";
  }, [activeForm, metaValues, formValues, sasaranId, sasarans]);

  const liveSkor = useMemo(() => {
    if (!activeForm) return { gained: 0, max: 0, finalValue: 0, valueText: "0", pass: false, text: "" };
    const config = activeForm.config || {};
    const rumus = config.rumus || "sum";
    const op = config.thresholdOperator || ">=";
    const thresh = config.thresholdValue ?? 80;
    const passText = config.thresholdPassText || "Memenuhi Syarat";
    const failText = config.thresholdFailText || "Tidak Memenuhi Syarat";
    const penilaian = activeForm.fields.filter((f: any) => f.grup !== "__META__");
    let gained = 0;
    let max = 0;
    let countBenar = 0;
    let countSalah = 0;
    let countActive = 0;

    const hasMatrixFields = penilaian.some((f: any) => f.tipe === "MATRIX_AREA");
    let totalPenalty = 0;
    let maxPenalty = 0;

    for (const f of penilaian) {
      // 1. Lewati field yang bukan butir penilaian scoring (TTD, GPS, PHOTO)
      if (isSignatureField(f) || f.tipe === "GPS" || f.tipe === "PHOTO") continue;

      // 2. Lewati butir yang dinonaktifkan (di template / targetGolongan / dependsOn)
      const disabledInfo = isFieldDisabledInfo(f, formValues, selectedGolongan, activeForm.fields);
      if (disabledInfo.isDisabled) continue;

      const conf =
        typeof f.config === "string"
          ? (() => {
              try {
                return JSON.parse(f.config);
              } catch {
                return {};
              }
            })()
          : f.config || {};

      if (f.tipe === "MATRIX_AREA") {
        const areaScores: Record<string, number | string> = conf.areaScores || {};
        const selected = Array.isArray(formValues[f.id])
          ? formValues[f.id]
          : typeof formValues[f.id] === "string" && formValues[f.id].trim()
            ? formValues[f.id].split(",").map((s: string) => s.trim())
            : [];
        const selectedSet = new Set(selected.map(String));

        for (const [code, rawScore] of Object.entries(areaScores)) {
          if (rawScore === "NA" || rawScore === undefined) continue;
          const scoreNum = Number(rawScore) || 1;
          maxPenalty += scoreNum;
          if (selectedSet.has(code)) {
            totalPenalty += scoreNum;
          }
        }
        continue;
      }

      const val = formValues[f.id];
      const upperVal = String(val ?? "").toUpperCase();

      // 3. Abaikan opsi T/A (Tidak Ada / NA) dari gained dan total (max)
      if (upperVal === "NA") continue;

      const skorBenar = Number(conf.skorBenar ?? conf.skor ?? (f.tipe === "BOOLEAN" ? 1 : 0));
      const skorSalah = Number(conf.skorSalah ?? 0);
      const itemMax = Math.max(skorBenar, skorSalah);

      // Hanya masukkan ke total (max) jika butir ini aktif dan memiliki skor
      if (itemMax <= 0 && f.tipe !== "BOOLEAN") continue;

      countActive++;
      max += itemMax > 0 ? itemMax : 1;

      if (f.tipe === "BOOLEAN") {
        if (upperVal === "TRUE") {
          gained += skorBenar > 0 ? skorBenar : 1;
          countBenar++;
        } else if (upperVal === "FALSE") {
          gained += skorSalah;
          countSalah++;
        }
      } else if (f.tipe === "NUMBER") {
        const numVal = parseFloat(val) || 0;
        const multiplier = conf.skor ? Number(conf.skor) : 1;
        gained += numVal * multiplier;
      } else if (val) {
        gained += skorBenar;
      }
    }

    if (hasMatrixFields) {
      const penaltyPercent = maxPenalty > 0 ? (totalPenalty / maxPenalty) * 100 : 0;
      const finalScore = Math.max(0, Math.round((100 - penaltyPercent) * 10) / 10);
      const pass = finalScore >= thresh;
      return {
        gained: maxPenalty - totalPenalty,
        max: maxPenalty,
        penalty: totalPenalty,
        finalValue: finalScore,
        percentValue: finalScore,
        valueText: `${finalScore}%`,
        pass,
        text: pass ? passText : failText,
      };
    }
    const percentValue = max > 0 ? (gained / max) * 100 : 0;
    const roundedPercent = Math.round(percentValue * 10) / 10;
    let finalValue = percentValue;
    let valueText = `${roundedPercent}%`;

    if (rumus === "percentage" || rumus === "weighted") {
      finalValue = percentValue;
      valueText = `${roundedPercent}%`;
    } else if (rumus === "sum") {
      finalValue = gained;
      valueText = `${roundedPercent}%`;
    } else if (rumus === "custom" && config.customFormula) {
      try {
        const evalStr = config.customFormula
          .replace(/SUM\(\)/g, String(gained))
          .replace(/AVG\(\)/g, String(countActive > 0 ? gained / countActive : 0))
          .replace(/COUNT\(\)/g, String(countActive))
          .replace(/\u2713/g, String(countBenar))
          .replace(/\u2717/g, String(countSalah));
        const res = new Function(`return ${evalStr}`)();
        if (!Number.isNaN(res)) {
          finalValue = res;
          valueText = `${Math.round(finalValue * 10) / 10}%`;
        }
      } catch {}
    }

    let pass = false;
    const compareValue =
      rumus === "percentage" || rumus === "weighted" || thresh <= 100
        ? rumus === "sum" && thresh > 100
          ? finalValue
          : percentValue
        : finalValue;

    if (op === ">=") pass = compareValue >= thresh;
    else if (op === ">") pass = compareValue > thresh;
    else if (op === "<=") pass = compareValue <= thresh;
    else if (op === "<") pass = compareValue < thresh;

    return {
      gained: Math.round(gained * 10) / 10,
      max: Math.round(max * 10) / 10,
      finalValue,
      percentValue: roundedPercent,
      valueText,
      pass,
      text: pass ? passText : failText,
    };
  }, [activeForm, formValues, selectedGolongan]);

  const canSubmit =
    Boolean(activeForm) &&
    fieldsToChecklist
      .filter((f: any) => {
        if (f.isRequired === false) return false;
        const disabledInfo = isFieldDisabledInfo(f, formValues, selectedGolongan, activeForm.fields);
        if (disabledInfo.isDisabled) return false;
        return true;
      })
      .every((f: any) => {
        const val = formValues[f.id];
        if (f.tipe === "MATRIX_AREA") {
          return Array.isArray(val) || (typeof val === "string" && val.length > 0) || val !== null;
        }
        return val !== null && val !== undefined && val !== "";
      }) &&
    (activeForm?.fields || [])
      .filter((f: any) => {
        if (f.grup !== "__META__" || !f.isRequired) return false;
        const disabledInfo = isFieldDisabledInfo(f, metaValues, selectedGolongan, activeForm.fields);
        return !disabledInfo.isDisabled;
      })
      .every((f: any) => {
        const val = metaValues[f.id];
        return val !== null && val !== undefined && String(val).trim() !== "";
      });

  if ((session?.user as any)?.role === "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-3">
        <ShieldAlert className="w-8 h-8 text-muted-foreground" />
        <p className="text-[13px] font-bold text-foreground">Akses Ditolak</p>
        <p className="text-[11px] text-muted-foreground">Halaman ini hanya untuk Operator / Puskesmas</p>
      </div>
    );
  }

  const filteredSasarans = sasarans.filter((sasaran: any) => {
    const term = sasaranSearch.trim().toLowerCase();
    const matchTerm =
      !term ||
      [sasaran.nama, sasaran.alamat, sasaran.pemilik, sasaran.subCategory?.nama].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      );
    const matchCategory =
      sasaranCategoryFilter === "all" || (sasaran.subCategory?.nama || "Lainnya") === sasaranCategoryFilter;
    return matchTerm && matchCategory;
  });

  if (pendingForm) {
    return (
      <div className="w-full fade-in min-h-screen bg-canvas">
        {/* ── SEAMLESS MASTHEAD (FLUSH LANGSUNG KE NAVBAR) ── */}
        <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
          <div className="w-full max-w-[1600px] mx-auto space-y-4">
            {/* Top Navigation Row: Breadcrumbs */}
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
              <span>Inspeksi</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              <span className="font-bold text-foreground truncate max-w-[280px]">{pendingForm.nama}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-primary font-bold">Pilih Sasaran</span>
            </div>

            {/* Title & Category Info */}
            <div className="space-y-1.5 pt-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary-subtle border border-primary/25 text-[10px] font-black uppercase tracking-wider text-primary">
                <Sparkles className="w-3 h-3 text-primary" />
                {pendingForm.dataDasarCategory?.nama || pendingForm.nama}
              </div>
              <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight leading-tight text-foreground">
                Pilih Sasaran Pemeriksaan
              </h1>
              <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground leading-relaxed max-w-3xl">
                Pilih sasaran yang akan diinspeksi. Data profil (alamat, pengelola, kontak, koordinat) otomatis terisi
                ke form penilaian.
              </p>

              {/* Action Buttons di bawah Pilih Sasaran */}
              <div className="flex flex-wrap items-center gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setPendingForm(null)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-foreground text-[12px] font-bold shadow-xs transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Formulir</span>
                </button>
                <button
                  type="button"
                  onClick={() => openFormWithoutSasaran(pendingForm)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-foreground text-[12px] font-bold transition-all shadow-xs cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Lewati (Tanpa Sasaran)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewSasaranModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-[12px] font-extrabold shadow-subtle transition-all cursor-pointer sm:ml-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Sasaran Baru</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── CONTENT BODY (CANVAS) ── */}
        <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
          {/* Subcategory Filter Tabs & Search Bar */}
          <div className="space-y-3">
            {/* Filter Pills */}
            {sasaranSubCategories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSasaranCategoryFilter("all")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                    sasaranCategoryFilter === "all"
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-surface-subtle"
                  }`}
                >
                  Semua Sasaran
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums font-extrabold ${
                      sasaranCategoryFilter === "all" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {sasarans.length}
                  </span>
                </button>
                {sasaranSubCategories.map((sc) => (
                  <button
                    key={sc.nama}
                    type="button"
                    onClick={() => setSasaranCategoryFilter(sc.nama)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                      sasaranCategoryFilter === sc.nama
                        ? "bg-primary text-white shadow-xs"
                        : "bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-surface-subtle"
                    }`}
                  >
                    {sc.nama}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums font-extrabold ${
                        sasaranCategoryFilter === sc.nama ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {sc.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Search Input Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={sasaranSearch}
                  onChange={(e) => setSasaranSearch(e.target.value)}
                  placeholder="Cari nama sasaran, alamat, atau pemilik..."
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-surface text-[12px] font-medium text-foreground outline-none focus:border-primary shadow-xs transition-colors"
                />
                {sasaranSearch && (
                  <button
                    type="button"
                    onClick={() => setSasaranSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface border border-border text-[11px] font-bold text-muted-foreground shrink-0 self-end sm:self-center shadow-xs">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>
                  <strong className="text-foreground font-black tabular-nums">{filteredSasarans.length}</strong> sasaran
                  tersedia
                </span>
              </div>
            </div>
          </div>

          {/* Sasaran Cards Grid */}
          {filteredSasarans.length === 0 ? (
            <div className="border border-dashed border-border bg-surface rounded-card p-10 sm:p-14 text-center flex flex-col items-center justify-center shadow-subtle">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3.5">
                <Database className="w-7 h-7" />
              </div>
              <h3 className="text-[15px] font-extrabold text-foreground">Data Dasar Tidak Ditemukan</h3>
              <p className="text-[12px] text-muted-foreground max-w-sm mt-1">
                {sasaranSearch
                  ? `Tidak ada sasaran yang cocok dengan kata kunci "${sasaranSearch}".`
                  : "Belum ada data sasaran pada kategori ini. Anda dapat menambahkannya sekarang atau melanjutkan tanpa sasaran."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setIsNewSasaranModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-[12px] font-bold transition-all shadow-subtle cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Sasaran Baru
                </button>
                <button
                  type="button"
                  onClick={() => openFormWithoutSasaran(pendingForm)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface text-[12px] font-bold hover:bg-surface-subtle transition-colors shadow-subtle cursor-pointer"
                >
                  Lanjut Tanpa Sasaran
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSasarans.map((sasaran: any) => {
                const subCatNama = sasaran.subCategory?.nama;
                const iconInfo = getSasaranIcon(subCatNama, sasaran.nama);
                const IconComponent = iconInfo.icon;
                return (
                  <div
                    key={sasaran.id}
                    onClick={() => openFormWithSasaran(pendingForm, sasaran)}
                    className="group relative flex flex-col justify-between rounded-card border border-border bg-surface hover:border-primary hover:shadow-subtle hover:-translate-y-0.5 transition-all duration-200 p-5 text-left cursor-pointer active:scale-[0.99] shadow-xs"
                  >
                    <div className="space-y-3.5">
                      {/* Top Row: Icon + SubCategory Tag */}
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`w-11 h-11 rounded-xl ${iconInfo.bg} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        {subCatNama && (
                          <span className="shrink-0 px-2.5 py-1 rounded-full bg-surface-subtle border border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            {subCatNama}
                          </span>
                        )}
                      </div>

                      {/* Title & Address */}
                      <div className="space-y-1">
                        <h3 className="text-[15px] font-black tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {sasaran.nama}
                        </h3>
                        {sasaran.alamat ? (
                          <p className="text-[12px] text-muted-foreground flex items-start gap-1.5 line-clamp-2">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                            <span>{sasaran.alamat}</span>
                          </p>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-semibold">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>Alamat belum dilengkapi</span>
                          </div>
                        )}
                      </div>

                      {/* Balanced Metadata Box */}
                      <div className="p-3 rounded-xl bg-surface-subtle/70 border border-border/70 space-y-2 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2 truncate">
                          <UserCheck className="w-3.5 h-3.5 shrink-0 text-primary" />
                          <span className="truncate">
                            Pengelola:{" "}
                            <strong className="text-foreground font-semibold">
                              {sasaran.pemilik || "Belum tercatat"}
                            </strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <Phone className="w-3.5 h-3.5 shrink-0 text-primary" />
                          <span className="truncate font-medium">{sasaran.kontak || "Kontak belum tercatat"}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <Compass className="w-3.5 h-3.5 shrink-0 text-primary" />
                          {sasaran.lat && sasaran.lng ? (
                            <span className="font-mono text-[10px] text-primary font-bold">
                              {Number(sasaran.lat).toFixed(4)}, {Number(sasaran.lng).toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/80 font-medium">
                              Koordinat GPS belum tercatat
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 pt-3.5 border-t border-border flex items-center justify-between">
                      <span className="text-[12px] font-extrabold text-primary group-hover:text-primary-hover flex items-center gap-1.5">
                        Pilih & Mulai Inspeksi
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-primary-subtle text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── MODAL: TAMBAH DATA DASAR (FORMAT SESUAI DATA-DASAR) ── */}
        {isNewSasaranModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 fade-in">
            <div className="w-full max-w-3xl h-[86vh] flex flex-col rounded-card bg-surface border border-border shadow-float overflow-hidden">
              {/* Header */}
              <div className="shrink-0 px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
                <div>
                  <h2 className="text-[15px] font-extrabold text-foreground">Tambah Data Dasar</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    <span className="tabular-nums font-semibold">{baselineParams.length}</span> field dari builder ·{" "}
                    <span className="tabular-nums font-semibold">{syncedParams.length}</span> tersinkron
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewSasaranModalOpen(false)}
                  className="p-2 text-muted-foreground hover:bg-surface-subtle rounded-button transition-colors"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto p-6 bg-canvas">
                <form
                  id="new-sasaran-form"
                  onSubmit={handleCreateSasaranSubmit}
                  className="max-w-2xl mx-auto space-y-4"
                >
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
                          className="inline-flex h-10 px-5 items-center rounded-button bg-primary hover:bg-primary-hover text-white text-[12px] font-extrabold shadow-subtle transition disabled:opacity-50"
                        >
                          {seedDefaultMutation.isPending ? "Membuat..." : "Buat Field Default"}
                        </button>
                        <Link
                          href="/laporan-builder"
                          className="inline-flex h-10 px-5 items-center rounded-button bg-primary text-white text-[12px] font-extrabold hover:bg-primary-hover shadow-subtle transition"
                        >
                          Buka Builder
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Jenis entitas */}
                      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 items-center px-4 py-3 rounded-card bg-surface border border-border shadow-subtle">
                        <div>
                          <label className="block text-[11px] font-bold text-foreground">Jenis / Tipe Entitas *</label>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Skema form & kategori</p>
                        </div>
                        <select
                          value={newSasaranForm.subCategoryId || ""}
                          onChange={(e) =>
                            setNewSasaranForm((prev) => ({ ...prev, subCategoryId: Number(e.target.value) }))
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
                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 items-center px-4 py-3 rounded-card bg-surface border border-border shadow-subtle">
                          <div>
                            <label className="block text-[11px] font-bold text-foreground">Puskesmas Pemilik *</label>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Entitas milik PKM mana</p>
                          </div>
                          <select
                            value={newSasaranForm.puskesmasId || ""}
                            onChange={(e) =>
                              setNewSasaranForm((prev) => ({ ...prev, puskesmasId: Number(e.target.value) }))
                            }
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

                      {baselineParams.map((p: any) => (
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
                          <div>{renderSasaranDynamicInput(p)}</div>
                        </div>
                      ))}
                    </>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-border px-6 py-4 flex items-center justify-between bg-surface">
                <span className="text-[11px] text-muted-foreground">
                  Lengkapi data wajib (*) · Sasaran otomatis dipilih setelah disimpan.
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewSasaranModalOpen(false)}
                    className="h-10 px-4 text-[12px] font-bold text-muted-foreground hover:bg-surface-subtle rounded-button transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    form="new-sasaran-form"
                    disabled={createSasaranMut.isPending || baselineParams.length === 0}
                    className="h-10 px-6 rounded-button bg-primary hover:bg-primary-hover text-white text-[12px] font-extrabold shadow-subtle transition disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {createSasaranMut.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      "Simpan & Buka Formulir"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!activeForm) {
    return (
      <div className="w-full fade-in min-h-screen bg-canvas">
        {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
        <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
          <div className="w-full max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary mb-1.5 sm:mb-2">
                Pemeriksaan
              </p>
              <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-none text-foreground">
                Inspeksi Lapangan
              </h1>
              <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-2">
                <span className="tabular-nums font-bold text-foreground">{templates.length}</span> formulir ·{" "}
                <span className="tabular-nums font-bold text-foreground">{totalRiwayat}</span> riwayat pemeriksaan
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-muted/80 border border-border p-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("formulir");
                  setFormulirPage(1);
                }}
                className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2 text-[12px] font-bold rounded-full transition-all text-center cursor-pointer ${
                  activeTab === "formulir"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Formulir ({templates.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("riwayat");
                  setRiwayatPage(1);
                }}
                className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2 text-[12px] font-bold rounded-full transition-all text-center cursor-pointer ${
                  activeTab === "riwayat"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Riwayat ({totalRiwayat})
              </button>
            </div>
          </div>
        </div>

        {/* ── CONTENT BODY (CANVAS) ── */}
        <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
          {/* ── STAT SUMMARY PILLS BAR (Identik Data Dasar) ── */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-card bg-primary/10 border border-primary/20">
              <span className="text-[18px] font-black tabular-nums text-primary leading-none">{templates.length}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary/70 mt-1">
                Formulir
              </span>
            </span>
            <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-card bg-amber-500/10 border border-amber-500/20">
              <span className="text-[18px] font-black tabular-nums text-amber-600 leading-none">{totalRiwayat}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-amber-600/70 mt-1">
                Riwayat
              </span>
            </span>
            <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-card bg-primary/10 border border-primary/20">
              <span className="text-[18px] font-black tabular-nums text-primary leading-none">{totalVariabel}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary/70 mt-1">
                Variabel
              </span>
            </span>
            <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-card bg-surface border border-border shadow-subtle">
              <span className="text-[18px] font-black tabular-nums text-foreground leading-none">
                {categories.length}
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground mt-1">
                Kategori
              </span>
            </span>
          </div>

          {/* ── TAB FORMULIR ── */}
          {activeTab === "formulir" && (
            <div className="pt-6 space-y-4">
              <FilterBar
                searchValue={formulirSearch}
                onSearchChange={(v) => {
                  setFormulirSearch(v);
                  setFormulirPage(1);
                }}
                placeholder="Cari nama formulir atau jenis..."
                activeFilters={[
                  ...(formulirCategory !== "all"
                    ? [
                        {
                          key: "cat",
                          label: `Kategori: ${formulirCategory}`,
                          onRemove: () => {
                            setFormulirCategory("all");
                            setFormulirPage(1);
                          },
                        },
                      ]
                    : []),
                  ...(formulirOwner !== "all"
                    ? [
                        {
                          key: "owner",
                          label: `Pemilik: ${TEMPLATE_OWNER_LABEL[formulirOwner]}`,
                          onRemove: () => {
                            setFormulirOwner("all");
                            setFormulirPage(1);
                          },
                        },
                      ]
                    : []),
                ]}
                onReset={() => {
                  setFormulirSearch("");
                  setFormulirCategory("all");
                  setFormulirOwner("all");
                  setFormulirPage(1);
                }}
              >
                <Select
                  value={formulirCategory}
                  onChange={(e) => {
                    setFormulirCategory(e.target.value);
                    setFormulirPage(1);
                  }}
                  aria-label="Saring menurut kategori"
                  className="h-10 w-auto max-w-[200px] shrink-0 text-[12px] font-medium"
                >
                  <option value="all">Semua Kategori</option>
                  {formulirCategoryOptions.map((nama) => (
                    <option key={nama} value={nama}>
                      {nama}
                    </option>
                  ))}
                </Select>
                <Select
                  value={formulirOwner}
                  onChange={(e) => {
                    setFormulirOwner(e.target.value);
                    setFormulirPage(1);
                  }}
                  aria-label="Saring menurut pemilik formulir"
                  className="h-10 w-auto max-w-[200px] shrink-0 text-[12px] font-medium"
                >
                  {Object.entries(TEMPLATE_OWNER_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FilterBar>

              {filteredTemplates.length === 0 ? (
                <div className="border border-dashed border-border bg-surface rounded-card p-10 flex flex-col items-center justify-center text-center shadow-subtle">
                  <FileText className="w-8 h-8 text-muted-foreground/40 mb-3" />
                  <p className="text-[13px] font-bold text-foreground">
                    {formulirSearch || formulirCategory !== "all" || formulirOwner !== "all"
                      ? "Formulir Tidak Ditemukan"
                      : "Belum Ada Template"}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    {formulirSearch || formulirCategory !== "all" || formulirOwner !== "all"
                      ? "Coba ubah kata kunci atau filter."
                      : "Import template lewat halaman Form Pemeriksaan."}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {paginatedTemplates.map((tpl: any) => {
                    const fieldCount = tpl.fields?.filter((f: any) => f.grup !== "__META__").length || 0;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleOpenForm(tpl)}
                        className="group flex items-stretch rounded-card border border-border bg-surface hover:border-primary/40 hover:shadow-subtle transition-all overflow-hidden cursor-pointer shadow-subtle"
                      >
                        <div className="w-1 shrink-0 bg-primary" />
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-primary group-hover:text-white transition-all">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-[13px] sm:text-[14px] font-extrabold text-foreground truncate group-hover:text-primary transition-colors">
                                  {tpl.nama}
                                </h4>
                                {!tpl.puskesmasId ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 shrink-0">
                                    🏛️ Dinkes
                                  </span>
                                ) : tpl.puskesmas?.nama || tpl.config?.authorPuskesmas ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 shrink-0">
                                    🏥 {tpl.puskesmas?.nama || tpl.config?.authorPuskesmas}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 truncate">
                                {tpl.subCategory?.nama ? `${tpl.subCategory.nama} · ` : ""}
                                {tpl.deskripsi || "Formulir inspeksi standar sanitasi lingkungan"}
                                {tpl.config?.authorName ? ` (oleh: ${tpl.config.authorName})` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                            <div className="text-left sm:text-center">
                              <div className="text-[15px] font-black tabular-nums text-primary leading-none">
                                {fieldCount}
                              </div>
                              <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mt-0.5">
                                Variabel
                              </div>
                            </div>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-primary text-white text-[11px] font-bold group-hover:bg-primary-hover transition-all shadow-subtle"
                            >
                              <span>Mulai</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls Formulir */}
              <Pagination
                page={formulirPage}
                totalPages={totalFormulirPages}
                total={filteredTemplates.length}
                limit={formulirLimit}
                onPageChange={(p) => {
                  setFormulirPage(p);
                }}
                onLimitChange={(l) => {
                  setFormulirLimit(l);
                  setFormulirPage(1);
                }}
                noun="formulir"
                className="border-t-0"
              />
            </div>
          )}

          {/* ── TAB RIWAYAT ── */}
          {activeTab === "riwayat" && (
            <div className="pt-6 space-y-4">
              <FilterBar
                searchValue={riwayatSearch}
                onSearchChange={(v) => {
                  setRiwayatSearch(v);
                  setRiwayatPage(1);
                }}
                placeholder="Cari nama sasaran, puskesmas, formulir..."
                isFetching={isLoadingRiwayat}
                activeFilters={[
                  ...(riwayatStatus !== "all"
                    ? [
                        {
                          key: "status",
                          label: `Status: ${riwayatStatus}`,
                          onRemove: () => {
                            setRiwayatStatus("all");
                            setRiwayatPage(1);
                          },
                        },
                      ]
                    : []),
                  ...(riwayatTemplateId !== "all"
                    ? [
                        {
                          key: "tpl",
                          label: `Formulir: ${templates.find((t: any) => String(t.id) === riwayatTemplateId)?.nama || riwayatTemplateId}`,
                          onRemove: () => {
                            setRiwayatTemplateId("all");
                            setRiwayatPage(1);
                          },
                        },
                      ]
                    : []),
                  ...(riwayatUserId !== "all"
                    ? [
                        {
                          key: "usr",
                          label: `Petugas: ${riwayatUserId}`,
                          onRemove: () => {
                            setRiwayatUserId("all");
                            setRiwayatPage(1);
                          },
                        },
                      ]
                    : []),
                  ...(riwayatDateFrom || riwayatDateTo
                    ? [
                        {
                          key: "date",
                          label: `${riwayatDateFrom || "…"} – ${riwayatDateTo || "…"}`,
                          onRemove: () => {
                            setRiwayatDateFrom("");
                            setRiwayatDateTo("");
                            setRiwayatPage(1);
                          },
                        },
                      ]
                    : []),
                ]}
                onReset={() => {
                  setRiwayatSearch("");
                  setRiwayatDateFrom("");
                  setRiwayatDateTo("");
                  setRiwayatStatus("all");
                  setRiwayatTemplateId("all");
                  setRiwayatUserId("all");
                  setRiwayatPage(1);
                }}
              >
                <DateRangeInputs
                  from={riwayatDateFrom}
                  to={riwayatDateTo}
                  onChange={(f, t) => {
                    setRiwayatDateFrom(f);
                    setRiwayatDateTo(t);
                    setRiwayatPage(1);
                  }}
                />
                <Select
                  value={riwayatStatus}
                  onChange={(e) => {
                    setRiwayatStatus(e.target.value);
                    setRiwayatPage(1);
                  }}
                  aria-label="Filter status pemeriksaan"
                  className="h-10 w-auto max-w-[160px] shrink-0 text-[12px] font-medium"
                >
                  <option value="all">Semua Status</option>
                  <option value="APPROVED">Disetujui</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING">Menunggu</option>
                </Select>
                {userRole !== "OPERATOR" && (
                  <Select
                    value={riwayatTemplateId}
                    onChange={(e) => {
                      setRiwayatTemplateId(e.target.value);
                      setRiwayatPage(1);
                    }}
                    aria-label="Filter formulir"
                    className="h-10 w-auto max-w-[200px] shrink-0 text-[12px] font-medium"
                  >
                    <option value="all">Semua Formulir</option>
                    {templates.map((t: any) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.nama}
                      </option>
                    ))}
                  </Select>
                )}
              </FilterBar>

              {isLoadingRiwayat ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                  <p className="text-[12px] font-medium text-muted-foreground">Memuat data riwayat...</p>
                </div>
              ) : paginatedResults.length === 0 ? (
                <div className="border border-dashed border-border bg-surface rounded-card p-10 flex flex-col items-center justify-center text-center shadow-subtle">
                  <ShieldAlert className="w-8 h-8 text-muted-foreground/40 mb-3" />
                  <p className="text-[13px] font-bold text-foreground">
                    {riwayatSearch ||
                    riwayatStatus !== "all" ||
                    riwayatTemplateId !== "all" ||
                    riwayatDateFrom ||
                    riwayatDateTo
                      ? "Data Tidak Ditemukan"
                      : "Belum Ada Riwayat"}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    {riwayatSearch ||
                    riwayatStatus !== "all" ||
                    riwayatTemplateId !== "all" ||
                    riwayatDateFrom ||
                    riwayatDateTo
                      ? "Coba ubah kata kunci atau filter."
                      : "Hasil pemeriksaan akan tampil di sini."}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {paginatedResults.map((res: any) => {
                    const isApproved = res.status === "APPROVED";
                    return (
                      <div
                        key={res.id}
                        className="group flex items-stretch rounded-card border border-border bg-surface hover:border-primary/40 hover:shadow-subtle transition-all overflow-hidden shadow-subtle"
                      >
                        <div className={`w-1 shrink-0 ${isApproved ? "bg-success" : "bg-warning"}`} />
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4">
                          <Link
                            href={`/pemeriksaan/${res.id}`}
                            className="flex items-center gap-3.5 min-w-0 group/title rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                            title="Buka halaman detail lengkap hasil pemeriksaan"
                          >
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover/title:bg-primary group-hover/title:text-white transition-all">
                              <FileCheck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-[13px] sm:text-[14px] font-extrabold text-foreground group-hover/title:text-primary transition-colors truncate">
                                  {res.sasaran?.nama || res.namaSasaran || "Tanpa Nama"}
                                </h4>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider shrink-0 ${
                                    isApproved
                                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                      : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  }`}
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  {isApproved ? "Disetujui" : res.status || "Selesai"}
                                </span>
                              </div>
                              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 truncate">
                                {res.template?.nama} · {res.puskesmas?.nama} ·{" "}
                                {new Date(res.createdAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </Link>

                          <div className="grid grid-cols-4 sm:flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                            <Link
                              href={`/pemeriksaan/${res.id}`}
                              title="Lihat Detail Pemeriksaan"
                              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[11px] font-bold text-foreground bg-primary/10 hover:bg-primary/20 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-primary" /> <span>Detail</span>
                            </Link>
                            <button
                              title="Export PDF"
                              onClick={() => handleExportPDF(res)}
                              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[11px] font-bold text-primary bg-primary/5 hover:bg-primary/15 rounded-lg transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" /> <span>PDF</span>
                            </button>
                            <button
                              title="Edit Pemeriksaan"
                              onClick={() => handleEditResult(res)}
                              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[11px] font-bold text-foreground hover:bg-surface-subtle rounded-lg transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-muted-foreground" /> <span>Edit</span>
                            </button>
                            <button
                              title="Hapus"
                              onClick={() => {
                                if (window.confirm("Yakin ingin menghapus hasil pemeriksaan ini?")) {
                                  deleteMut.mutate(res.id);
                                }
                              }}
                              className="inline-flex items-center justify-center h-8 w-8 text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls Riwayat */}
              <Pagination
                page={riwayatPage}
                totalPages={totalRiwayatPages}
                total={totalRiwayat}
                limit={riwayatLimit}
                onPageChange={(p) => {
                  setRiwayatPage(p);
                }}
                onLimitChange={(l) => {
                  setRiwayatLimit(l);
                  setRiwayatPage(1);
                }}
                isFetching={isLoadingRiwayat}
                noun="riwayat"
                className="border-t-0"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <FormView
        activeForm={activeForm}
        editingId={editingId}
        formValues={formValues}
        metaValues={metaValues}
        liveSkor={liveSkor}
        canSubmit={canSubmit}
        isPending={submitMut.isPending}
        tanggalPemeriksaan={tanggalPemeriksaan}
        onBack={() => setActiveForm(null)}
        onFieldChange={handleFieldChange}
        onMetaChange={handleMetaChange}
        onGPS={handleGPS}
        onTanggalChange={setTanggalPemeriksaan}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
