"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderPlus,
  GripVertical,
  History,
  Pencil,
  Plus,
  Settings2,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ImportFloatingWidget } from "@/components/inspection/import-floating-widget";
import { ImportHistoryModal } from "@/components/inspection/import-history-modal";
import { ImportInspectionModal, type ImportJobState } from "@/components/inspection/import-inspection-modal";

const FIELD_TYPES = [
  { value: "BOOLEAN", label: "Ceklis" },
  { value: "TEXT", label: "Teks" },
  { value: "NUMBER", label: "Angka" },
  { value: "DATE", label: "Tanggal" },
  { value: "SELECT", label: "Dropdown" },
  { value: "PHOTO", label: "Foto" },
  { value: "SIGNATURE", label: "Ttd" },
  { value: "GPS", label: "GPS" },
];

const RUMUS_OPTIONS = [
  { value: "sum", label: "Jumlah", desc: "Jumlah semua skor langsung" },
  { value: "percentage", label: "Persentase", desc: "(Diperoleh / Maksimal) × 100" },
  { value: "weighted", label: "Rata-rata Tertimbang", desc: "Σ(nilai × bobot) / Σ(bobot)" },
  { value: "custom", label: "Kustom", desc: "Rumus manual sesuai kebutuhan" },
];

function parseDropdownOptions(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean);
    } catch {}
    return raw
      .split(/[,\n;]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function toRoman(num: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      result += syms[i];
      num -= vals[i];
    }
  }
  return result;
}

