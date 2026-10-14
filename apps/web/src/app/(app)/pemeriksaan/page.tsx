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
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { FormView, isFieldDisabledInfo } from "./FormView";

export default function PemeriksaanPage() {
  const { data: session } = useSession();
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

  // Modal tambah sasaran baru langsung dari form
  const [isNewSasaranModalOpen, setIsNewSasaranModalOpen] = useState(false);
  const [isLocatingSasaran, setIsLocatingSasaran] = useState(false);
  const [newSasaranForm, setNewSasaranForm] = useState({
    nama: "",
    subCategoryId: null as number | null,
    alamat: "",
    pemilik: "",
    kontak: "",
    lat: null as number | null,
    lng: null as number | null,
  });
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});

  const { data: sasaranResult = { data: [], total: 0, page: 1, totalPages: 1 } } = useQuery<any>({
    queryKey: ["sasarans-data-dasar", pendingForm?.config?.dataDasarCategoryId],
    queryFn: async () => {
      const categoryId = pendingForm?.config?.dataDasarCategoryId;
      if (!categoryId) return { data: [], total: 0, page: 1, totalPages: 1 };
      const params = new URLSearchParams({ categoryId: String(categoryId), paginated: "1", page: "1", limit: "100" });
      const res = await fetch(`/api/sasaran?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat Data Dasar");
      return res.json();
    },
    enabled: !!pendingForm?.config?.dataDasarCategoryId,
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
        queryKey: ["sasarans-data-dasar", pendingForm?.config?.dataDasarCategoryId],
      });
      toast.success(`Sasaran "${newSasaran.nama}" berhasil dibuat`);
      setIsNewSasaranModalOpen(false);
      if (pendingForm) {
        openFormWithSasaran(pendingForm, newSasaran);
      }
    },
    onError: (err: any) => toast.error(err.message || "Gagal membuat sasaran baru"),
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

  const baselineParams = useMemo(() => {
    if (!pendingForm) return [];
    const params = pendingForm.dataDasarCategory?.parameters || pendingForm.subCategory?.category?.parameters || [];
    return [...params].filter((p: any) => p.isBaseline).sort((a: any, b: any) => (a.urutan ?? 0) - (b.urutan ?? 0));
  }, [pendingForm]);

  const categoryCode = useMemo(() => {
    return (pendingForm?.dataDasarCategory?.code || pendingForm?.subCategory?.category?.code || "").toLowerCase();
  }, [pendingForm]);

  const availableSubCats = useMemo(() => {
    if (!pendingForm) return [];
    if (pendingForm.dataDasarCategory?.subCategories?.length) {
      return pendingForm.dataDasarCategory.subCategories;
    }
    if (pendingForm.subCategory) {
      return [pendingForm.subCategory];
    }
    return [];
  }, [pendingForm]);

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
      "w-full h-10 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl px-3 text-[13px] font-medium focus:ring-0 focus:outline-none focus:border-[#00A876] transition-colors";

    if (p.type === "SELECT") {
      const source = p.config?.optionsSource || "auto_category";
      const resolvedSource =
        source === "auto_category"
          ? categoryCode === "tpp"
            ? "master_tpp"
            : categoryCode === "ttu"
              ? "master_ttu"
              : "master_sarana"
          : source;

      let optionsList: string[] = [];
      if (resolvedSource === "master_tpp") {
        optionsList = (masterJenis.tpp || []).map((j: any) => j.nama);
      } else if (resolvedSource === "master_ttu") {
        optionsList = (masterJenis.ttu || []).map((j: any) => j.nama);
      } else if (resolvedSource === "master_sarana") {
        optionsList = (masterJenis.sarana || []).map((j: any) => j.nama);
      } else {
        optionsList = getParamOptions(p).length > 0 ? getParamOptions(p) : availableSubCats.map((sc: any) => sc.nama);
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

  function handleCreateSasaranSubmit(e: React.FormEvent) {
    e.preventDefault();

    const resolvedSubCatId =
      newSasaranForm.subCategoryId ||
      pendingForm?.subCategoryId ||
      pendingForm?.dataDasarCategory?.subCategories?.[0]?.id;

    if (!resolvedSubCatId) {
      toast.error("Subkategori sasaran wajib dipilih");
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
      toast.error("Nama sasaran wajib diisi");
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

    const finalDataDinamis: Record<string, any> = { ...dynamicValues };
    if (baselineParams.length === 0) {
      if (displayName) finalDataDinamis.nama = displayName;
      if (dynamicAlamat) finalDataDinamis.alamat = dynamicAlamat;
      if (dynamicPemilik) finalDataDinamis.pemilik = dynamicPemilik;
      if (dynamicKontak) finalDataDinamis.kontak = dynamicKontak;
    }

    createSasaranMut.mutate({
      nama: displayName.trim(),
      subCategoryId: Number(resolvedSubCatId),
      alamat: dynamicAlamat.trim() || null,
      pemilik: dynamicPemilik.trim() || null,
      kontak: dynamicKontak.trim() || null,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      dataDinamis: finalDataDinamis,
    });
  }

  function handleGetSasaranGPS() {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung browser");
      return;
    }
    setIsLocatingSasaran(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latVal = parseFloat(pos.coords.latitude.toFixed(6));
        const lngVal = parseFloat(pos.coords.longitude.toFixed(6));
        setNewSasaranForm((prev) => ({
          ...prev,
          lat: latVal,
          lng: lngVal,
        }));
        setDynamicValues((prev) => {
          const next = { ...prev };
          for (const p of baselineParams) {
            if (p.config?.syncToEntityField === "lat" || p.code === "lat" || p.code === "latitude") {
              next[p.code] = String(latVal);
            }
            if (p.config?.syncToEntityField === "lng" || p.code === "lng" || p.code === "longitude") {
              next[p.code] = String(lngVal);
            }
          }
          return next;
        });
        setIsLocatingSasaran(false);
        toast.success("Titik koordinat berhasil diambil");
      },
      () => {
        setIsLocatingSasaran(false);
        toast.error("Gagal mendapatkan lokasi GPS");
      },
    );
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
    const dataDasarCategoryId = Number(
      template.config?.dataDasarCategoryId ?? template.dataDasarCategory?.id ?? template.subCategory?.category?.id,
    );
    if (!Number.isInteger(dataDasarCategoryId) || dataDasarCategoryId <= 0) {
      openFormWithoutSasaran(template);
      return;
    }
    const defaultSubCat = template.subCategoryId || template.dataDasarCategory?.subCategories?.[0]?.id || null;
    setNewSasaranForm({
      nama: "",
      subCategoryId: defaultSubCat ? Number(defaultSubCat) : null,
      alamat: "",
      pemilik: "",
      kontak: "",
      lat: null,
      lng: null,
    });
    const initialDyn: Record<string, string> = {};
    const params = template.dataDasarCategory?.parameters || template.subCategory?.category?.parameters || [];
    params.forEach((p: any) => {
      initialDyn[p.code] = "";
    });
    setDynamicValues(initialDyn);
    setPendingForm({
      ...template,
      config: { ...template.config, dataDasarCategoryId },
    });
  }

  function openFormWithSasaran(template: any, sasaran: any) {
    setEditingId(null);
    setTanggalPemeriksaan(new Date().toISOString().split("T")[0]);
    const initVal: Record<number, any> = {};
    const initMeta: Record<number, any> = {};
    const dynamicSource = (sasaran?.dataDinamis || {}) as Record<string, unknown>;
    const baselineParams = template.dataDasarCategory?.parameters || [];
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
        const parameter = baselineParams.find(
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

        {/* ── MODAL: TAMBAH SASARAN BARU (SESUAI FORM DATA DASAR) ── */}
        {isNewSasaranModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 fade-in">
            <div className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-[hsl(var(--card))] rounded-2xl overflow-hidden shadow-2xl border border-[hsl(var(--border))]">
              {/* Modal Header */}
              <div className="shrink-0 px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--card))]">
                <div>
                  <h2 className="text-[16px] font-extrabold text-[hsl(var(--foreground))]">Tambah Sasaran Baru</h2>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    Modul Data Dasar:{" "}
                    <span className="font-semibold text-[#00A876]">
                      {pendingForm.dataDasarCategory?.nama ||
                        pendingForm.subCategory?.category?.nama ||
                        pendingForm.nama}
                    </span>
                    {baselineParams.length > 0 ? ` · ${baselineParams.length} parameter skema` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewSasaranModalOpen(false)}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body / Form */}
              <form
                id="new-sasaran-form"
                onSubmit={handleCreateSasaranSubmit}
                className="flex-1 overflow-y-auto p-6 space-y-4"
              >
                {/* Jenis / Tipe Entitas (Sub Category) */}
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-center px-4 py-3 rounded-xl bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]">
                  <div>
                    <label className="block text-[11px] font-bold text-[hsl(var(--foreground))]">
                      Jenis / Tipe Entitas <span className="text-[#E15A4F]">*</span>
                    </label>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Subkategori sasaran</p>
                  </div>
                  <select
                    value={newSasaranForm.subCategoryId || ""}
                    onChange={(e) =>
                      setNewSasaranForm((prev) => ({
                        ...prev,
                        subCategoryId: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    required
                    className="w-full h-10 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-[13px] font-medium outline-none focus:border-[#00A876] transition-colors cursor-pointer"
                  >
                    <option value="">Pilih Jenis / Subkategori</option>
                    {availableSubCats.map((sc: any) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.grup ? `[${sc.grup}] ` : ""}
                        {sc.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {baselineParams.length === 0 ? (
                  <>
                    <div className="rounded-xl bg-[#00A876]/10 border border-[#00A876]/20 px-4 py-3 text-[11px] text-[#00A876] font-medium">
                      Modul ini menggunakan formulir Data Dasar standar. Isi identitas sasaran di bawah ini.
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-center px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                      <div>
                        <label className="block text-[11px] font-bold text-[hsl(var(--foreground))]">
                          Nama Tempat / Usaha <span className="text-[#E15A4F]">*</span>
                        </label>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Nama sasaran</p>
                      </div>
                      <input
                        type="text"
                        required
                        value={newSasaranForm.nama}
                        onChange={(e) => setNewSasaranForm((prev) => ({ ...prev, nama: e.target.value }))}
                        placeholder="Contoh: Depot Air Sehat, Warung Barokah..."
                        className="w-full h-10 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-[13px] font-medium outline-none focus:border-[#00A876] transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-center px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                      <div>
                        <label className="block text-[11px] font-bold text-[hsl(var(--foreground))]">
                          Alamat Lengkap
                        </label>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Lokasi sarana</p>
                      </div>
                      <textarea
                        rows={2}
                        value={newSasaranForm.alamat}
                        onChange={(e) => setNewSasaranForm((prev) => ({ ...prev, alamat: e.target.value }))}
                        placeholder="Jalan, RT/RW, Kelurahan/Desa..."
                        className="w-full py-2 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-[13px] font-medium outline-none focus:border-[#00A876] transition-colors resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-center px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                      <div>
                        <label className="block text-[11px] font-bold text-[hsl(var(--foreground))]">
                          Nama Pemilik / Pengelola
                        </label>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Penanggung jawab</p>
                      </div>
                      <input
                        type="text"
                        value={newSasaranForm.pemilik}
                        onChange={(e) => setNewSasaranForm((prev) => ({ ...prev, pemilik: e.target.value }))}
                        placeholder="Nama penanggung jawab sarana..."
                        className="w-full h-10 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-[13px] font-medium outline-none focus:border-[#00A876] transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-center px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                      <div>
                        <label className="block text-[11px] font-bold text-[hsl(var(--foreground))]">
                          Kontak / No. Telepon
                        </label>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Nomor HP/WA</p>
                      </div>
                      <input
                        type="text"
                        value={newSasaranForm.kontak}
                        onChange={(e) => setNewSasaranForm((prev) => ({ ...prev, kontak: e.target.value }))}
                        placeholder="08xxxxxxxxxx"
                        className="w-full h-10 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-[13px] font-medium outline-none focus:border-[#00A876] transition-colors"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Baseline Parameters dari Data Dasar */}
                    {baselineParams.map((p: any) => (
                      <div
                        key={p.code}
                        className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-center px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                      >
                        <div>
                          <label className="block text-[11px] font-bold text-[hsl(var(--foreground))]">
                            {p.nama} {p.required ? <span className="text-[#E15A4F]">*</span> : ""}
                          </label>
                          <p className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] mt-0.5">
                            {p.code} · {p.type}
                          </p>
                        </div>
                        <div>{renderSasaranDynamicInput(p)}</div>
                      </div>
                    ))}
                  </>
                )}

                {/* GPS Coordinates Helper */}
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-center px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                  <div>
                    <label className="block text-[11px] font-bold text-[hsl(var(--foreground))]">
                      Titik Lokasi (GPS)
                    </label>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Koordinat lintang & bujur</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      placeholder="Latitude, Longitude"
                      value={
                        newSasaranForm.lat !== null && newSasaranForm.lng !== null
                          ? `${newSasaranForm.lat}, ${newSasaranForm.lng}`
                          : ""
                      }
                      className="flex-1 h-10 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-[12px] font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleGetSasaranGPS}
                      disabled={isLocatingSasaran}
                      className="h-10 px-3.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 text-[hsl(var(--foreground))] text-[12px] font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 shrink-0"
                    >
                      {isLocatingSasaran ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00A876]" /> Mencari...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3.5 h-3.5 text-[#00A876]" /> Ambil GPS
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Modal Footer */}
              <div className="shrink-0 border-t border-[hsl(var(--border))] px-6 py-4 flex items-center justify-between bg-[hsl(var(--card))]">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  Sasaran akan otomatis terpilih setelah disimpan.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewSasaranModalOpen(false)}
                    className="h-10 px-4 text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    form="new-sasaran-form"
                    disabled={createSasaranMut.isPending}
                    className="h-10 px-5 rounded-xl bg-[#00A876] hover:bg-[#008f64] text-white text-[12px] font-extrabold transition-all shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
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
