"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Database,
  Download,
  Edit3,
  FileText,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePuskesmasList } from "@/hooks/use-puskesmas-list";
import { FormView, isFieldDisabledInfo } from "./FormView";

export default function PemeriksaanPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const userPkmId = (session?.user as any)?.puskesmasId;
  const { data: puskesmasList = [] } = usePuskesmasList();
  const queryClient = useQueryClient();
  const [activeForm, setActiveForm] = useState<any>(null);
  const [pendingForm, setPendingForm] = useState<any>(null);
  const [sasaranSearch, setSasaranSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<Record<number, any>>({});
  const [metaValues, setMetaValues] = useState<Record<number, any>>({});
  const [tanggalPemeriksaan, setTanggalPemeriksaan] = useState<string>(new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState<"formulir" | "riwayat">("formulir");
  const [sasaranId, setSasaranId] = useState<number | null>(null);

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

  const { data: results = [] } = useQuery<any[]>({
    queryKey: ["inspection-results"],
    queryFn: () => fetch("/api/inspection/results").then((r) => r.json()),
  });

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
      "w-full h-10 bg-white border border-[hsl(var(--border))] rounded-lg px-3 text-[13px] font-medium focus:ring-0 focus:outline-none focus:border-[#00A876] transition-colors";

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

    const getMappedEntityValue = (field: string, fallback = "") => {
      const mappedParam = baselineParams.find((p: any) => p.config?.syncToEntityField === field);
      if (!mappedParam) return fallback;
      const value = dynamicValues[mappedParam.code];
      return value !== undefined && value !== null && String(value).trim() !== "" ? String(value).trim() : fallback;
    };

    const getCoreValue = (field: string, legacyKeys: string[], fallback = "") => {
      const mapped = getMappedEntityValue(field, "");
      if (mapped) return mapped;
      for (const key of legacyKeys) {
        const value = dynamicValues[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
      }
      return fallback;
    };

    if (baselineParams.length > 0) {
      const missing = baselineParams
        .filter((p: any) => p.required && (!dynamicValues[p.code] || String(dynamicValues[p.code]).trim() === ""))
        .map((p: any) => p.nama);
      if (missing.length > 0) {
        toast.error(`Field wajib belum diisi: ${missing.join(", ")}`);
        return;
      }
    }

    const dynamicName = getCoreValue("nama", ["nama", "nama_sarana", "nama_tempat", "nama_usaha", "nama_sasaran"]);
    const firstDynamicValue = Object.values(dynamicValues || {}).find(
      (v) => v !== undefined && v !== null && String(v).trim() !== "",
    );
    const displayName =
      (baselineParams.length > 0 ? dynamicName || String(firstDynamicValue || "") : newSasaranForm.nama) ||
      "Data Dasar";

    if (!displayName.trim()) {
      toast.error("Nama wajib diisi (minimal satu field terisi)");
      return;
    }

    const dynamicAlamat = getCoreValue("alamat", ["alamat", "alamat_lengkap"], newSasaranForm.alamat || "");
    const dynamicPemilik = getCoreValue(
      "pemilik",
      ["pemilik", "pengelola", "nama_pemilik"],
      newSasaranForm.pemilik || "",
    );
    const dynamicKontak = getCoreValue("kontak", ["kontak", "telepon", "no_hp", "hp"], newSasaranForm.kontak || "");
    const dynamicLatStr = getCoreValue(
      "lat",
      ["lat", "latitude"],
      newSasaranForm.lat ? String(newSasaranForm.lat) : "",
    );
    const dynamicLngStr = getCoreValue(
      "lng",
      ["lng", "longitude"],
      newSasaranForm.lng ? String(newSasaranForm.lng) : "",
    );

    const lat = dynamicLatStr ? parseFloat(dynamicLatStr) : newSasaranForm.lat;
    const lng = dynamicLngStr ? parseFloat(dynamicLngStr) : newSasaranForm.lng;

    createSasaranMut.mutate({
      nama: displayName.trim(),
      subCategoryId: resolvedSubCatId,
      puskesmasId: targetPkm,
      alamat: dynamicAlamat.trim() || null,
      pemilik: dynamicPemilik.trim() || null,
      kontak: dynamicKontak.trim() || null,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
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
    setTanggalPemeriksaan(new Date().toISOString().split("T")[0]);
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
    const dynamicSource = (sasaran?.dataDinamis || {}) as Record<string, unknown>;
    const bParams =
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
        const configuredCode = f.config?.dataDasarCode || f.config?.parameterCode;
        const configuredEntityField = f.config?.syncToEntityField;
        const parameter = bParams.find(
          (p: any) => p.code === configuredCode || p.config?.syncToEntityField === configuredEntityField,
        );
        const fromDynamic = parameter?.code ? dynamicSource[parameter.code] : "";

        let fallbackSasaran = "";
        if (
          q.includes("nama") &&
          (q.includes("sarana") || q.includes("tempat") || q.includes("usaha") || !q.includes("pemeriksa"))
        ) {
          fallbackSasaran = sasaran.nama || "";
        } else if (q.includes("alamat") || q.includes("lokasi")) {
          fallbackSasaran = sasaran.alamat || "";
        } else if (q.includes("pemilik") || q.includes("pengelola") || q.includes("penanggung")) {
          fallbackSasaran = sasaran.pemilik || "";
        } else if (q.includes("kontak") || q.includes("telp") || q.includes("telepon") || q.includes("hp")) {
          fallbackSasaran = sasaran.kontak || "";
        } else if ((f.tipe === "GPS" || q.includes("gps") || q.includes("koordinat")) && sasaran.lat && sasaran.lng) {
          fallbackSasaran = `${sasaran.lat},${sasaran.lng}`;
        }

        initMeta[f.id] = (fromDynamic || fallbackSasaran || accountDefault) ?? "";
        initVal[f.id] = null;
      } else if (f.tipe === "TEXT" && accountDefault) {
        initVal[f.id] = accountDefault;
      } else if (isDefaultYa && f.tipe === "BOOLEAN") {
        initVal[f.id] = "TRUE";
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

  function handleEditResult(result: any) {
    const template = templates.find((t) => t.id === result.templateId) || result.template;
    if (!template) {
      toast.error("Template form tidak ditemukan");
      return;
    }
    setEditingId(result.id);
    const rawDate = result.tanggal || result.createdAt;
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
    template.fields.forEach((f: any) => {
      if (f.grup === "__META__") {
        initMeta[f.id] = "";
      }
      initVal[f.id] = null;
    });
    result.values?.forEach((v: any) => {
      const field = template.fields.find((f: any) => f.id === v.fieldId);
      if (field) {
        let val =
          v.valueString ?? (v.valueNumber !== null && v.valueNumber !== undefined ? String(v.valueNumber) : null);
        if (field.tipe === "BOOLEAN" && typeof val === "string") {
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
      result.signatureData && typeof result.signatureData === "object"
        ? (result.signatureData as Record<string, string>)
        : {};
    const fotoList = Array.isArray(result.fotoPaths) ? result.fotoPaths : [];
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
    setSasaranId(result.sasaranId ?? null);
    setPendingForm(null);
    setActiveForm(template);
  }

  function handleGPS(id: number) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      handleFieldChange(id, `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`);
    });
  }

  async function handleExportPDF(res: any) {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    const template = templates.find((t) => t.id === res.templateId) || res.template;
    const namaSasaran = res.sasaran?.nama || res.namaSasaran || "-";
    const alamatSasaran = res.sasaran?.alamat || res.alamatSasaran || "-";
    const tanggal = res.tanggal
      ? new Date(res.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : new Date(res.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    doc.setFontSize(14);
    doc.setTextColor(0, 122, 255);
    doc.text("HASIL PEMERIKSAAN KESEHATAN LINGKUNGAN", 14, 15);
    doc.setTextColor(9, 9, 11);
    doc.setFontSize(12);
    doc.text(template?.nama || "Pemeriksaan", 14, 23);
    doc.setFontSize(9);
    doc.setTextColor(113, 113, 122);
    doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, 28);

    autoTable(doc, {
      startY: 33,
      body: [
        ["Sasaran / Nama", namaSasaran],
        ["Alamat", alamatSasaran],
        ["Tanggal Pemeriksaan", tanggal],
        ["Unit Puskesmas", res.puskesmas?.nama || "-"],
        ["Status", res.status || "DRAFT"],
      ],
      styles: { fontSize: 9, cellPadding: 2, textColor: [9, 9, 11] },
      columnStyles: { 0: { fontStyle: "bold", fillColor: [244, 244, 245], cellWidth: 45 } },
      theme: "plain",
    });

    const rows: (string | number)[][] = [];
    (template?.fields || [])
      .filter((f: any) => f.grup !== "__META__")
      .forEach((f: any) => {
        const v = (res.values || []).find((rv: any) => rv.fieldId === f.id);
        let answer = "-";
        if (f.tipe === "BOOLEAN") {
          const u = String(v?.valueString || "").toUpperCase();
          answer = u === "TRUE" ? "Ya" : u === "FALSE" ? "Tidak" : u === "NA" ? "T/A" : "-";
        } else if (f.tipe === "PHOTO") {
          answer = v?.valueString ? "[Foto Terlampir]" : "-";
        } else if (f.tipe === "SIGNATURE") {
          answer = v?.valueString ? "[Tanda Tangan Digital]" : "-";
        } else if (v?.valueNumber !== null && v?.valueNumber !== undefined) {
          answer = String(v.valueNumber);
        } else if (v?.valueString) {
          answer = v.valueString;
        }
        rows.push([f.pertanyaan, answer]);
      });

    if (res.skor !== undefined && res.skor !== null) {
      rows.push(["SKOR AKHIR", String(res.skor)]);
    }

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [["Pertanyaan", "Jawaban"]],
      body: rows,
      styles: { fontSize: 9, cellPadding: 3, textColor: [9, 9, 11] },
      headStyles: { fillColor: [0, 122, 255], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [244, 244, 245] },
      columnStyles: { 1: { cellWidth: 60 } },
    });

    doc.save(`pemeriksaan-${namaSasaran.replace(/\s+/g, "-").toLowerCase()}.pdf`);
  }

  function handleSubmit() {
    const signatures: Record<string, string> = {};
    const fotoPaths: string[] = [];
    let tanggalFinal = tanggalPemeriksaan || new Date().toISOString().split("T")[0];

    const valuesArray = Object.entries(formValues).map(([fid, val]) => {
      const field = activeForm.fields.find((f: any) => f.id === Number(fid));
      if (field?.tipe === "SIGNATURE" && val) {
        signatures[field.pertanyaan] = String(val);
      }
      if (field?.tipe === "PHOTO" && val) {
        fotoPaths.push(String(val));
      }
      if (field?.tipe === "DATE" && val && val !== "") {
        tanggalFinal = String(val);
      }
      return {
        fieldId: Number(fid),
        valueString: field?.tipe !== "NUMBER" && val !== null && val !== undefined && val !== "" ? String(val) : null,
        valueNumber:
          field?.tipe === "NUMBER" && val !== null && val !== undefined && val !== "" ? parseFloat(val) || 0 : null,
      };
    });

    const metaArray = Object.entries(metaValues).map(([fid, val]) => {
      const field = activeForm.fields.find((f: any) => f.id === Number(fid));
      if (field?.tipe === "SIGNATURE" && val) {
        signatures[field.pertanyaan] = String(val);
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

    const namaMeta = Object.entries(metaValues).find(([fid]) => {
      const f = activeForm.fields.find((f: any) => f.id === Number(fid));
      return f?.pertanyaan?.toLowerCase().includes("nama");
    });
    const alamatMeta = Object.entries(metaValues).find(([fid]) => {
      const f = activeForm.fields.find((f: any) => f.id === Number(fid));
      return f?.pertanyaan?.toLowerCase().includes("tempat") || f?.pertanyaan?.toLowerCase().includes("alamat");
    });

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
      const parts = gpsMeta[1].split(",");
      const pLat = parseFloat(parts[0]);
      const pLng = parseFloat(parts[1]);
      if (!Number.isNaN(pLat)) lat = pLat;
      if (!Number.isNaN(pLng)) lng = pLng;
    }

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
      lat,
      lng,
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
    const metaFields = activeForm.fields.filter((f: any) => f.grup === "__META__");
    for (const mf of metaFields) {
      const val = String(metaValues[mf.id] ?? "").trim();
      if (!val) continue;
      const q = (mf.pertanyaan || "").toLowerCase();
      if (q.includes("golongan") || q.includes("tipe") || val.toLowerCase().includes("golongan")) {
        return val;
      }
    }
    return "";
  }, [activeForm, metaValues]);

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
    const countTotal = penilaian.length;
    for (const f of penilaian) {
      const disabledInfo = isFieldDisabledInfo(f, formValues, selectedGolongan, activeForm.fields);
      if (disabledInfo.isDisabled) continue;

      const val = formValues[f.id];
      const upperVal = String(val ?? "").toUpperCase();
      // Abaikan opsi T/A (Tidak Ada / NA) dari gained dan max
      if (upperVal === "NA") continue;

      const skorBenar = f.config?.skorBenar ?? f.config?.skor ?? 1;
      const skorSalah = f.config?.skorSalah ?? 0;
      max += Math.max(skorBenar, skorSalah);
      if (f.tipe === "BOOLEAN") {
        if (upperVal === "TRUE") {
          gained += skorBenar;
          countBenar++;
        } else if (upperVal === "FALSE") {
          gained += skorSalah;
          countSalah++;
        }
      } else if (f.tipe === "NUMBER") {
        gained += (parseFloat(val) || 0) * (f.config?.skor ?? 0);
      } else if (val) {
        gained += f.config?.skor ?? 0;
      }
    }
    let finalValue = gained;
    let valueText = String(Math.round(gained));
    if (rumus === "percentage" || rumus === "weighted") {
      finalValue = max > 0 ? (gained / max) * 100 : 0;
      valueText = `${Math.round(finalValue)}%`;
    } else if (rumus === "custom" && config.customFormula) {
      try {
        const evalStr = config.customFormula
          .replace(/SUM\(\)/g, String(gained))
          .replace(/AVG\(\)/g, String(countTotal > 0 ? gained / countTotal : 0))
          .replace(/COUNT\(\)/g, String(countTotal))
          .replace(/\u2713/g, String(countBenar))
          .replace(/\u2717/g, String(countSalah));
        const res = new Function(`return ${evalStr}`)();
        if (!Number.isNaN(res)) {
          finalValue = res;
          valueText = String(Math.round(finalValue * 10) / 10);
        }
      } catch {}
    }
    let pass = false;
    if (op === ">=") pass = finalValue >= thresh;
    else if (op === ">") pass = finalValue > thresh;
    else if (op === "<=") pass = finalValue <= thresh;
    else if (op === "<") pass = finalValue < thresh;
    return { gained: Math.round(gained), max, finalValue, valueText, pass, text: pass ? passText : failText };
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
        <ShieldAlert className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
        <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Akses Ditolak</p>
        <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Halaman ini hanya untuk Operator / Puskesmas</p>
      </div>
    );
  }

  const filteredSasarans = sasarans.filter((sasaran: any) => {
    const term = sasaranSearch.trim().toLowerCase();
    return (
      !term ||
      [sasaran.nama, sasaran.alamat, sasaran.pemilik].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      )
    );
  });

  if (pendingForm) {
    return (
      <div className="w-full pb-6 fade-in">
        <button
          onClick={() => setPendingForm(null)}
          className="mb-5 flex items-center gap-2 text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke formulir
        </button>
        <div className="border-b border-[hsl(var(--border))] pb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
              <FileText className="h-3.5 w-3.5" /> {pendingForm.nama} <ChevronRight className="h-3 w-3" /> Data Dasar
            </div>
            <h1 className="text-[22px] font-bold tracking-tight">Pilih Sasaran Pemeriksaan</h1>
            <p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">
              Menampilkan Data Dasar modul {pendingForm.dataDasarCategory?.nama || pendingForm.nama} untuk seluruh jenis
              entitas. Pilih satu sasaran untuk membuka formulir.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openFormWithoutSasaran(pendingForm)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/50 text-[12px] font-bold rounded-xl transition-all"
            >
              Lewati (Tanpa Sasaran)
            </button>
            <button
              type="button"
              onClick={() => setIsNewSasaranModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#00A876] hover:bg-[#008f64] text-white text-[12px] font-bold rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Tambah Sasaran Baru
            </button>
          </div>
        </div>
        <div className="flex items-center border-x border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3">
          <Search className="mr-2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            value={sasaranSearch}
            onChange={(event) => setSasaranSearch(event.target.value)}
            placeholder="Cari nama, alamat, atau pemilik..."
            className="w-full bg-transparent text-[12px] outline-none"
          />
          <span className="whitespace-nowrap text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">
            {filteredSasarans.length} data
          </span>
        </div>
        <div className="border-x border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          {filteredSasarans.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Database className="mx-auto mb-3 h-6 w-6 text-[hsl(var(--muted-foreground))]" />
              <p className="text-[12px] font-bold">Data Dasar tidak ditemukan</p>
              <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                {sasaranSearch
                  ? "Tidak ada sasaran yang cocok dengan kata kunci pencarian."
                  : "Belum ada sasaran pada modul ini."}
              </p>
              <button
                type="button"
                onClick={() => setIsNewSasaranModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#00A876] hover:bg-[#008f64] text-white text-[12px] font-bold rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah Sasaran Baru Sekarang
              </button>
            </div>
          ) : (
            filteredSasarans.map((sasaran: any, index: number) => (
              <button
                key={sasaran.id}
                onClick={() => openFormWithSasaran(pendingForm, sasaran)}
                className="group flex w-full items-center gap-4 border-b border-[hsl(var(--border))] px-4 py-3 text-left last:border-b-0 hover:bg-[hsl(var(--muted))]/40"
              >
                <span className="w-8 text-center text-[10px] font-bold tabular-nums text-[hsl(var(--muted-foreground))]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold">{sasaran.nama}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-[hsl(var(--muted-foreground))]">
                    {sasaran.alamat || "Alamat belum diisi"}
                  </span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]">
                  Pilih
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ))
          )}
        </div>

        {/* ── MODAL: TAMBAH DATA DASAR (FORMAT SESUAI DATA-DASAR) ── */}
        {isNewSasaranModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 fade-in">
            <div className="w-full max-w-3xl h-[86vh] flex flex-col bg-[hsl(var(--background))] rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="shrink-0 px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--card))]">
                <div>
                  <h2 className="text-[15px] font-extrabold">Tambah Data Dasar</h2>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    {baselineParams.length} field dari builder · {syncedParams.length} tersinkron
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewSasaranModalOpen(false)}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto p-6">
                <form
                  id="new-sasaran-form"
                  onSubmit={handleCreateSasaranSubmit}
                  className="max-w-2xl mx-auto space-y-4"
                >
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
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                            Skema form & kategori
                          </p>
                        </div>
                        <select
                          value={newSasaranForm.subCategoryId || ""}
                          onChange={(e) =>
                            setNewSasaranForm((prev) => ({ ...prev, subCategoryId: Number(e.target.value) }))
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
                            value={newSasaranForm.puskesmasId || ""}
                            onChange={(e) =>
                              setNewSasaranForm((prev) => ({ ...prev, puskesmasId: Number(e.target.value) }))
                            }
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

                      {baselineParams.map((p: any) => (
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
                          <div>{renderSasaranDynamicInput(p)}</div>
                        </div>
                      ))}
                    </>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-[hsl(var(--border))] px-6 py-4 flex items-center justify-between bg-[hsl(var(--card))]">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  Lengkapi data wajib (*) · Sasaran akan otomatis terpilih setelah disimpan.
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewSasaranModalOpen(false)}
                    className="h-10 px-4 text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    form="new-sasaran-form"
                    disabled={createSasaranMut.isPending || baselineParams.length === 0}
                    className="h-10 px-6 rounded-full bg-[#00A876] text-white text-[12px] font-extrabold hover:brightness-95 transition disabled:opacity-50 inline-flex items-center gap-2"
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
      <div className="w-full mx-auto pb-4 fade-in">
        {/* ── HERO ── */}
        <div className="relative overflow-hidden bg-[#0C1B16] text-white rounded-b-3xl">
          <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#00A876] opacity-[0.12]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#123527_0%,transparent_55%)]" />
          <div className="relative z-10 px-8 py-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-2">Lapangan</p>
              <h1 className="text-[30px] font-black tracking-[-0.03em] leading-none">Pemeriksaan</h1>
              <p className="text-[13px] font-medium text-white/50 mt-2">
                {templates.length} formulir · {results.length} riwayat
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white/[0.08] border border-white/15 p-1">
              <button
                onClick={() => setActiveTab("formulir")}
                className={`px-4 py-2 text-[12px] font-bold rounded-full transition-all ${
                  activeTab === "formulir" ? "bg-[#BEF264] text-[#06281E]" : "text-white/60 hover:text-white"
                }`}
              >
                Formulir
              </button>
              <button
                onClick={() => setActiveTab("riwayat")}
                className={`px-4 py-2 text-[12px] font-bold rounded-full transition-all ${
                  activeTab === "riwayat" ? "bg-[#BEF264] text-[#06281E]" : "text-white/60 hover:text-white"
                }`}
              >
                Riwayat
              </button>
            </div>
          </div>
        </div>

        {activeTab === "formulir" && (
          <div className="pt-6">
            <h3 className="text-[10px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.22em] px-1 pb-2">
              Template Pemeriksaan
            </h3>
            {templates.length === 0 ? (
              <div className="border border-dashed border-[hsl(var(--border))] rounded-xl p-10 flex flex-col items-center justify-center text-center">
                <FileText className="w-8 h-8 text-[hsl(var(--muted-foreground))]/40 mb-3" />
                <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Belum Ada Template</p>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">
                  Import template lewat halaman Form Pemeriksaan.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {templates.map((tpl: any) => {
                  const fieldCount = tpl.fields?.filter((f: any) => f.grup !== "__META__").length || 0;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => handleOpenForm(tpl)}
                      className="group flex items-stretch rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[#00A876]/40 transition-colors overflow-hidden text-left"
                    >
                      <div className="w-1 shrink-0 bg-[#00A876]" />
                      <div className="flex-1 flex items-center gap-4 px-5 py-4">
                        <div className="w-10 h-10 rounded-xl bg-[#00A876]/10 text-[#00A876] flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-extrabold text-[hsl(var(--foreground))] truncate">
                            {tpl.nama}
                          </h4>
                          <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] mt-0.5">
                            {fieldCount} variabel{tpl.subCategory ? ` · ${tpl.subCategory.nama}` : ""}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[hsl(var(--muted-foreground))] group-hover:text-[#00A876] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "riwayat" && (
          <div className="pt-6">
            <h3 className="text-[10px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.22em] px-1 pb-2">
              Riwayat Pemeriksaan
            </h3>
            {results.length === 0 ? (
              <div className="border border-dashed border-[hsl(var(--border))] rounded-xl p-10 flex flex-col items-center justify-center text-center">
                <ShieldAlert className="w-8 h-8 text-[hsl(var(--muted-foreground))]/40 mb-3" />
                <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Belum Ada Riwayat</p>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">
                  Hasil pemeriksaan akan tampil di sini.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {results.map((res: any) => (
                  <div
                    key={res.id}
                    className="group flex items-stretch rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[#00A876]/40 transition-colors overflow-hidden"
                  >
                    <div className="w-1 shrink-0 bg-[#00A876]" />
                    <div className="flex-1 flex items-center gap-4 px-5 py-4">
                      <div className="w-10 h-10 rounded-xl bg-[#00A876]/10 text-[#00A876] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-extrabold text-[hsl(var(--foreground))] truncate">
                          {res.sasaran?.nama || res.namaSasaran}
                        </h4>
                        <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] mt-0.5">
                          {res.template?.nama} · {res.puskesmas?.nama} ·{" "}
                          {new Date(res.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          title="PDF"
                          onClick={() => handleExportPDF(res)}
                          className="p-2 text-[#00A876] hover:bg-[#00A876]/10 rounded-xl transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          title="Edit"
                          onClick={() => handleEditResult(res)}
                          className="p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          title="Hapus"
                          onClick={() => {
                            if (window.confirm("Yakin ingin menghapus hasil pemeriksaan ini?")) {
                              deleteMut.mutate(res.id);
                            }
                          }}
                          className="p-2 text-[#E15A4F] hover:bg-[#E15A4F]/10 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
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