export default function FormPemeriksaanPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeImportJob, setActiveImportJob] = useState<ImportJobState | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportWidgetVisible, setIsImportWidgetVisible] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Resume active import job if available in localStorage
  useEffect(() => {
    const lastJobId = typeof window !== "undefined" ? localStorage.getItem("kesling:last-import-job-id") : null;
    if (lastJobId && !activeImportJob) {
      fetch(`/api/inspection/templates/import?jobId=${lastJobId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && (data.status === "processing" || data.status === "queued")) {
            setActiveImportJob({
              jobId: data.jobId,
              fileName: data.fileName,
              status: data.status,
              progress: data.progress || 10,
              message: data.message || "",
              queuePosition: data.queuePosition,
              totalQueued: data.totalQueued,
              logs: data.logs || [],
              result: data.result,
              error: data.error,
            });
            setIsImportWidgetVisible(true);
          }
        })
        .catch(() => {});
    }
  }, []);

  async function handleOpenTerminalFromHistory(jobId: string) {
    try {
      const res = await fetch(`/api/inspection/templates/import?jobId=${jobId}`);
      if (!res.ok) throw new Error("Gagal memuat detail job");
      const data = await res.json();
      setActiveImportJob({
        jobId: data.jobId,
        fileName: data.fileName,
        status: data.status,
        progress: data.progress || 10,
        message: data.message || "",
        queuePosition: data.queuePosition,
        totalQueued: data.totalQueued,
        logs: data.logs || [],
        result: data.result,
        error: data.error,
      });
      setIsHistoryModalOpen(false);
      setIsImportModalOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Gagal membuka terminal log");
    }
  }

  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [subCategoryId, setSubCategoryId] = useState<number | null>(null);
  const [dataDasarCategoryId, setDataDasarCategoryId] = useState<number | null>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [rumus, setRumus] = useState("sum");
  const [customFormula, setCustomFormula] = useState("");
  const [thresholdOperator, setThresholdOperator] = useState(">=");
  const [thresholdValue, setThresholdValue] = useState(80);
  const [thresholdPassText, setThresholdPassText] = useState("Memenuhi Syarat");
  const [thresholdFailText, setThresholdFailText] = useState("Tidak Memenuhi Syarat");
  const [defaultYa, setDefaultYa] = useState(false);
  const [paramDiperiksaId, setParamDiperiksaId] = useState<number | null>(null);
  const [paramMsId, setParamMsId] = useState<number | null>(null);
  const [paramTmsId, setParamTmsId] = useState<number | null>(null);

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["dynamic-categories"],
    queryFn: async () => {
      const res = await fetch("/api/master/dynamic-categories");
      return res.json();
    },
  });

  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ["inspection-templates"],
    queryFn: async () => {
      const res = await fetch("/api/inspection/templates");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/inspection/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Gagal menyimpan data");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inspection-templates"] });
      setSelectedTemplateId(data.id);
      setIsCreating(false);
      toast.success("Template tersimpan");
    },
    onError: () => toast.error("Gagal menyimpan template"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/inspection/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspection-templates"] });
      toast.success("Template dihapus");
    },
    onError: () => toast.error("Gagal menghapus template"),
  });

  const [autoSaveState, setAutoSaveState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");

  const buildSavePayload = () => ({
    id: selectedTemplateId,
    nama,
    deskripsi,
    subCategoryId,
    config: {
      dataDasarCategoryId,
      rumus,
      customFormula,
      thresholdOperator,
      thresholdValue,
      thresholdPassText,
      thresholdFailText,
      defaultYa,
      agregasi: {
        paramDiperiksaId,
        paramMsId,
        paramTmsId,
      },
    },
    fields: fields.map((f, i) => ({
      pertanyaan: f.pertanyaan,
      tipe: f.tipe,
      isRequired: f.isRequired ?? false,
      grup: f.grup || "",
      options: f.opsi || f.options || null,
      skor: f.skor ?? 0,
      skorBenar: f.skorBenar ?? 1,
      skorSalah: f.skorSalah ?? 0,
      urutan: i,
      autoFill: f.autoFill || f.config?.autoFill || undefined,
      isDisabled: f.isDisabled ?? f.config?.isDisabled ?? false,
      dependsOn: f.dependsOn ?? f.config?.dependsOn ?? undefined,
      targetGolongan: f.targetGolongan || f.config?.targetGolongan || "ALL",
      allowNA: f.allowNA ?? f.config?.allowNA ?? false,
      config: {
        ...(typeof f.config === "object" && f.config !== null ? f.config : {}),
        skor: f.skor ?? 0,
        skorBenar: f.skorBenar ?? 1,
        skorSalah: f.skorSalah ?? 0,
        dataDasarCode: f.config?.dataDasarCode,
        syncToEntityField: f.config?.syncToEntityField,
        autoFill: f.autoFill || f.config?.autoFill || undefined,
        isDisabled: f.isDisabled ?? f.config?.isDisabled ?? false,
        dependsOn: f.dependsOn ?? f.config?.dependsOn ?? undefined,
        targetGolongan: f.targetGolongan || f.config?.targetGolongan || "ALL",
        allowNA: f.allowNA ?? f.config?.allowNA ?? false,
      },
    })),
  });

  function handleSave() {
    if (!nama.trim()) {
      toast.error("Nama template wajib diisi");
      return;
    }
    createMutation.mutate(buildSavePayload());
  }

  // Auto-simpan realtime: debounce 2 detik setiap ada perubahan (hanya template yang sudah tersimpan)
  const skipAutoSaveRef = useRef(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveInFlightRef = useRef(false);
  const autoSavePendingRef = useRef(false);

  const doAutoSave = async () => {
    if (autoSaveInFlightRef.current) {
      autoSavePendingRef.current = true;
      return;
    }
    autoSaveInFlightRef.current = true;
    setAutoSaveState("saving");
    try {
      const res = await fetch("/api/inspection/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSavePayload()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Gagal menyimpan");
      }
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["inspection-templates"] });
      if (!selectedTemplateId && data?.id) setSelectedTemplateId(data.id);
      setAutoSaveState("saved");
    } catch {
      setAutoSaveState("error");
    } finally {
      autoSaveInFlightRef.current = false;
      if (autoSavePendingRef.current) {
        autoSavePendingRef.current = false;
        doAutoSave();
      }
    }
  };

  useEffect(() => {
    // Skip hingga template aktif selesai dimuat & user benar-benar mengubah
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }
    if (!selectedTemplateId || isCreating) {
      setAutoSaveState("idle");
      return;
    }
    if (!nama.trim()) {
      setAutoSaveState("dirty");
      return;
    }
    setAutoSaveState("dirty");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      doAutoSave();
    }, 2000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    nama,
    deskripsi,
    subCategoryId,
    dataDasarCategoryId,
    fields,
    rumus,
    customFormula,
    thresholdOperator,
    thresholdValue,
    thresholdPassText,
    thresholdFailText,
    defaultYa,
    paramDiperiksaId,
    paramMsId,
    paramTmsId,
    selectedTemplateId,
    isCreating,
  ]);

  // skipAutoSaveRef aktif kembali saat template baru dibuka
  useEffect(() => {
    skipAutoSaveRef.current = true;
  }, [selectedTemplateId]);

  async function handleImportFile(file: File) {
    const initialJob: ImportJobState = {
      jobId: "",
      fileName: file.name,
      status: "queued",
      progress: 5,
      message: "Mengunggah file ke server...",
      logs: [
        {
          timestamp: new Date().toLocaleTimeString("id-ID", { hour12: false }),
          level: "info",
          message: `Mengunggah file ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`,
        },
      ],
    };

    setActiveImportJob(initialJob);
    setIsImportModalOpen(true);
    setIsImportWidgetVisible(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/inspection/templates/import", {
        method: "POST",
        body: formData,
      });

      const initData = await res.json();
      if (!res.ok) throw new Error(initData?.error || "Gagal memproses file");

      const jobId = initData.jobId;
      if (typeof window !== "undefined") {
        localStorage.setItem("kesling:last-import-job-id", jobId);
      }
      setActiveImportJob((prev) =>
        prev
          ? {
              ...prev,
              jobId,
              progress: 10,
              message: "File masuk antrean worker...",
              logs: [
                ...(prev.logs || []),
                {
                  timestamp: new Date().toLocaleTimeString("id-ID", { hour12: false }),
                  level: "info",
                  message: `Job ID ${jobId} terdaftar, menunggu giliran worker...`,
                },
              ],
            }
          : null,
      );

      const interval = setInterval(async () => {
        try {
          const checkRes = await fetch(`/api/inspection/templates/import?jobId=${jobId}`);
          if (!checkRes.ok) return;
          const statusData = await checkRes.json();

          setActiveImportJob((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              jobId,
              fileName: statusData.fileName || prev.fileName,
              status: statusData.status,
              progress: statusData.progress || 10,
              message: statusData.message || "",
              queuePosition: statusData.queuePosition,
              totalQueued: statusData.totalQueued,
              logs: statusData.logs?.length ? statusData.logs : prev.logs || [],
              result: statusData.result,
              error: statusData.error,
            };
          });

          if (statusData.status === "complete") {
            clearInterval(interval);
            toast.success(`Import selesai: ${(statusData.result?.fields || []).length} butir pemeriksaan terdeteksi`);
          } else if (statusData.status === "failed") {
            clearInterval(interval);
            toast.error(statusData.error || "Gagal memproses file di worker");
          }
        } catch (err) {
          console.error("Polling import error:", err);
        }
      }, 2000);
    } catch (error: any) {
      const errMsg = error?.message || "Gagal import file";
      setActiveImportJob((prev) =>
        prev
          ? {
              ...prev,
              status: "failed",
              progress: 100,
              message: "Gagal mengunggah file",
              error: errMsg,
              logs: [
                ...(prev.logs || []),
                {
                  timestamp: new Date().toLocaleTimeString("id-ID", { hour12: false }),
                  level: "error",
                  message: `Gagal: ${errMsg}`,
                },
              ],
            }
          : null,
      );
      toast.error(errMsg);
    }
  }

  function handleApplyImportResult(result: any) {
    setSelectedTemplateId(null);
    setIsCreating(true);
    setNama(result.nama || "");
    setDeskripsi(result.deskripsi || "");
    setSubCategoryId(null);
    setDataDasarCategoryId(null);
    setRumus("sum");
    setCustomFormula("");
    setThresholdOperator(">=");
    setThresholdValue(80);
    setThresholdPassText("Memenuhi Syarat");
    setThresholdFailText("Tidak Memenuhi Syarat");
    setDefaultYa(false);
    setParamDiperiksaId(null);
    setParamMsId(null);
    setParamTmsId(null);
    setFields(result.fields || []);
    setIsImportModalOpen(false);
    setIsImportWidgetVisible(false);
    setActiveImportJob(null);
    toast.success("Draft template berhasil diterapkan ke form builder!");
  }

  function loadContohJajananKeliling() {
    setIsCreating(true);
    setSelectedTemplateId(null);
    setNama("IKL Jajanan Keliling (Golongan A1 & A2)");
    setDeskripsi(
      "Inspeksi Kesehatan Lingkungan Jajanan Keliling Tempat Pengelolaan Pangan (TPP). Pertanyaan otomatis terbagi: butir umum (semua), butir khusus Golongan A1 (gerobak/pikulan), dan butir khusus Golongan A2 (kendaraan bermotor).",
    );
    setRumus("percentage");
    setCustomFormula("");
    setThresholdOperator(">=");
    setThresholdValue(80);
    setThresholdPassText("Memenuhi Syarat (MS)");
    setThresholdFailText("Tidak Memenuhi Syarat (TMS)");
    setDefaultYa(false);
    setFields([
      {
        pertanyaan: "Nama Tempat / Usaha Jajanan",
        tipe: "TEXT",
        isRequired: true,
        grup: "__META__",
        skor: 0,
        skorBenar: 0,
        skorSalah: 0,
        opsi: "",
        autoFill: "",
        targetGolongan: "ALL",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
      {
        pertanyaan: "Tipe Jajanan Keliling",
        tipe: "DROPDOWN",
        isRequired: true,
        grup: "__META__",
        skor: 0,
        skorBenar: 0,
        skorSalah: 0,
        opsi: "Golongan A1, Golongan A2",
        autoFill: "",
        targetGolongan: "ALL",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
      {
        pertanyaan: "Nama Pemeriksa",
        tipe: "TEXT",
        isRequired: true,
        grup: "__META__",
        skor: 0,
        skorBenar: 0,
        skorSalah: 0,
        opsi: "",
        autoFill: "USER_NAME",
        targetGolongan: "ALL",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
      {
        pertanyaan: "Wilayah Kerja Puskesmas",
        tipe: "TEXT",
        isRequired: true,
        grup: "__META__",
        skor: 0,
        skorBenar: 0,
        skorSalah: 0,
        opsi: "",
        autoFill: "USER_PUSKESMAS",
        targetGolongan: "ALL",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
      {
        pertanyaan: "Peralatan makan & masak bersih, utuh, dan disimpan di wadah tertutup",
        tipe: "BOOLEAN",
        isRequired: true,
        grup: "Sarana dan Peralatan",
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        autoFill: "",
        targetGolongan: "ALL",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
      {
        pertanyaan: "Khusus Golongan A1: Menggunakan gerobak dorong / pikulan bersih, kokoh, dan beratap peneduh",
        tipe: "BOOLEAN",
        isRequired: true,
        grup: "Sarana dan Peralatan",
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        autoFill: "",
        targetGolongan: "A1",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
      {
        pertanyaan:
          "Khusus Golongan A2: Menggunakan kendaraan bermotor (roda 3/4) dengan boks makanan tertutup higienis",
        tipe: "BOOLEAN",
        isRequired: true,
        grup: "Sarana dan Peralatan",
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        autoFill: "",
        targetGolongan: "A2",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
      {
        pertanyaan: "Khusus Golongan A2: Tersedia kotak penyimpanan makanan berpengatur suhu / insulasi (panas/dingin)",
        tipe: "BOOLEAN",
        isRequired: true,
        grup: "Sarana dan Peralatan",
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        autoFill: "",
        targetGolongan: "A2",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
      {
        pertanyaan: "Tersedia tempat sampah tertutup yang dilapisi kantong plastik pada unit keliling",
        tipe: "BOOLEAN",
        isRequired: true,
        grup: "Sarana dan Peralatan",
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        autoFill: "",
        targetGolongan: "ALL",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
      {
        pertanyaan: "Air bersih tersedia dalam jumlah cukup untuk keperluan pengolahan dan pencucian",
        tipe: "BOOLEAN",
        isRequired: true,
        grup: "Air Bersih dan Sanitasi",
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        autoFill: "",
        targetGolongan: "ALL",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
      {
        pertanyaan: "Khusus Golongan A1: Wadah penampungan air tertutup dilengkapi kran bersih dan tidak bocor",
        tipe: "BOOLEAN",
        isRequired: true,
        grup: "Air Bersih dan Sanitasi",
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        autoFill: "",
        targetGolongan: "A1",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
      {
        pertanyaan: "Khusus Golongan A2: Tersedia wastafel / bak cuci portabel dengan kran dan sabun cuci tangan cair",
        tipe: "BOOLEAN",
        isRequired: true,
        grup: "Air Bersih dan Sanitasi",
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        autoFill: "",
        targetGolongan: "A2",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
      {
        pertanyaan: "Penjamah pangan memakai celemek bersih dan penutup rambut/topi saat melayani pembeli",
        tipe: "BOOLEAN",
        isRequired: true,
        grup: "Higiene Penjamah Makanan",
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        autoFill: "",
        targetGolongan: "ALL",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
      {
        pertanyaan: "Menggunakan sarung tangan atau penjepit makanan saat mengambil makanan matang siap saji",
        tipe: "BOOLEAN",
        isRequired: true,
        grup: "Higiene Penjamah Makanan",
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        autoFill: "",
        targetGolongan: "ALL",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
    ]);
    toast.success("Contoh Template Jajanan Keliling (A1 & A2) berhasil dimuat!");
  }

  function addField(grup?: string) {
    setFields([
      ...fields,
      {
        pertanyaan: "",
        tipe: "BOOLEAN",
        isRequired: false,
        grup: grup || "",
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        isDisabled: false,
        dependsOn: null,
        targetGolongan: "ALL",
        allowNA: false,
        autoFill: "",
      },
    ]);
  }

  function addFieldAt(grup: string, afterIndex: number) {
    const newField = {
      pertanyaan: "",
      tipe: "BOOLEAN",
      isRequired: false,
      grup,
      skor: 1,
      skorBenar: 1,
      skorSalah: 0,
      opsi: "",
      isDisabled: false,
      dependsOn: null,
      allowNA: false,
      autoFill: "",
    };
    const next = [...fields];
    next.splice(afterIndex + 1, 0, newField);
    setFields(next);
  }

  function addMetadataField(pertanyaan = "", tipe = "TEXT", opsi = "", autoFill = "") {
    const newField = {
      pertanyaan,
      tipe,
      isRequired: true,
      grup: "__META__",
      skor: 0,
      skorBenar: 0,
      skorSalah: 0,
      opsi,
      isDisabled: false,
      dependsOn: null,
      targetGolongan: "ALL",
      allowNA: false,
      autoFill,
    };
    let lastMetaIdx = -1;
    for (let i = fields.length - 1; i >= 0; i--) {
      if (fields[i].grup === "__META__") {
        lastMetaIdx = i;
        break;
      }
    }
    if (lastMetaIdx >= 0) {
      const next = [...fields];
      next.splice(lastMetaIdx + 1, 0, newField);
      setFields(next);
    } else {
      setFields([newField, ...fields]);
    }
    toast.success(pertanyaan ? `Metadata "${pertanyaan}" ditambahkan` : "Field metadata ditambahkan");
  }

  // Inline add form state: { type: "bagian" } untuk bagian baru di bawah list,
  // { type: "sub", area } untuk subbagian di bawah grup tertentu
  const [addingInline, setAddingInline] = useState<{ type: "bagian" } | { type: "sub"; area: string } | null>(null);
  const [inlineName, setInlineName] = useState("");

  function submitInline() {
    if (!addingInline) return;
    const name = inlineName.trim();
    if (!name) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (addingInline.type === "bagian") {
      if (fields.some((f) => f.grup === name)) {
        toast.error(`Bagian "${name}" sudah ada`);
        return;
      }
      addField(name);
    } else {
      const grup = `${addingInline.area.trim()} — ${name}`;
      if (fields.some((f) => f.grup === grup)) {
        toast.error("Subbagian sudah ada");
        return;
      }
      let lastIdx = -1;
      fields.forEach((f, i) => {
        if (f.grup === addingInline.area || f.grup?.startsWith(`${addingInline.area} — `)) lastIdx = i;
      });
      addFieldAt(grup, lastIdx);
    }
    setAddingInline(null);
    setInlineName("");
  }

  function _addGrup(name: string) {
    if (!name.trim()) {
      toast.error("Nama grup wajib diisi");
      return;
    }
    if (fields.some((f) => f.grup === name.trim())) {
      toast.error(`Bagian "${name.trim()}" sudah ada`);
      return;
    }
    addField(name.trim());
  }

  function addSubbagian(area: string) {
    setAddingInline({ type: "sub", area });
    setInlineName("");
  }

  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");

  function deleteGrup(grup: string) {
    setFields(fields.filter((f) => f.grup !== grup));
    toast.success("Grup dihapus");
  }

  function updateField(index: number, key: string, value: any) {
    setFields(fields.map((f, i) => (i === index ? { ...f, [key]: value } : f)));
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index));
  }

  function moveField(index: number, direction: "up" | "down") {
    const next = [...fields];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    const currentItem = next[index];
    const targetItem = next[target];
    if (currentItem.grup !== targetItem.grup) {
      next[index] = { ...currentItem, grup: targetItem.grup };
    }
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next.map((f, i) => ({ ...f, urutan: i + 1 })));
  }

  // ---- Drag & Drop Engine ----
  const [dragState, setDragState] = useState<{ type: "field" | "group"; index?: number; grup?: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dragArmedRef = useRef<string | null>(null);

  function moveFieldTo(from: number, to: number) {
    if (from === to) return;
    const item = fields[from];
    const targetItem = fields[to];
    if (!item || !targetItem) return;
    const srcGrup = item.grup || "Tanpa Grup";
    const tgtGrup = targetItem.grup || "Tanpa Grup";

    // Adopsi grup tujuan jika berbeda (otomatis pindah bagian/sub/metadata)
    const updatedItem = { ...item, grup: tgtGrup };
    const next = [...fields];
    next.splice(from, 1);
    // Setelah item sumber dihapus: saat turun (from < to) target bergeser -1 agar mendarat SEBELUM target
    const insertAt = from < to ? to - 1 : to;
    next.splice(insertAt, 0, updatedItem);
    setFields(next.map((f, i) => ({ ...f, urutan: i + 1 })));
    if (srcGrup !== tgtGrup) {
      toast.success(`Butir dipindahkan ke "${tgtGrup === "__META__" ? "Metadata" : tgtGrup}"`);
    }
  }

  function moveFieldToGroup(from: number, targetGrup: string) {
    const item = fields[from];
    if (!item) return;
    const srcGrup = item.grup || "Tanpa Grup";
    if (srcGrup === targetGrup) return;

    const updatedItem = { ...item, grup: targetGrup };
    const remaining = fields.filter((_, i) => i !== from);
    let insertAt = remaining.length;
    for (let i = 0; i < remaining.length; i++) {
      if ((remaining[i].grup || "Tanpa Grup") === targetGrup) {
        insertAt = i;
        break;
      }
    }
    remaining.splice(insertAt, 0, updatedItem);
    setFields(remaining.map((f, i) => ({ ...f, urutan: i + 1 })));
    toast.success(`Butir dipindahkan ke "${targetGrup === "__META__" ? "Metadata" : targetGrup}"`);
  }

  function convertFieldToBagian(fromIndex: number) {
    const item = fields[fromIndex];
    if (!item) return;
    const groupName = (item.pertanyaan || "BAGIAN BARU").trim().toUpperCase();
    if (fields.some((f) => f.grup === groupName)) {
      toast.error(`Bagian "${groupName}" sudah ada`);
      return;
    }
    const next = [...fields];
    next[fromIndex] = {
      ...item,
      grup: groupName,
      pertanyaan: "",
      tipe: "BOOLEAN",
    };
    setFields(next.map((f, i) => ({ ...f, urutan: i + 1 })));
    toast.success(`Butir dijadikan Bagian Utama "${groupName}"`);
  }

  function convertFieldToSubbagian(fromIndex: number, parentArea: string) {
    const item = fields[fromIndex];
    if (!item) return;
    const subName = (item.pertanyaan || "Subbagian Baru").trim();
    const newGrup = `${parentArea} — ${subName}`;
    if (fields.some((f) => f.grup === newGrup)) {
      toast.error(`Subbagian "${subName}" sudah ada di ${parentArea}`);
      return;
    }
    const next = [...fields];
    next[fromIndex] = {
      ...item,
      grup: newGrup,
      pertanyaan: "",
      tipe: "BOOLEAN",
    };
    setFields(next.map((f, i) => ({ ...f, urutan: i + 1 })));
    toast.success(`Butir dijadikan Subbagian di bawah "${parentArea}"`);
  }

  function promoteSubToBagian(grup: string) {
    if (!grup.includes(" — ")) return;
    const parts = grup.split(" — ");
    const subName = parts.slice(1).join(" — ").trim().toUpperCase();
    if (!subName) return;
    setFields((prev) => prev.map((f) => ((f.grup || "Tanpa Grup") === grup ? { ...f, grup: subName } : f)));
    toast.success(`Subbagian diubah menjadi Bagian Utama "${subName}"`);
  }

  function demoteBagianToSub(grup: string, targetParentArea: string) {
    if (grup === targetParentArea || grup.includes(" — ")) return;
    const newGrup = `${targetParentArea} — ${grup}`;
    setFields((prev) => prev.map((f) => ((f.grup || "Tanpa Grup") === grup ? { ...f, grup: newGrup } : f)));
    toast.success(`Bagian "${grup}" diubah menjadi Subbagian di bawah "${targetParentArea}"`);
  }

  function moveGroupTo(fromGrup: string, toGrup: string) {
    if (fromGrup === toGrup) return;
    const groupKeys = groupedFields.map((g) => g.grup);
    const fromIdx = groupKeys.indexOf(fromGrup);
    const toIdx = groupKeys.indexOf(toGrup);
    if (fromIdx < 0 || toIdx < 0) return;
    const newKeys = groupKeys.filter((k) => k !== fromGrup);
    const adjustedTo = newKeys.indexOf(toGrup);
    newKeys.splice(adjustedTo, 0, fromGrup);

    const nextFields: any[] = [];
    newKeys.forEach((k) => {
      nextFields.push(...fields.filter((f) => (f.grup || "Tanpa Grup") === k));
    });
    const handled = new Set(newKeys);
    fields.forEach((f) => {
      const g = f.grup || "Tanpa Grup";
      if (!handled.has(g)) nextFields.push(f);
    });
    setFields(nextFields.map((f, i) => ({ ...f, urutan: i + 1 })));
  }

  function resetDrag() {
    setDragState(null);
    setDropTarget(null);
    dragArmedRef.current = null;
  }

  function moveGroup(grupName: string, direction: "up" | "down") {
    const groupKeys = groupedFields.map((g) => g.grup);
    const curIdx = groupKeys.indexOf(grupName);
    if (curIdx < 0) return;
    const targetIdx = direction === "up" ? curIdx - 1 : curIdx + 1;
    if (targetIdx < 0 || targetIdx >= groupKeys.length) return;

    const newKeys = [...groupKeys];
    [newKeys[curIdx], newKeys[targetIdx]] = [newKeys[targetIdx], newKeys[curIdx]];

    const nextFields: any[] = [];
    newKeys.forEach((k) => {
      const matching = fields.filter((f) => (f.grup || "Tanpa Grup") === k);
      nextFields.push(...matching);
    });
    const handled = new Set(newKeys);
    fields.forEach((f) => {
      const g = f.grup || "Tanpa Grup";
      if (!handled.has(g)) nextFields.push(f);
    });

    setFields(nextFields.map((f, i) => ({ ...f, urutan: i + 1 })));
    toast.success(direction === "up" ? "Grup digeser ke atas" : "Grup digeser ke bawah");
  }

  function handleRenameGroup(oldGrup: string, newGrup: string) {
    const trimmed = newGrup.trim();
    if (!trimmed || trimmed === oldGrup) {
      setEditingGroupKey(null);
      return;
    }
    const isSub = oldGrup.includes(" — ");
    if (isSub) {
      setFields((prev) => prev.map((f) => ((f.grup || "Tanpa Grup") === oldGrup ? { ...f, grup: trimmed } : f)));
      toast.success(`Subbagian diubah menjadi "${trimmed}"`);
    } else {
      setFields((prev) =>
        prev.map((f) => {
          const g = f.grup || "Tanpa Grup";
          if (g === oldGrup) return { ...f, grup: trimmed };
          if (g.startsWith(`${oldGrup} — `)) {
            return { ...f, grup: `${trimmed} — ${g.slice(oldGrup.length + 3)}` };
          }
          return f;
        }),
      );
      toast.success(`Bagian diubah menjadi "${trimmed}"`);
    }
    setEditingGroupKey(null);
  }

  const groupedFields = useMemo(() => {
    const groupOrder: string[] = [];
    const groupMap = new Map<string, { field: any; index: number }[]>();
    fields.forEach((f, i) => {
      const g = f.grup || "Tanpa Grup";
      if (!groupMap.has(g)) {
        groupMap.set(g, []);
        groupOrder.push(g);
      }
      groupMap.get(g)?.push({ field: f, index: i });
    });

    const areaIndexes = new Map<string, number>();
    const subIndexes = new Map<string, number>();

    return groupOrder.map((grup) => {
      const items = groupMap.get(grup) || [];
      const delimiterIndex = grup.indexOf(" — ");
      const area = delimiterIndex >= 0 ? grup.slice(0, delimiterIndex).trim() : grup;
      const subbagian = delimiterIndex >= 0 ? grup.slice(delimiterIndex + 3).trim() || null : null;

      if (grup !== "__META__" && !areaIndexes.has(area)) {
        areaIndexes.set(area, areaIndexes.size + 1);
      }
      let subIndex: number | null = null;
      if (subbagian) {
        const key = `${area}::${subbagian}`;
        if (!subIndexes.has(key)) {
          const countInArea = [...subIndexes.keys()].filter((k) => k.startsWith(`${area}::`)).length;
          subIndexes.set(key, countInArea + 1);
        }
        subIndex = subIndexes.get(key) ?? null;
      }

      return {
        grup,
        area,
        subbagian,
        areaIndex: areaIndexes.get(area) ?? 1,
        subIndex,
        fields: items,
      };
    });
  }, [fields]);

  const allAvailableGroupOptions = useMemo(() => {
    const list: string[] = [];
    groupedFields.forEach((g) => {
      list.push(g.grup);
    });
    return list;
  }, [groupedFields]);

  const mainAreaOptions = useMemo(() => {
    const areas = new Set<string>();
    groupedFields.forEach((g) => {
      if (g.grup !== "__META__" && g.area) areas.add(g.area);
    });
    return Array.from(areas);
  }, [groupedFields]);

  function toggleAllGroups(collapse: boolean) {
    if (collapse) {
      setCollapsedGroups(new Set(groupedFields.map((g) => g.grup)));
    } else {
      setCollapsedGroups(new Set());
    }
  }

  const totalSkor = useMemo(() => fields.reduce((s, f) => s + (f.skor ?? 0), 0), [fields]);
  const rumusLabel = RUMUS_OPTIONS.find((r) => r.value === rumus)?.label || rumus;

  const availableSasaranOptions = useMemo(() => {
    const metaDropdowns = fields.filter((f) => f.grup === "__META__" && (f.tipe === "DROPDOWN" || f.tipe === "SELECT"));
    const targetMeta =
      metaDropdowns.find((f) => {
        const q = (f.pertanyaan || "").toLowerCase();
        return (
          q.includes("golongan") ||
          q.includes("tipe") ||
          q.includes("kategori") ||
          q.includes("jenis") ||
          q.includes("sasaran")
        );
      }) || metaDropdowns[0];

    if (targetMeta) {
      const parsed = parseDropdownOptions(targetMeta.opsi || targetMeta.options);
      if (parsed.length > 0) return parsed;
    }
    return ["Golongan A1", "Golongan A2"];
  }, [fields]);

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  function toggleGroup(grup: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(grup)) next.delete(grup);
      else next.add(grup);
      return next;
    });
  }

  function scrollToGroup(grup: string) {
    setActiveGroup(grup);
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.delete(grup);
      return next;
    });
    requestAnimationFrame(() => {
      document.getElementById(`grup-${CSS.escape(grup)}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const selectedLaporanCategory = useMemo(() => {
    if (!subCategoryId || !Array.isArray(categories)) return null;
    return categories.find((c: any) => c.subCategories?.some((sc: any) => sc.id === subCategoryId));
  }, [categories, subCategoryId]);

  const selectedSubCategory = useMemo(() => {
    if (!selectedLaporanCategory || !subCategoryId) return null;
    return selectedLaporanCategory.subCategories?.find((sc: any) => sc.id === subCategoryId);
  }, [selectedLaporanCategory, subCategoryId]);

  const availableParameters = useMemo(() => {
    return selectedLaporanCategory?.parameters || [];
  }, [selectedLaporanCategory]);

  const mappedParamCount = useMemo(() => {
    return [paramDiperiksaId, paramMsId, paramTmsId].filter(Boolean).length;
  }, [paramDiperiksaId, paramMsId, paramTmsId]);

  function handleAutoMatchParameters() {
    if (!availableParameters || availableParameters.length === 0) {
      toast.error("Tidak ada parameter laporan pada kategori ini");
      return;
    }
    const foundDiperiksa = availableParameters.find(
      (p: any) =>
        p.code === "diperiksa" ||
        p.code === "diperiksaJumlah" ||
        (p.nama?.toLowerCase().includes("diperiksa") && !p.nama?.toLowerCase().includes("kk")),
    );
    const foundMs = availableParameters.find(
      (p: any) =>
        p.code === "laikJumlah" ||
        p.code === "diperiksaMs" ||
        p.nama?.toLowerCase().includes("ms") ||
        p.nama?.toLowerCase().includes("laik") ||
        p.nama?.toLowerCase() === "memenuhi syarat",
    );
    const foundTms = availableParameters.find(
      (p: any) =>
        p.code === "diperiksaTms" ||
        p.nama?.toLowerCase().includes("tms") ||
        p.nama?.toLowerCase().includes("tidak memenuhi"),
    );

    let matched = 0;
    if (foundDiperiksa) {
      setParamDiperiksaId(foundDiperiksa.id);
      matched++;
    }
    if (foundMs) {
      setParamMsId(foundMs.id);
      matched++;
    }
    if (foundTms) {
      setParamTmsId(foundTms.id);
      matched++;
    }

    if (matched > 0) {
      toast.success(`Berhasil mencocokkan ${matched} parameter agregasi`);
    } else {
      toast.info("Parameter otomatis tidak ditemukan, silakan pilih manual");
    }
  }

  const demoSkorTerisi = useMemo(() => {
    const filled = fields.filter((f) => f.skor > 0);
    if (filled.length === 0) return 0;
    return Math.round(filled.reduce((s, f) => s + (f.skor ?? 0), 0) * 0.7);
  }, [fields]);
  const demoPersentase = totalSkor > 0 ? Math.round((demoSkorTerisi / totalSkor) * 100) : 0;

  if ((session?.user as any)?.role === "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-3">
        <ShieldAlert className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
        <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Akses Ditolak</p>
        <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Halaman ini hanya untuk Operator / Puskesmas</p>
      </div>
    );
  }

  if (!selectedTemplateId && !isCreating) {
    return (
      <div className="w-full mx-auto pb-4 fade-in">
        {/* ── HERO ── */}
        <div className="relative overflow-hidden bg-[#0C1B16] text-white rounded-b-3xl">
          <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#00A876] opacity-[0.12]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#123527_0%,transparent_55%)]" />
          <div className="relative z-10 px-4 sm:px-8 py-6 sm:py-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-2">Builder</p>
              <h1 className="text-[26px] sm:text-[30px] font-black tracking-[-0.03em] leading-tight sm:leading-none">
                Form Pemeriksaan
              </h1>
              <p className="text-[12px] sm:text-[13px] font-medium text-white/50 mt-1.5">
                {templates.length} template tersedia
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                title="Lihat status antrean & riwayat upload"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white/[0.08] border border-white/15 text-white/80 text-[12px] font-extrabold hover:bg-white/15 hover:text-white transition"
              >
                <History className="w-3.5 h-3.5 text-[#7CF5CE]" />
                <span>Status & Antrean</span>
                {(activeImportJob?.status === "processing" || activeImportJob?.status === "queued") && (
                  <span className="flex h-2 w-2 relative ml-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
              </button>
              <label className="inline-flex items-center gap-2 h-10 px-4 sm:px-5 rounded-full bg-white/[0.08] border border-white/15 text-white/80 text-[12px] font-extrabold hover:bg-white/15 hover:text-white transition cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Import
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  disabled={activeImportJob?.status === "processing" || activeImportJob?.status === "queued"}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                onClick={() => {
                  setSelectedTemplateId(null);
                  setIsCreating(true);
                  setNama("");
                  setDeskripsi("");
                  setSubCategoryId(null);
                  setDataDasarCategoryId(null);
                  setFields([]);
                  setRumus("sum");
                  setCustomFormula("");
                  setThresholdOperator(">=");
                  setThresholdValue(80);
                  setThresholdPassText("Memenuhi Syarat");
                  setThresholdFailText("Tidak Memenuhi Syarat");
                  setDefaultYa(false);
                  setParamDiperiksaId(null);
                  setParamMsId(null);
                  setParamTmsId(null);
                }}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#BEF264] text-[#06281E] text-[12px] font-extrabold hover:brightness-95 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Buat Baru
              </button>
              <button
                type="button"
                onClick={loadContohJajananKeliling}
                title="Muat contoh lengkap formulir Jajanan Keliling Golongan A1 & A2"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-amber-500/20 border border-amber-500/35 text-amber-200 text-[12px] font-extrabold hover:bg-amber-500/30 transition"
              >
                🍿 Contoh IKL Jajanan (A1 & A2)
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="pt-6 flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[72px] rounded-2xl bg-[hsl(var(--muted))]/20 animate-pulse" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="mt-6 border border-dashed border-[hsl(var(--border))] rounded-xl p-10 flex flex-col items-center justify-center text-center">
            <FileText className="w-8 h-8 text-[hsl(var(--muted-foreground))]/40 mb-3" />
            <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Belum Ada Template</p>
            <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">Import PDF/Word atau buat manual.</p>
          </div>
        ) : (
          <div className="pt-6">
            <h3 className="text-[10px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.22em] px-1 pb-2">
              Daftar Template
            </h3>
            <div className="flex flex-col gap-2">
              {templates.map((tpl: any) => {
                const fieldCount = tpl.fields?.filter((f: any) => f.grup !== "__META__").length || 0;
                const grupCount = new Set(
                  (tpl.fields || []).filter((f: any) => f.grup !== "__META__").map((f: any) => f.grup || ""),
                ).size;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      setSelectedTemplateId(tpl.id);
                      setIsCreating(false);
                      setNama(tpl.nama);
                      setDeskripsi(tpl.deskripsi || "");
                      setRumus(tpl.config?.rumus || "sum");
                      setCustomFormula(tpl.config?.customFormula || "");
                      setThresholdOperator(tpl.config?.thresholdOperator || ">=");
                      setThresholdValue(tpl.config?.thresholdValue ?? 80);
                      setThresholdPassText(tpl.config?.thresholdPassText || "Memenuhi Syarat");
                      setThresholdFailText(tpl.config?.thresholdFailText || "Tidak Memenuhi Syarat");
                      setDefaultYa(tpl.config?.defaultYa ?? false);
                      setParamDiperiksaId(tpl.config?.agregasi?.paramDiperiksaId ?? null);
                      setParamMsId(tpl.config?.agregasi?.paramMsId ?? null);
                      setParamTmsId(tpl.config?.agregasi?.paramTmsId ?? null);
                      setFields(
                        (tpl.fields || []).map((f: any) => {
                          let opsiStr = "";
                          if (f.options) {
                            if (typeof f.options === "string") {
                              try {
                                const parsed = JSON.parse(f.options);
                                opsiStr = Array.isArray(parsed) ? parsed.join(", ") : f.options;
                              } catch {
                                opsiStr = f.options;
                              }
                            } else if (Array.isArray(f.options)) {
                              opsiStr = f.options.join(", ");
                            }
                          } else if (f.opsi) {
                            opsiStr = f.opsi;
                          }
                          return {
                            ...f,
                            opsi: opsiStr,
                            autoFill: f.config?.autoFill || f.autoFill || "",
                            isDisabled: f.config?.isDisabled ?? f.isDisabled ?? false,
                            dependsOn: f.config?.dependsOn || f.dependsOn || null,
                            targetGolongan: f.config?.targetGolongan || f.targetGolongan || "ALL",
                            allowNA: f.config?.allowNA ?? f.allowNA ?? false,
                            skor: f.config?.skor ?? f.skor ?? 0,
                            skorBenar: f.config?.skorBenar ?? f.skorBenar ?? 1,
                            skorSalah: f.config?.skorSalah ?? f.skorSalah ?? 0,
                          };
                        }),
                      );
                      setSubCategoryId(tpl.subCategoryId ?? null);
                      setDataDasarCategoryId(tpl.config?.dataDasarCategoryId ?? null);
                    }}
                    className="group flex items-stretch rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[#00A876]/40 transition-colors overflow-hidden text-left"
                  >
                    <div className="w-1 shrink-0 bg-[#00A876]" />
                    <div className="flex-1 flex items-center gap-3 sm:gap-4 px-3.5 sm:px-5 py-3 sm:py-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#00A876]/10 text-[#00A876] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] sm:text-[13px] font-extrabold text-[hsl(var(--foreground))] truncate">
                          {tpl.nama}
                        </h4>
                        <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                          {tpl.subCategory ? tpl.subCategory.nama : "Tanpa sub kategori"}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2.5 sm:gap-4">
                        <div className="text-center">
                          <div className="text-[14px] sm:text-[16px] font-black tabular-nums leading-none">
                            {fieldCount}
                          </div>
                          <div className="text-[8px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mt-0.5">
                            Butir
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[14px] sm:text-[16px] font-black tabular-nums leading-none text-[#00A876]">
                            {grupCount}
                          </div>
                          <div className="text-[8px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mt-0.5">
                            Grup
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                `Yakin ingin menghapus template "${tpl.nama}"? Tindakan ini tidak dapat dibatalkan.`,
                              )
                            ) {
                              deleteMutation.mutate(tpl.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          title="Hapus template"
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--muted-foreground))] group-hover:text-[#00A876] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <ImportInspectionModal
          open={isImportModalOpen}
          job={activeImportJob}
          onClose={() => setIsImportModalOpen(false)}
          onMinimize={() => {
            setIsImportModalOpen(false);
            if (activeImportJob) setIsImportWidgetVisible(true);
          }}
          onApplyResult={handleApplyImportResult}
        />

        <ImportHistoryModal
          open={isHistoryModalOpen}
          activeJob={activeImportJob}
          onClose={() => setIsHistoryModalOpen(false)}
          onOpenTerminal={handleOpenTerminalFromHistory}
          onApplyResult={handleApplyImportResult}
        />

        {isImportWidgetVisible && (
          <ImportFloatingWidget
            job={activeImportJob}
            onOpenModal={() => {
              setIsImportModalOpen(true);
              setIsImportWidgetVisible(false);
            }}
            onDismiss={() => {
              setIsImportWidgetVisible(false);
              if (activeImportJob?.status === "complete" || activeImportJob?.status === "failed") {
                setActiveImportJob(null);
              }
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full pb-8 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => {
              setSelectedTemplateId(null);
              setIsCreating(false);
            }}
            className="flex items-center gap-1.5 sm:gap-2 text-[13px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors shrink-0"
          >
            <ArrowLeft className="h-5 w-5" /> Kembali
          </button>
          <div className="h-6 w-px bg-[hsl(var(--border))] shrink-0" />
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Nama Template..."
            className="flex-1 text-[18px] sm:text-[22px] font-black text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/40 outline-none bg-transparent tracking-tight min-w-0"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {/* Auto-save status */}
          {selectedTemplateId && !isCreating && (
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-full border transition-colors ${
                autoSaveState === "saved"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : autoSaveState === "saving"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : autoSaveState === "error"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : autoSaveState === "dirty"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]"
              }`}
              title="Perubahan tersimpan otomatis setelah 2 detik"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  autoSaveState === "saved"
                    ? "bg-green-500"
                    : autoSaveState === "saving"
                      ? "bg-blue-500 animate-pulse"
                      : autoSaveState === "error"
                        ? "bg-red-500"
                        : autoSaveState === "dirty"
                          ? "bg-amber-500"
                          : "bg-[hsl(var(--muted-foreground))]"
                }`}
              />
              {autoSaveState === "saved"
                ? "Tersimpan"
                : autoSaveState === "saving"
                  ? "Menyimpan..."
                  : autoSaveState === "error"
                    ? "Gagal — coba Simpan"
                    : autoSaveState === "dirty"
                      ? "Perubahan..."
                      : "Auto-simpan aktif"}
            </span>
          )}
          <button
            type="button"
            onClick={loadContohJajananKeliling}
            title="Muat contoh lengkap formulir Jajanan Keliling Golongan A1 & A2"
            className="flex items-center justify-center gap-1.5 h-11 px-3.5 text-[11px] font-bold border-2 border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-colors rounded-lg flex-1 sm:flex-initial"
          >
            🍿 Contoh A1 / A2
          </button>
          {selectedTemplateId && (
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(`Yakin ingin menghapus template "${nama || "ini"}"? Tindakan ini tidak dapat dibatalkan.`)
                ) {
                  deleteMutation.mutate(selectedTemplateId, {
                    onSuccess: () => {
                      setSelectedTemplateId(null);
                      setIsCreating(false);
                    },
                  });
                }
              }}
              disabled={deleteMutation.isPending}
              title="Hapus template ini"
              className="flex items-center justify-center gap-1.5 h-11 px-3.5 text-[12px] font-bold border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors rounded-lg shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Hapus</span>
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={createMutation.isPending}
            className="flex items-center justify-center gap-2 h-11 px-5 text-[12px] font-bold bg-[hsl(var(--foreground))] text-[hsl(var(--card))] hover:opacity-80 disabled:opacity-40 transition-colors rounded-lg flex-1 sm:flex-initial"
          >
            <Check className="w-4 h-4" />
            {createMutation.isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">
        {/* Left Panel: Config */}
        <div className="space-y-4">
          {/* Deskripsi */}
          <div className="border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b-2 border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
              <span className="text-[12px] font-bold">Deskripsi Laporan</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em] mb-2 block">
                  Deskripsi
                </label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  rows={2}
                  className="w-full text-[13px] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/40 border-2 border-[hsl(var(--border))] px-3 py-2.5 outline-none focus:border-[hsl(var(--accent))] bg-[hsl(var(--card))] resize-none rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em] mb-2 block">
                  Kategori Data Dasar
                </label>
                <select
                  value={dataDasarCategoryId || ""}
                  onChange={(e) => setDataDasarCategoryId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-10 px-3 text-[13px] font-medium border-2 border-[hsl(var(--border))] outline-none bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]/30 transition-colors cursor-pointer appearance-none rounded-lg"
                >
                  <option value="">— Pilih Kategori —</option>
                  {categories
                    .filter((c: any) => (c.parameters || []).some((p: any) => p.isBaseline))
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.nama}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-2">
                  Sumber data sasaran untuk form ini
                </p>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em] mb-2 block">
                  Sub Kategori Laporan
                </label>
                <select
                  value={subCategoryId || ""}
                  onChange={(e) => setSubCategoryId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-10 px-3 text-[13px] font-medium border-2 border-[hsl(var(--border))] outline-none bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]/30 transition-colors cursor-pointer appearance-none rounded-lg"
                >
                  <option value="">— Pilih Sub Kategori —</option>
                  {categories.map((cat: any) =>
                    (cat.subCategories || []).map((sub: any) => (
                      <option key={sub.id} value={sub.id}>
                        {cat.icon} {cat.nama} — {sub.nama}
                      </option>
                    )),
                  )}
                </select>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-2">
                  Referensi input untuk agregasi laporan
                </p>
              </div>
            </div>
          </div>

          {/* Rumus Penilaian */}
          <div className="border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-3 border-b-2 border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
              <span className="text-[12px] font-bold">Rumus Penilaian</span>
              <span className="ml-auto text-[11px] font-bold text-[hsl(var(--muted-foreground))]">{rumusLabel}</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em] mb-2 block">
                  Metode
                </label>
                <select
                  value={rumus}
                  onChange={(e) => setRumus(e.target.value)}
                  className="w-full h-10 px-3 text-[13px] font-medium border-2 border-[hsl(var(--border))] outline-none bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]/30 transition-colors cursor-pointer appearance-none rounded-lg"
                >
                  {RUMUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.desc}
                    </option>
                  ))}
                </select>
              </div>
              {rumus === "custom" && (
                <div>
                  <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em] mb-2 block">
                    Rumus Kustom
                  </label>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {["SUM()", "AVG()", "MIN()", "MAX()", "COUNT()", "✓", "✗"].map((fn) => (
                      <button
                        key={fn}
                        onClick={() => setCustomFormula((prev) => `${prev}${fn}`)}
                        className="text-[10px] font-bold px-2.5 py-1 border-2 border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors rounded-md"
                      >
                        {fn === "✓" ? "✓ (Benar)" : fn === "✗" ? "✗ (Salah)" : fn}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={customFormula}
                    onChange={(e) => setCustomFormula(e.target.value)}
                    placeholder="(SUM(✓) * 2) / (COUNT() + 1)"
                    rows={2}
                    className="w-full text-[13px] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/40 border-2 border-[hsl(var(--border))] px-3 py-2.5 outline-none focus:border-[hsl(var(--accent))] bg-[hsl(var(--card))] resize-none font-mono rounded-lg"
                  />
                </div>
              )}
              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-[32px] font-black text-[hsl(var(--foreground))] tabular-nums leading-none">
                  {demoSkorTerisi}
                </span>
                <span className="text-[13px] text-[hsl(var(--muted-foreground))]">/ {totalSkor}</span>
                <span className="text-[13px] font-bold text-[hsl(var(--accent))]">{demoPersentase}%</span>
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {RUMUS_OPTIONS.find((r) => r.value === rumus)?.desc}
              </p>
            </div>
          </div>

          {/* Ambang Batas */}
          <div className="border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b-2 border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
              <span className="text-[12px] font-bold">Ambang Batas Kelulusan</span>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))]">Jika Akhir</span>
                <select
                  value={thresholdOperator}
                  onChange={(e) => setThresholdOperator(e.target.value)}
                  className="h-9 px-3 text-[12px] font-bold border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] outline-none rounded-lg"
                >
                  <option value=">=">&ge;</option>
                  <option value=">">&gt;</option>
                  <option value="<=">&le;</option>
                  <option value="<">&lt;</option>
                </select>
                <input
                  type="number"
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(parseInt(e.target.value, 10) || 0)}
                  className="w-20 h-9 px-3 text-[12px] font-bold border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] outline-none rounded-lg"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={thresholdPassText}
                  onChange={(e) => setThresholdPassText(e.target.value)}
                  placeholder="Teks lulus"
                  className="w-full h-10 px-3 text-[12px] text-green-700 font-bold bg-green-50 border-2 border-green-200 outline-none focus:border-green-400 rounded-lg"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={thresholdFailText}
                  onChange={(e) => setThresholdFailText(e.target.value)}
                  placeholder="Teks tidak lulus"
                  className="w-full h-10 px-3 text-[12px] text-red-700 font-bold bg-red-50 border-2 border-red-200 outline-none focus:border-red-400 rounded-lg"
                />
              </div>
              {/* Mode penilaian cepat */}
              <button
                type="button"
                onClick={() => setDefaultYa(!defaultYa)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-colors ${
                  defaultYa
                    ? "border-[#00A876]/40 bg-[#00A876]/[0.06]"
                    : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/40"
                }`}
              >
                <span
                  className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${
                    defaultYa ? "bg-[#00A876]" : "bg-[hsl(var(--muted))]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                      defaultYa ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-bold">Mode Penilaian Cepat</span>
                  <span className="block text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    Semua butir default Ya — operator cukup tandai yang negatif
                  </span>
                </span>
              </button>
            </div>
          </div>

          {/* Agregasi Laporan Bulanan */}
          <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
              <div className="flex items-center gap-2 min-w-0">
                <BarChart3 className="w-4 h-4 text-[#00A876] shrink-0" />
                <span className="text-[12px] font-bold truncate">Agregasi Laporan Bulanan</span>
              </div>
              {subCategoryId &&
                (mappedParamCount === 3 ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                    ✓ 3/3 Terpetakan
                  </span>
                ) : mappedParamCount > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                    {mappedParamCount}/3 Terpetakan
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] shrink-0">
                    Belum Terpetakan
                  </span>
                ))}
            </div>

            <div className="p-4 sm:p-5 space-y-3.5">
              {!subCategoryId ? (
                <div className="py-4 px-3 text-center space-y-2 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <p className="text-[12px] font-bold text-[hsl(var(--foreground))]">Sub Kategori Belum Dipilih</p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed max-w-[280px] mx-auto">
                    Pilih <strong>Sub Kategori Laporan</strong> pada form di atas terlebih dahulu untuk memetakan
                    parameter agregasi bulanan.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] text-[11px]">
                    <div className="min-w-0">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                        Target Laporan
                      </span>
                      <span className="font-bold text-[hsl(var(--foreground))] truncate block">
                        {selectedLaporanCategory?.nama || "Kategori"} → {selectedSubCategory?.nama || "Sub Kategori"}
                      </span>
                    </div>
                    {availableParameters.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAutoMatchParameters}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[#00A876]/10 text-[#00A876] hover:bg-[#00A876]/20 border border-[#00A876]/30 transition shrink-0"
                        title="Otomatis cocokkan parameter laporan"
                      >
                        <Sparkles className="w-3 h-3" /> Auto
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        key: "diperiksa",
                        label: "1. Jumlah Diperiksa (Total)",
                        desc: "Akumulasi total fasilitas yang diinspeksi",
                        value: paramDiperiksaId,
                        setter: setParamDiperiksaId,
                        badge: "TOTAL",
                        badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
                        accentBorder: "focus-within:border-blue-500/60",
                        icon: ClipboardCheck,
                        iconColor: "text-blue-600 dark:text-blue-400",
                      },
                      {
                        key: "ms",
                        label: "2. Memenuhi Syarat (MS / Laik)",
                        desc: "Inspeksi yang memenuhi kriteria lulus",
                        value: paramMsId,
                        setter: setParamMsId,
                        badge: "MS",
                        badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
                        accentBorder: "focus-within:border-emerald-500/60",
                        icon: CheckCircle2,
                        iconColor: "text-emerald-600 dark:text-emerald-400",
                      },
                      {
                        key: "tms",
                        label: "3. Tidak Memenuhi (TMS)",
                        desc: "Inspeksi di bawah passing grade",
                        value: paramTmsId,
                        setter: setParamTmsId,
                        badge: "TMS",
                        badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
                        accentBorder: "focus-within:border-rose-500/60",
                        icon: XCircle,
                        iconColor: "text-rose-600 dark:text-rose-400",
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.key}
                          className={`p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] transition-all ${item.accentBorder} ${
                            item.value ? "ring-1 ring-[hsl(var(--border))] shadow-xs" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Icon className={`w-3.5 h-3.5 shrink-0 ${item.iconColor}`} />
                              <span className="text-[11px] font-bold text-[hsl(var(--foreground))] truncate">
                                {item.label}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${item.badgeClass}`}
                            >
                              {item.badge}
                            </span>
                          </div>
                          <select
                            value={item.value || ""}
                            onChange={(e) => item.setter(e.target.value ? Number(e.target.value) : null)}
                            className="w-full h-9 px-2.5 text-[11px] font-bold border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--muted))]/20 text-[hsl(var(--foreground))] outline-none hover:bg-[hsl(var(--muted))]/30 transition-colors cursor-pointer"
                          >
                            <option value="">— Belum Dipetakan —</option>
                            {availableParameters.map((p: any) => (
                              <option key={p.id} value={p.id}>
                                {p.nama} {p.code ? `(${p.code})` : ""}
                              </option>
                            ))}
                          </select>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 leading-tight">
                            {item.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-relaxed pt-1">
                    💡 Saat inspeksi diverifikasi, hasil penilaian form akan otomatis terakumulasi ke dalam tabel
                    laporan bulanan.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Fields */}
        <div className="min-w-0">
          {/* Sticky mini-nav */}
          {groupedFields.length > 1 && (
            <div className="sticky top-0 z-20 -mx-1 px-1 py-2 mb-3 bg-[hsl(var(--background))]/95 backdrop-blur border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {groupedFields.map((g) => (
                  <button
                    key={g.grup}
                    onClick={() => scrollToGroup(g.grup)}
                    className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold transition-colors ${
                      activeGroup === g.grup
                        ? "bg-[#00A876] text-white"
                        : "bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                    }`}
                  >
                    <span className="font-black">
                      {g.grup === "__META__"
                        ? "M"
                        : g.subbagian
                          ? `${toRoman(g.areaIndex)}.${g.subIndex}`
                          : toRoman(g.areaIndex)}
                    </span>
                    <span className="max-w-[120px] truncate">
                      {g.grup === "__META__" ? "Metadata" : g.subbagian || g.area}
                    </span>
                    <span className="text-[9px] opacity-70">{g.fields.length}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
              <Settings2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <span className="text-[12px] font-bold">Daftar Ceklis</span>
              <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))]">{fields.length} item</span>
              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">· {groupedFields.length} bagian</span>
              <div className="ml-auto flex items-center gap-2">
                {groupedFields.length > 0 && (
                  <div className="flex items-center rounded-lg border border-[hsl(var(--border))] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleAllGroups(false)}
                      className="px-2 py-1 text-[10px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                      title="Buka semua bagian"
                    >
                      Buka
                    </button>
                    <span className="w-px h-4 bg-[hsl(var(--border))]" />
                    <button
                      type="button"
                      onClick={() => toggleAllGroups(true)}
                      className="px-2 py-1 text-[10px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                      title="Tutup semua bagian"
                    >
                      Tutup
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => addMetadataField("", "TEXT")}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition-colors rounded-lg"
                  title="Tambahkan field metadata form (nama usaha, pemeriksa, golongan, dll)"
                >
                  <Plus className="w-3.5 h-3.5" /> + Metadata
                </button>
                <button
                  type="button"
                  onClick={() => addField()}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 bg-[hsl(var(--foreground))] text-[hsl(var(--card))] hover:opacity-85 transition-colors rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" /> + Butir
                </button>
              </div>
            </div>

            {fields.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <p className="text-[14px] text-[hsl(var(--muted-foreground))]">Belum ada butir pemeriksaan</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button
                    onClick={() => addField("__META__")}
                    className="flex items-center gap-2 h-10 px-4 text-[12px] font-bold border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 transition-colors rounded-lg"
                  >
                    <Plus className="w-4 h-4" /> Metadata
                  </button>
                  <button
                    onClick={() => {
                      setFields([
                        {
                          pertanyaan: "",
                          tipe: "BOOLEAN",
                          isRequired: false,
                          grup: "",
                          skor: 1,
                          skorBenar: 1,
                          skorSalah: 0,
                          opsi: "",
                        },
                      ]);
                      setAddingInline({ type: "bagian" });
                      setInlineName("");
                    }}
                    className="flex items-center gap-2 h-10 px-4 text-[12px] font-bold border-2 border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors rounded-lg"
                  >
                    <FolderPlus className="w-4 h-4" /> Tambah Grup
                  </button>
                  <button
                    onClick={() => addField()}
                    className="flex items-center gap-2 h-10 px-4 text-[12px] font-bold bg-[hsl(var(--foreground))] text-[hsl(var(--card))] hover:opacity-80 transition-colors rounded-lg"
                  >
                    <Plus className="w-4 h-4" /> Tambah Butir
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[hsl(var(--border))]">
                {/* Dropzone: Jadikan Bagian Utama Baru dari Drag Butir */}
                {dragState?.type === "field" && dragState.index != null && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropTarget("drop-new-bagian-top");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragState.index != null) convertFieldToBagian(dragState.index);
                      resetDrag();
                    }}
                    className={`m-3 p-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-[12px] font-bold transition-all duration-150 cursor-pointer ${
                      dropTarget === "drop-new-bagian-top"
                        ? "border-[#00A876] bg-[#00A876]/20 text-[#00A876] ring-2 ring-[#00A876]/40 scale-[1.01]"
                        : "border-[#00A876]/40 bg-[#00A876]/5 text-[#00A876] hover:bg-[#00A876]/10"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    Lepaskan di sini untuk JADIKAN BAGIAN UTAMA BARU
                  </div>
                )}

                {groupedFields.map((group) => {
                  const isCollapsed = collapsedGroups.has(group.grup);
                  return (
                    <div key={group.grup} id={`grup-${group.grup}`} className="scroll-mt-16">
                      {/* Group Header — klik untuk collapse */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleGroup(group.grup)}
                        onKeyDown={(e) => e.key === "Enter" && toggleGroup(group.grup)}
                        onDragOver={(e) => {
                          if (
                            (dragState?.type === "field" && dragState.index != null) ||
                            (dragState?.type === "group" && dragState.grup && dragState.grup !== group.grup)
                          ) {
                            e.preventDefault();
                            setDropTarget(`group:${group.grup}`);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragState?.type === "field" && dragState.index != null) {
                            moveFieldToGroup(dragState.index, group.grup);
                          } else if (dragState?.type === "group" && dragState.grup) {
                            moveGroupTo(dragState.grup, group.grup);
                          }
                          resetDrag();
                        }}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors hover:bg-[hsl(var(--muted))]/60 ${
                          group.subbagian ? "pl-10 bg-[hsl(var(--muted))]/40" : "bg-[hsl(var(--muted))]/30"
                        } ${
                          dragState?.type === "field" && dropTarget === `group:${group.grup}`
                            ? "ring-2 ring-inset ring-[#00A876] bg-[#00A876]/10"
                            : ""
                        }`}
                      >
                        <span
                          draggable
                          onDragStart={(e) => {
                            setDragState({ type: "group", grup: group.grup });
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", group.grup);
                          }}
                          onDragEnd={resetDrag}
                          title={
                            group.grup === "__META__"
                              ? "Tarik untuk memindahkan grup metadata"
                              : "Tarik untuk memindahkan bagian"
                          }
                        >
                          <GripVertical className="w-4 h-4 shrink-0 text-[hsl(var(--muted-foreground))] cursor-grab active:cursor-grabbing hover:text-[#00A876]" />
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                        />
                        <div
                          className={`w-9 h-7 flex items-center justify-center text-[11px] font-black shrink-0 rounded-lg ${
                            group.grup === "__META__"
                              ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
                              : group.subbagian
                                ? "bg-[#00A876]/15 text-[#00A876]"
                                : "bg-[hsl(var(--foreground))] text-[hsl(var(--card))]"
                          }`}
                        >
                          {group.grup === "__META__"
                            ? "M"
                            : group.subbagian
                              ? `${toRoman(group.areaIndex)}.${group.subIndex}`
                              : toRoman(group.areaIndex)}
                        </div>
                        {group.grup === "__META__" ? (
                          <span className="flex-1 text-[13px] font-bold text-[hsl(var(--muted-foreground))] tracking-wide">
                            Metadata
                          </span>
                        ) : editingGroupKey === group.grup ? (
                          <input
                            autoFocus
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameGroup(group.grup, editingGroupName);
                              if (e.key === "Escape") setEditingGroupKey(null);
                            }}
                            onBlur={() => handleRenameGroup(group.grup, editingGroupName)}
                            placeholder={group.subbagian ? "Nama subbagian..." : "Nama bagian..."}
                            className="flex-1 text-[13px] font-bold border-2 border-[#00A876]/50 rounded-lg px-2 py-1 outline-none bg-white dark:bg-[hsl(var(--muted))]"
                          />
                        ) : (
                          <span className="flex-1 text-[13px] font-bold text-[hsl(var(--foreground))] tracking-wide truncate">
                            {(group.subbagian || group.grup).toUpperCase()}
                          </span>
                        )}
                        <span className="text-[11px] text-[hsl(var(--muted-foreground))] shrink-0">
                          {group.fields.length} item
                        </span>
                        {/* Geser atas/bawah grup / metadata */}
                        {editingGroupKey !== group.grup && (
                          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => moveGroup(group.grup, "up")}
                              disabled={groupedFields.indexOf(group) === 0}
                              title={group.grup === "__META__" ? "Geser metadata ke atas" : "Geser bagian ke atas"}
                              className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] disabled:opacity-25 transition-colors"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveGroup(group.grup, "down")}
                              disabled={groupedFields.indexOf(group) === groupedFields.length - 1}
                              title={group.grup === "__META__" ? "Geser metadata ke bawah" : "Geser bagian ke bawah"}
                              className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] disabled:opacity-25 transition-colors"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {group.grup === "__META__" && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFields([
                                  ...fields,
                                  {
                                    pertanyaan: "Nama Pemeriksa",
                                    tipe: "TEXT",
                                    isRequired: true,
                                    grup: "__META__",
                                    autoFill: "USER_NAME",
                                    isDisabled: false,
                                    dependsOn: null,
                                    allowNA: false,
                                    skor: 0,
                                    skorBenar: 0,
                                    skorSalah: 0,
                                    opsi: "",
                                  },
                                ]);
                                toast.success("Preset Nama Pemeriksa dari Akun ditambahkan");
                              }}
                              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-[#00A876]/15 text-[#00A876] border border-[#00A876]/30 hover:bg-[#00A876]/25 transition-colors rounded-md"
                            >
                              👤 + Nama Pemeriksa (Akun)
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFields([
                                  ...fields,
                                  {
                                    pertanyaan: "Wilayah Kerja Puskesmas",
                                    tipe: "TEXT",
                                    isRequired: true,
                                    grup: "__META__",
                                    autoFill: "USER_PUSKESMAS",
                                    targetGolongan: "ALL",
                                    isDisabled: false,
                                    dependsOn: null,
                                    allowNA: false,
                                    skor: 0,
                                    skorBenar: 0,
                                    skorSalah: 0,
                                    opsi: "",
                                  },
                                ]);
                                toast.success("Preset Wilayah Kerja dari Akun Puskesmas ditambahkan");
                              }}
                              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-blue-500/15 text-blue-600 border border-blue-500/30 hover:bg-blue-500/25 transition-colors rounded-md"
                            >
                              🏥 + Wilayah Kerja (Puskesmas)
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addMetadataField(
                                  "Tipe / Golongan Sasaran",
                                  "DROPDOWN",
                                  "Golongan A1, Golongan A2, Golongan A3",
                                );
                              }}
                              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-colors rounded-md"
                            >
                              🎯 + Tipe Sasaran (A1 / A2 / A3)
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addMetadataField("", "TEXT");
                              }}
                              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors rounded-md"
                            >
                              <Plus className="w-3 h-3" /> Tambah Metadata
                            </button>
                          </div>
                        )}
                        {!group.subbagian && group.grup !== "__META__" && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingGroupKey(group.grup);
                                setEditingGroupName(group.area);
                              }}
                              title="Ganti nama bagian (termasuk subbagiannya)"
                              className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addSubbagian(group.area);
                              }}
                              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors rounded-md"
                            >
                              <FolderPlus className="w-3 h-3" /> Subbagian
                            </button>
                            {mainAreaOptions.filter((a) => a !== group.area).length > 0 && (
                              <select
                                value=""
                                onChange={(e) => {
                                  if (!e.target.value) return;
                                  demoteBagianToSub(group.grup, e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[9px] font-bold bg-[hsl(var(--card))] border border-[hsl(var(--border))] px-1 py-1 outline-none rounded-md text-[hsl(var(--muted-foreground))] hover:border-purple-400"
                                title="Jadikan Bagian ini sebagai Subbagian di bawah Bagian lain"
                              >
                                <option value="">↳ Jadi Subbagian di...</option>
                                {mainAreaOptions
                                  .filter((a) => a !== group.area)
                                  .map((a) => (
                                    <option key={a} value={a}>
                                      ↳ Di bawah {a}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </>
                        )}
                        {group.subbagian && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                promoteSubToBagian(group.grup);
                              }}
                              title="Ubah Subbagian ini menjadi Bagian Utama"
                              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors rounded-md"
                            >
                              <ArrowUp className="w-3 h-3" /> Jadi Bagian
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingGroupKey(group.grup);
                                setEditingGroupName(group.subbagian || "");
                              }}
                              title="Ganti nama subbagian"
                              className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addField(group.grup);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors rounded-md"
                        >
                          <Plus className="w-3 h-3" /> Butir
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              group.grup !== "__META__" ||
                              confirm("Hapus seluruh grup metadata? Tindakan ini tidak dapat dibatalkan.")
                            ) {
                              deleteGrup(group.grup);
                            }
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 border border-red-200 text-red-500 hover:bg-red-50 transition-colors rounded-md"
                          title={group.grup === "__META__" ? "Hapus seluruh grup metadata" : "Hapus grup ini"}
                        >
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </div>

                      {/* Inline add subbagian */}
                      {addingInline?.type === "sub" && addingInline.area === group.area && !group.subbagian && (
                        <div className="flex items-center gap-2 px-5 py-3 bg-[#00A876]/[0.04] border-t border-[#00A876]/20">
                          <span className="text-[11px] font-bold text-[#00A876] shrink-0">Subbagian {group.area}:</span>
                          <input
                            autoFocus
                            value={inlineName}
                            onChange={(e) => setInlineName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitInline();
                              if (e.key === "Escape") setAddingInline(null);
                            }}
                            placeholder="Nama subbagian..."
                            className="flex-1 h-8 px-3 text-[12px] border border-[#00A876]/30 rounded-lg outline-none focus:border-[#00A876] bg-white"
                          />
                          <button
                            onClick={submitInline}
                            className="h-8 px-3 text-[11px] font-bold bg-[#00A876] text-white rounded-lg hover:opacity-90"
                          >
                            Tambah
                          </button>
                          <button
                            onClick={() => setAddingInline(null)}
                            className="h-8 px-3 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-lg"
                          >
                            Batal
                          </button>
                        </div>
                      )}
                      {/* Dropzone: Jadikan Subbagian di bawah Bagian ini */}
                      {dragState?.type === "field" &&
                        dragState.index != null &&
                        !group.subbagian &&
                        group.grup !== "__META__" && (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDropTarget(`drop-subbagian:${group.area}`);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragState.index != null) {
                                convertFieldToSubbagian(dragState.index, group.area);
                              }
                              resetDrag();
                            }}
                            className={`mx-3 my-2 p-2.5 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold transition-all duration-150 cursor-pointer ${
                              dropTarget === `drop-subbagian:${group.area}`
                                ? "border-purple-500 bg-purple-500/20 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/40 scale-[1.01]"
                                : "border-purple-500/40 bg-purple-500/5 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                            }`}
                          >
                            <FolderPlus className="w-3.5 h-3.5 animate-pulse" />
                            Lepaskan di sini untuk JADIKAN SUBBAGIAN baru di bawah &quot;{group.area}&quot;
                          </div>
                        )}

                      {!isCollapsed && (
                        <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]/40 p-3 space-y-2.5">
                          {group.fields.map(({ field, index }: { field: any; index: number }, localIdx: number) => {
                            return (
                              <div
                                key={index}
                                draggable
                                onDragStart={(e) => {
                                  // Jangan mulai drag dari input/select/button (biar tetap bisa edit & pilih teks)
                                  const el = e.target as HTMLElement;
                                  if (el.closest("input, select, textarea, button, label")) {
                                    e.preventDefault();
                                    return;
                                  }
                                  setDragState({ type: "field", index });
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData("text/plain", String(index));
                                }}
                                onDragEnd={resetDrag}
                                onDragOver={(e) => {
                                  if (dragState?.type === "field" && dragState.index !== index) {
                                    e.preventDefault();
                                    setDropTarget(`field:${index}`);
                                  }
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (dragState?.type === "field" && dragState.index != null) {
                                    moveFieldTo(dragState.index, index);
                                  }
                                  resetDrag();
                                }}
                                className={`rounded-xl border bg-[hsl(var(--card))] p-3 transition-colors cursor-grab active:cursor-grabbing ${
                                  field.isDisabled
                                    ? "border-red-200 bg-red-50/40 opacity-75"
                                    : "border-[hsl(var(--border))] hover:border-[#00A876]/40"
                                } ${
                                  dragState?.type === "field" && dropTarget === `field:${index}`
                                    ? "border-t-2 border-t-[#00A876] ring-1 ring-[#00A876]/40"
                                    : ""
                                } ${dragState?.index === index ? "opacity-40" : ""}`}
                              >
                                {/* Baris utama: nomor + pertanyaan + aksi */}
                                <div className="flex items-start gap-3">
                                  <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                                    <span title="Tarik untuk memindahkan butir (atau tarik kartu ini)">
                                      <GripVertical className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]/50 pointer-events-none" />
                                    </span>
                                    <span className="w-6 h-6 flex items-center justify-center text-[10px] font-black rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                                      {localIdx + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => moveField(index, "up")}
                                      disabled={index === 0}
                                      title="Geser ke atas"
                                      className="p-0.5 rounded text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[#00A876] disabled:opacity-20 transition-colors"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveField(index, "down")}
                                      disabled={index === fields.length - 1}
                                      title="Geser ke bawah"
                                      className="p-0.5 rounded text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[#00A876] disabled:opacity-20 transition-colors"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <div className="flex-1 min-w-0 space-y-2">
                                    <input
                                      type="text"
                                      value={field.pertanyaan}
                                      onChange={(e) => updateField(index, "pertanyaan", e.target.value)}
                                      placeholder="Tulis pertanyaan..."
                                      className={`w-full text-[13px] font-semibold bg-transparent outline-none border-b-2 border-transparent focus:border-[#00A876]/50 px-1 py-0.5 ${
                                        field.isDisabled ? "line-through text-[hsl(var(--muted-foreground))]" : ""
                                      }`}
                                    />

                                    {/* Baris kontrol: tipe, opsi, kondisional, sasaran */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <select
                                        value={field.tipe}
                                        onChange={(e) => updateField(index, "tipe", e.target.value)}
                                        className="text-[10px] font-bold bg-[hsl(var(--muted))]/40 border border-[hsl(var(--border))] px-1.5 py-1 outline-none rounded-md"
                                      >
                                        {FIELD_TYPES.map((t) => (
                                          <option key={t.value} value={t.value}>
                                            {t.label}
                                          </option>
                                        ))}
                                      </select>

                                      {(field.tipe === "SELECT" || field.tipe === "DROPDOWN") && (
                                        <input
                                          type="text"
                                          value={field.opsi || ""}
                                          onChange={(e) => updateField(index, "opsi", e.target.value)}
                                          placeholder="Opsi 1, Opsi 2, ..."
                                          className="w-44 text-[10px] bg-[hsl(var(--muted))]/30 border border-dashed border-[hsl(var(--border))] px-1.5 py-1 outline-none rounded-md focus:border-[#00A876]/50"
                                        />
                                      )}

                                      {group.grup === "__META__" ? (
                                        <>
                                          <select
                                            value={field.autoFill || ""}
                                            onChange={(e) => updateField(index, "autoFill", e.target.value || "")}
                                            className="text-[10px] bg-[hsl(var(--muted))]/30 border border-dashed border-[hsl(var(--border))] px-1.5 py-1 outline-none rounded-md"
                                          >
                                            <option value="">Manual (Diisi Saat Input)</option>
                                            <option value="USER_NAME">👤 Otomatis Nama Akun</option>
                                            <option value="USER_PUSKESMAS">🏥 Otomatis Puskesmas</option>
                                          </select>
                                          {field.autoFill === "USER_NAME" && (
                                            <span className="text-[9px] font-bold text-[#00A876] bg-[#00A876]/10 px-1.5 py-0.5 rounded">
                                              Nama Petugas
                                            </span>
                                          )}
                                          {field.autoFill === "USER_PUSKESMAS" && (
                                            <span className="text-[9px] font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                              Puskesmas
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <select
                                          value={
                                            field.dependsOn
                                              ? `${field.dependsOn.parentIndex ?? ""}:${field.dependsOn.requiredValue ?? "TRUE"}`
                                              : ""
                                          }
                                          onChange={(e) => {
                                            if (!e.target.value) {
                                              updateField(index, "dependsOn", null);
                                            } else {
                                              const [pIdx, reqVal] = e.target.value.split(":");
                                              const parentField = fields[Number(pIdx)];
                                              updateField(index, "dependsOn", {
                                                parentIndex: Number(pIdx),
                                                parentPertanyaan:
                                                  parentField?.pertanyaan || `Butir ${Number(pIdx) + 1}`,
                                                requiredValue: reqVal || "TRUE",
                                              });
                                            }
                                          }}
                                          className="text-[10px] max-w-[220px] bg-[hsl(var(--muted))]/30 border border-dashed border-[hsl(var(--border))] px-1.5 py-1 outline-none rounded-md text-[hsl(var(--muted-foreground))]"
                                        >
                                          <option value="">⚙️ Syarat: Selalu Aktif</option>
                                          {fields
                                            .map((f, i) => ({ f, i }))
                                            .filter(({ i, f }) => i < index && f.grup !== "__META__")
                                            .map(({ f, i }) => (
                                              <optgroup
                                                key={i}
                                                label={`Butir ${i + 1}: ${f.pertanyaan ? `${f.pertanyaan.substring(0, 25)}...` : `Butir ${i + 1}`}`}
                                              >
                                                <option value={`${i}:TRUE`}>
                                                  Aktif jika Butir {i + 1} = &quot;Ya&quot;
                                                </option>
                                                <option value={`${i}:FALSE`}>
                                                  Aktif jika Butir {i + 1} = &quot;Tidak&quot;
                                                </option>
                                              </optgroup>
                                            ))}
                                        </select>
                                      )}

                                      {/* Pindah bagian/subbagian/metadata */}
                                      {allAvailableGroupOptions.length > 1 && (
                                        <select
                                          value={field.grup || ""}
                                          onChange={(e) => {
                                            const newGrup = e.target.value;
                                            if (!newGrup || newGrup === (field.grup || "")) return;
                                            setFields(
                                              fields.map((f, i) => (i === index ? { ...f, grup: newGrup } : f)),
                                            );
                                            toast.success(
                                              newGrup === "__META__"
                                                ? "Dipindahkan ke Metadata"
                                                : `Butir dipindahkan ke "${newGrup}"`,
                                            );
                                          }}
                                          className="text-[10px] max-w-[180px] bg-[hsl(var(--muted))]/30 border border-dashed border-[hsl(var(--border))] px-1.5 py-1 outline-none rounded-md text-[hsl(var(--muted-foreground))]"
                                          title="Pindahkan butir ke bagian/metadata lain"
                                        >
                                          {allAvailableGroupOptions.map((g) => (
                                            <option key={g} value={g}>
                                              {g === "__META__"
                                                ? "📋 Metadata"
                                                : `📦 ${g.length > 28 ? `${g.substring(0, 28)}...` : g}`}
                                            </option>
                                          ))}
                                        </select>
                                      )}

                                      {/* Ubah jadi Bagian atau Subbagian */}
                                      {group.grup !== "__META__" && (
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => convertFieldToBagian(index)}
                                            title="Jadikan pertanyaan ini sebagai Bagian Utama baru"
                                            className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-md bg-[hsl(var(--muted))]/50 hover:bg-[#00A876]/15 hover:text-[#00A876] text-[hsl(var(--muted-foreground))] border border-dashed border-[hsl(var(--border))] transition-colors"
                                          >
                                            <Sparkles className="w-2.5 h-2.5" /> + Bagian
                                          </button>
                                          {mainAreaOptions.length > 0 && (
                                            <select
                                              value=""
                                              onChange={(e) => {
                                                if (!e.target.value) return;
                                                convertFieldToSubbagian(index, e.target.value);
                                              }}
                                              className="text-[9px] font-bold bg-[hsl(var(--muted))]/50 border border-dashed border-[hsl(var(--border))] px-1 py-1 outline-none rounded-md text-[hsl(var(--muted-foreground))] hover:border-purple-400"
                                              title="Jadikan pertanyaan ini sebagai Subbagian baru di bawah Bagian pilihan"
                                            >
                                              <option value="">+ Subbagian di...</option>
                                              {mainAreaOptions.map((area) => (
                                                <option key={area} value={area}>
                                                  ↳ Di {area.length > 20 ? `${area.substring(0, 20)}...` : area}
                                                </option>
                                              ))}
                                            </select>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Sasaran untuk non-meta */}
                                    {group.grup !== "__META__" && availableSasaranOptions.length > 0 && (
                                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[hsl(var(--border))]/50">
                                        <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                                          🎯 Sasaran:
                                        </span>
                                        <div className="inline-flex flex-wrap gap-0.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-0.5 text-[10px]">
                                          <button
                                            type="button"
                                            onClick={() => updateField(index, "targetGolongan", "ALL")}
                                            className={`px-2 py-0.5 rounded transition-colors ${
                                              !field.targetGolongan || field.targetGolongan === "ALL"
                                                ? "bg-[#00A876] text-white font-bold"
                                                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                                            }`}
                                          >
                                            Semua
                                          </button>
                                          {availableSasaranOptions.map((opt, optIdx) => {
                                            const curVal = field.targetGolongan || "ALL";
                                            const curClean = curVal.toLowerCase().replace(/[^a-z0-9]/g, "");
                                            const optClean = opt.toLowerCase().replace(/[^a-z0-9]/g, "");
                                            const isSelected =
                                              curVal !== "ALL" &&
                                              (curClean === optClean ||
                                                (curClean === "a1" && optClean.includes("a1")) ||
                                                (curClean === "a2" && optClean.includes("a2")) ||
                                                curClean === opt.toLowerCase());

                                            const colorClass = [
                                              "bg-amber-600 text-white font-bold",
                                              "bg-indigo-600 text-white font-bold",
                                              "bg-purple-600 text-white font-bold",
                                              "bg-teal-600 text-white font-bold",
                                              "bg-rose-600 text-white font-bold",
                                            ][optIdx % 5];

                                            return (
                                              <button
                                                key={opt}
                                                type="button"
                                                onClick={() =>
                                                  updateField(index, "targetGolongan", isSelected ? "ALL" : opt)
                                                }
                                                className={`px-2 py-0.5 rounded transition-colors ${
                                                  isSelected
                                                    ? colorClass
                                                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                                                }`}
                                              >
                                                {opt}
                                              </button>
                                            );
                                          })}
                                        </div>
                                        {field.targetGolongan && field.targetGolongan !== "ALL" && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-200">
                                            🎯 Khusus {field.targetGolongan}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {field.dependsOn && (
                                      <span className="inline-block text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                        🔒 Tergantung Butir {field.dependsOn.parentIndex + 1} (
                                        {field.dependsOn.requiredValue === "TRUE" ? "Ya" : "Tidak"})
                                      </span>
                                    )}
                                  </div>

                                  {/* Kolom skor + aksi di kanan */}
                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <div className="flex items-center gap-1.5">
                                      <label className="flex flex-col items-center" title="Wajib diisi">
                                        <span className="text-[8px] font-bold uppercase text-[hsl(var(--muted-foreground))]">
                                          Wajib
                                        </span>
                                        <input
                                          type="checkbox"
                                          checked={field.isRequired}
                                          onChange={(e) => updateField(index, "isRequired", e.target.checked)}
                                          className="w-3.5 h-3.5 accent-[#00A876]"
                                        />
                                      </label>
                                      <label className="flex flex-col items-center" title="Skor maksimal">
                                        <span className="text-[8px] font-bold uppercase text-[hsl(var(--muted-foreground))]">
                                          Skor
                                        </span>
                                        <input
                                          type="number"
                                          value={field.skor ?? 0}
                                          onChange={(e) => updateField(index, "skor", parseFloat(e.target.value) || 0)}
                                          className="w-12 text-center text-[10px] font-bold border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 px-0.5 py-0.5 outline-none rounded-md focus:border-[#00A876]/50"
                                        />
                                      </label>
                                      {field.tipe === "BOOLEAN" && (
                                        <>
                                          <label className="flex flex-col items-center" title="Skor jawaban benar">
                                            <span className="text-[8px] font-bold uppercase text-green-600">B</span>
                                            <input
                                              type="number"
                                              value={field.skorBenar ?? 1}
                                              onChange={(e) =>
                                                updateField(index, "skorBenar", parseFloat(e.target.value) || 0)
                                              }
                                              className="w-10 text-center text-[10px] border border-green-200 bg-green-50/50 px-0.5 py-0.5 outline-none rounded-md"
                                            />
                                          </label>
                                          <label className="flex flex-col items-center" title="Skor jawaban salah">
                                            <span className="text-[8px] font-bold uppercase text-red-500">S</span>
                                            <input
                                              type="number"
                                              value={field.skorSalah ?? 0}
                                              onChange={(e) =>
                                                updateField(index, "skorSalah", parseFloat(e.target.value) || 0)
                                              }
                                              className="w-10 text-center text-[10px] border border-red-200 bg-red-50/50 px-0.5 py-0.5 outline-none rounded-md"
                                            />
                                          </label>
                                          <label
                                            className="flex items-center gap-1 text-[9px] text-[hsl(var(--muted-foreground))] cursor-pointer select-none"
                                            title="Izinkan jawaban T/A (Tidak Ada / tidak applicable)"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={field.allowNA ?? false}
                                              onChange={(e) => updateField(index, "allowNA", e.target.checked)}
                                              className="w-3 h-3 accent-[#00A876]"
                                            />
                                            T/A
                                          </label>
                                        </>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => updateField(index, "isDisabled", !field.isDisabled)}
                                        title={
                                          field.isDisabled
                                            ? "Butir dinonaktifkan (klik untuk aktifkan)"
                                            : "Nonaktifkan butir"
                                        }
                                        className={`px-1.5 py-1 rounded text-[9px] font-bold border transition-colors ${
                                          field.isDisabled
                                            ? "bg-red-100 text-red-700 border-red-300"
                                            : "bg-green-50 text-green-700 border-green-200"
                                        }`}
                                      >
                                        {field.isDisabled ? "🚫" : "✓"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeField(index)}
                                        title="Hapus butir"
                                        className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Dropzone untuk memasukkan butir ke grup ini saat drag */}
                          {dragState?.type === "field" && dragState.index != null && (
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDropTarget(`drop-into-group:${group.grup}`);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (dragState.index != null) {
                                  moveFieldToGroup(dragState.index, group.grup);
                                }
                                resetDrag();
                              }}
                              className={`p-2.5 border-2 border-dashed rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-bold transition-all duration-150 cursor-pointer ${
                                dropTarget === `drop-into-group:${group.grup}`
                                  ? "border-[#00A876] bg-[#00A876]/20 text-[#00A876] ring-2 ring-[#00A876]/30 scale-[1.01]"
                                  : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-[#00A876]/40 hover:text-[#00A876]"
                              }`}
                            >
                              📥 Lepaskan di sini untuk MASUKKAN KE{" "}
                              {group.subbagian ? `Subbagian "${group.subbagian}"` : `Bagian "${group.area}"`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Dropzone: Jadikan Bagian Utama Baru dari Drag Butir (di bawah) */}
                {dragState?.type === "field" && dragState.index != null && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropTarget("drop-new-bagian-bottom");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragState.index != null) convertFieldToBagian(dragState.index);
                      resetDrag();
                    }}
                    className={`m-3 p-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-[12px] font-bold transition-all duration-150 cursor-pointer ${
                      dropTarget === "drop-new-bagian-bottom"
                        ? "border-[#00A876] bg-[#00A876]/20 text-[#00A876] ring-2 ring-[#00A876]/40 scale-[1.01]"
                        : "border-[#00A876]/40 bg-[#00A876]/5 text-[#00A876] hover:bg-[#00A876]/10"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    Lepaskan di sini untuk JADIKAN BAGIAN UTAMA BARU
                  </div>
                )}
              </div>
            )}

            {/* Tambah Bagian — inline, selalu terlihat saat ada fields */}
            {fields.length > 0 && (
              <div className="px-5 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10">
                {addingInline?.type === "bagian" ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#00A876] shrink-0">Bagian baru:</span>
                    <input
                      autoFocus
                      value={inlineName}
                      onChange={(e) => setInlineName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitInline();
                        if (e.key === "Escape") setAddingInline(null);
                      }}
                      placeholder="Contoh: AIR, BANGUNAN, UDARA..."
                      className="flex-1 h-8 px-3 text-[12px] border border-[#00A876]/30 rounded-lg outline-none focus:border-[#00A876] bg-white"
                    />
                    <button
                      onClick={submitInline}
                      className="h-8 px-3 text-[11px] font-bold bg-[#00A876] text-white rounded-lg hover:opacity-90"
                    >
                      Tambah
                    </button>
                    <button
                      onClick={() => setAddingInline(null)}
                      className="h-8 px-3 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-lg"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => {
                        setAddingInline({ type: "bagian" });
                        setInlineName("");
                      }}
                      className="flex items-center gap-2 h-9 px-4 text-[11px] font-bold border border-dashed border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[#00A876]/50 hover:text-[#00A876] transition-colors rounded-lg"
                    >
                      <FolderPlus className="w-3.5 h-3.5" /> Tambah Bagian
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ImportInspectionModal
        open={isImportModalOpen}
        job={activeImportJob}
        onClose={() => setIsImportModalOpen(false)}
        onMinimize={() => {
          setIsImportModalOpen(false);
          if (activeImportJob) setIsImportWidgetVisible(true);
        }}
        onApplyResult={handleApplyImportResult}
      />

      {isImportWidgetVisible && (
        <ImportFloatingWidget
          job={activeImportJob}
          onOpenModal={() => {
            setIsImportModalOpen(true);
            setIsImportWidgetVisible(false);
          }}
          onDismiss={() => {
            setIsImportWidgetVisible(false);
            if (activeImportJob?.status === "complete" || activeImportJob?.status === "failed") {
              setActiveImportJob(null);
            }
          }}
        />
      )}
    </div>
  );
}
