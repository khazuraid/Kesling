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
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Copy,
  FileText,
  FolderPlus,
  GripVertical,
  History,
  Pencil,
  Plus,
  Search,
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

export const DEFAULT_MATRIX_COLUMNS = [
  { code: "A", label: "Area luar bangunan" },
  { code: "B", label: "Area fasilitas karyawan" },
  { code: "C", label: "Area penerimaan bahan baku/kemasan" },
  { code: "D", label: "Area penyimpanan (bahan baku, ingredien, kemasan)" },
  { code: "E", label: "Area pengolahan (pemotongan, pencucian, pemasakan)" },
  { code: "F", label: "Area pengemasan/pemorsian" },
  { code: "G", label: "Area loading produk jadi" },
  { code: "H", label: "Area pencucian peralatan" },
];

const FIELD_TYPES = [
  { value: "BOOLEAN", label: "Ceklis" },
  { value: "MATRIX_AREA", label: "Matriks Area" },
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
  { value: "sppg_penalty", label: "Penalti Matriks Area (SPPG)", desc: "100 - (Total Penalti / Max Bobot × 100)" },
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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUserPkmId = (session?.user as any)?.puskesmasId;
  const currentUserRole = (session?.user as any)?.role;

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

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
  const [matrixColumns, setMatrixColumns] = useState<{ code: string; label: string }[]>(DEFAULT_MATRIX_COLUMNS);
  const [newColumnCode, setNewColumnCode] = useState("");
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [showMatrixColManager, setShowMatrixColManager] = useState(false);

  // Pagination & Search state
  const [templateSearch, setTemplateSearch] = useState("");
  const [templatePage, setTemplatePage] = useState(1);
  const [templateLimit] = useState(10);

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
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["inspection-templates"] });
      setSelectedTemplateId(data.id);
      setIsCreating(false);
      if (Array.isArray(data?.fields)) {
        setFields((prev) =>
          prev.map((f, i) => {
            const serverField = data.fields[i];
            return serverField?.id && !f.id ? { ...f, id: serverField.id } : f;
          }),
        );
      }
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
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["inspection-templates"] });
      if (data?.message) {
        toast.info(data.message);
      } else {
        toast.success("Template dihapus");
      }
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
      matrixColumns,
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
      id: f.id ? Number(f.id) : undefined,
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
      subNomor: f.subNomor || f.config?.subNomor || undefined,
      areaScores: f.areaScores || f.config?.areaScores || undefined,
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
        subNomor: f.subNomor || f.config?.subNomor || undefined,
        areaScores: f.areaScores || f.config?.areaScores || undefined,
      },
    })),
  });

  const activeTemplate = useMemo(() => {
    return templates.find((t: any) => t.id === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  const isOwner =
    !selectedTemplateId ||
    isCreating ||
    currentUserRole === "ADMIN" ||
    (activeTemplate?.puskesmasId && activeTemplate?.puskesmasId === currentUserPkmId);

  function handleDuplicate() {
    setSelectedTemplateId(null);
    setIsCreating(true);
    setNama((prev) => (prev.endsWith("(Salinan)") ? prev : `${prev} (Salinan)`));
    toast.info("Template disalin. Silakan sesuaikan dan klik Simpan untuk membuat template Puskesmas Anda.");
  }

  function handleSave() {
    if (!nama.trim()) {
      toast.error("Nama template wajib diisi");
      return;
    }
    if (!isOwner) {
      toast.error("Anda tidak memiliki izin mengubah template puskesmas lain. Gunakan tombol 'Duplikat'.");
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
    if (!isOwner) return;
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
      if (Array.isArray(data?.fields)) {
        setFields((prev) =>
          prev.map((f, i) => {
            const serverField = data.fields[i];
            return serverField?.id && !f.id ? { ...f, id: serverField.id } : f;
          }),
        );
      }
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
    if (!selectedTemplateId || isCreating || !isOwner) {
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
    matrixColumns,
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

      if (pollingRef.current) clearInterval(pollingRef.current);
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
            pollingRef.current = null;
            toast.success(`Import selesai: ${(statusData.result?.fields || []).length} butir pemeriksaan terdeteksi`);
          } else if (statusData.status === "failed") {
            clearInterval(interval);
            pollingRef.current = null;
            toast.error(statusData.error || "Gagal memproses file di worker");
          }
        } catch (err) {
          console.error("Polling import error:", err);
        }
      }, 2000);
      pollingRef.current = interval;
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

  function addMatrixColumn(customCode?: string, customLabel?: string) {
    const trimmedCode = (customCode || newColumnCode).trim().toUpperCase();
    const trimmedLabel = (customLabel || newColumnLabel).trim();
    let finalCode = trimmedCode;
    if (!finalCode) {
      const last = matrixColumns[matrixColumns.length - 1];
      if (last && last.code.length === 1 && last.code >= "A" && last.code < "Z") {
        finalCode = String.fromCharCode(last.code.charCodeAt(0) + 1);
      } else {
        finalCode = `Area ${matrixColumns.length + 1}`;
      }
    }
    if (matrixColumns.some((c) => c.code === finalCode)) {
      toast.error(`Kode kolom "${finalCode}" sudah ada`);
      return;
    }
    const finalLabel = trimmedLabel || `Area ${finalCode}`;
    setMatrixColumns([...matrixColumns, { code: finalCode, label: finalLabel }]);
    setNewColumnCode("");
    setNewColumnLabel("");
    toast.success(`Kolom Area "${finalCode}" berhasil ditambahkan`);
  }

  function updateMatrixColumn(index: number, key: "code" | "label", val: string) {
    setMatrixColumns((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: val };
      return next;
    });
  }

  function removeMatrixColumn(index: number) {
    if (matrixColumns.length <= 1) {
      toast.error("Minimal harus ada 1 kolom area");
      return;
    }
    const col = matrixColumns[index];
    setMatrixColumns(matrixColumns.filter((_, i) => i !== index));
    toast.info(`Kolom Area "${col.code}" dihapus`);
  }

  function loadContohMatriksSPPG() {
    setIsCreating(true);
    setSelectedTemplateId(null);
    setNama("IKL Satuan Pelayanan Pangan Bergizi (SPPG - Matriks Area)");
    setDeskripsi(
      "Inspeksi Kesehatan Lingkungan SPPG / Sentra Pangan / Faskes dengan format penilaian matriks multi-area (Area A-H atau kustom). Nilai dilingkari pada angka bobot jika persyaratan tidak terpenuhi di area terkait.",
    );
    setRumus("sppg_penalty");
    setCustomFormula("");
    setThresholdOperator(">=");
    setThresholdValue(80);
    setThresholdPassText("Memenuhi Syarat (MS)");
    setThresholdFailText("Tidak Memenuhi Syarat (TMS)");
    setDefaultYa(false);
    setMatrixColumns(DEFAULT_MATRIX_COLUMNS);
    setFields([
      {
        pertanyaan: "Nama Sarana / Unit SPPG",
        tipe: "TEXT",
        isRequired: true,
        grup: "__META__",
        skor: 0,
        skorBenar: 0,
        skorSalah: 0,
        opsi: "",
        autoFill: "",
      },
      {
        pertanyaan: "Nama Pengelola / Penanggung Jawab",
        tipe: "TEXT",
        isRequired: true,
        grup: "__META__",
        skor: 0,
        skorBenar: 0,
        skorSalah: 0,
        opsi: "",
        autoFill: "",
      },
      {
        pertanyaan: "Nama Petugas Pemeriksa",
        tipe: "TEXT",
        isRequired: true,
        grup: "__META__",
        skor: 0,
        skorBenar: 0,
        skorSalah: 0,
        opsi: "",
        autoFill: "USER_NAME",
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
      },
      {
        pertanyaan:
          "Lokasi bebas dari pencemaran (antara lain: tempat pembuangan sampah akhir/sementara, limbah, genangan air tercemar, semak belukar)",
        tipe: "MATRIX_AREA",
        isRequired: true,
        grup: "A. Lokasi dan Bangunan",
        subNomor: "1",
        areaScores: { A: 1, B: "NA", C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        allowNA: false,
      },
      {
        pertanyaan: "Bangunan kuat, terpelihara dan mudah dibersihkan",
        tipe: "MATRIX_AREA",
        isRequired: true,
        grup: "A. Lokasi dan Bangunan",
        subNomor: "2",
        areaScores: { A: 1, B: "NA", C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        allowNA: false,
      },
      {
        pertanyaan: "Lantai kedap air, rata, tidak licin, tidak retak dan mudah dibersihkan",
        tipe: "MATRIX_AREA",
        isRequired: true,
        grup: "A. Lokasi dan Bangunan",
        subNomor: "3",
        areaScores: { A: 1, B: "NA", C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        allowNA: false,
      },
      {
        pertanyaan: "Dinding bersih, terang, tahan air, tidak retak dan mudah dibersihkan",
        tipe: "MATRIX_AREA",
        isRequired: true,
        grup: "A. Lokasi dan Bangunan",
        subNomor: "4",
        areaScores: { A: 1, B: "NA", C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        allowNA: false,
      },
      {
        pertanyaan: "Langit-langit dengan tinggi yang cukup, bersih, bebas dari lubang, retakan dan mudah dibersihkan",
        tipe: "MATRIX_AREA",
        isRequired: true,
        grup: "A. Lokasi dan Bangunan",
        subNomor: "5",
        areaScores: { A: 2, B: 3, C: 3, D: 3, E: 3, F: 3, G: 3, H: 3 },
        skor: 23,
        skorBenar: 23,
        skorSalah: 0,
        opsi: "",
        allowNA: false,
      },
      {
        pertanyaan: "Pintu dan jendela membuka ke arah luar, rapat serangga dan tikus, serta dapat menutup sendiri",
        tipe: "MATRIX_AREA",
        isRequired: true,
        grup: "A. Lokasi dan Bangunan",
        subNomor: "6",
        areaScores: { A: 1, B: 1, C: 1, D: 2, E: 2, F: 2, G: 2, H: 1 },
        skor: 12,
        skorBenar: 12,
        skorSalah: 0,
        opsi: "",
        allowNA: false,
      },
      {
        pertanyaan: "Pencahayaan cukup terang di setiap ruangan dan tidak menyilaukan",
        tipe: "MATRIX_AREA",
        isRequired: true,
        grup: "A. Lokasi dan Bangunan",
        subNomor: "7",
        areaScores: { A: 1, B: 1, C: 1, D: 1, E: 2, F: 2, G: 1, H: 1 },
        skor: 10,
        skorBenar: 10,
        skorSalah: 0,
        opsi: "",
        allowNA: false,
      },
      {
        pertanyaan: "Ventilasi alami/mekanis berfungsi baik untuk menghilangkan uap, panas, asap, dan bau",
        tipe: "MATRIX_AREA",
        isRequired: true,
        grup: "A. Lokasi dan Bangunan — Penghawaan",
        subNomor: "8.a",
        areaScores: { A: "NA", B: 1, C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        allowNA: false,
      },
      {
        pertanyaan: "Suhu dan kelembaban ruang terjaga sesuai persyaratan jenis pangan",
        tipe: "MATRIX_AREA",
        isRequired: true,
        grup: "A. Lokasi dan Bangunan — Penghawaan",
        subNomor: "8.b",
        areaScores: { A: "NA", B: 1, C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
        skor: 1,
        skorBenar: 1,
        skorSalah: 0,
        opsi: "",
        allowNA: false,
      },
    ]);
    toast.success("Contoh Template SPPG Matriks Multi-Area berhasil dimuat!");
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
        pertanyaan: "Alamat Lokasi Usaha",
        tipe: "TEXT",
        isRequired: false,
        grup: "__META__",
        skor: 0,
        skorBenar: 0,
        skorSalah: 0,
        opsi: "",
        autoFill: "SASARAN_ALAMAT",
        targetGolongan: "ALL",
        isDisabled: false,
        dependsOn: null,
        allowNA: false,
      },
      {
        pertanyaan: "Nama Pengelola / Penanggung Jawab",
        tipe: "TEXT",
        isRequired: false,
        grup: "__META__",
        skor: 0,
        skorBenar: 0,
        skorSalah: 0,
        opsi: "",
        autoFill: "SASARAN_PEMILIK",
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

  function resetForm() {
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
    setMatrixColumns(DEFAULT_MATRIX_COLUMNS);
    setShowMatrixColManager(false);
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
    return [];
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

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.toLowerCase().trim();
    if (!q) return templates;
    return templates.filter(
      (t: any) =>
        (t.nama || "").toLowerCase().includes(q) ||
        (t.deskripsi || "").toLowerCase().includes(q) ||
        (t.subCategory?.nama || "").toLowerCase().includes(q),
    );
  }, [templates, templateSearch]);

  const totalTemplatePages = Math.max(1, Math.ceil(filteredTemplates.length / templateLimit));
  const paginatedTemplates = useMemo(() => {
    const start = (templatePage - 1) * templateLimit;
    return filteredTemplates.slice(start, start + templateLimit);
  }, [filteredTemplates, templatePage, templateLimit]);

  if ((session?.user as any)?.role === "ADMIN") {
    return (
      <div className="w-full min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center space-y-3">
        <ShieldAlert className="w-8 h-8 text-muted-foreground" />
        <p className="text-[13px] font-bold text-foreground">Akses Ditolak</p>
        <p className="text-[11px] text-muted-foreground">Halaman ini hanya untuk Operator / Puskesmas</p>
      </div>
    );
  }

  if (!selectedTemplateId && !isCreating) {
    return (
      <div className="w-full fade-in min-h-screen bg-canvas">
        {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
        <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
          <div className="w-full max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary mb-1.5 sm:mb-2">
                Builder
              </p>
              <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-none text-foreground">
                Form Pemeriksaan
              </h1>
              <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-2">
                <span className="tabular-nums font-semibold text-foreground">{templates.length}</span> template tersedia
                · Kelola parameter dan instrumen IKL
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                title="Lihat status antrean & riwayat upload"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-surface-subtle border border-border text-foreground text-[11px] font-bold hover:bg-surface transition shadow-xs"
              >
                <History className="w-3.5 h-3.5 text-primary" />
                <span>Status & Antrean</span>
                {(activeImportJob?.status === "processing" || activeImportJob?.status === "queued") && (
                  <span className="flex h-2 w-2 relative ml-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
              </button>
              <label className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-surface-subtle border border-border text-foreground text-[11px] font-bold hover:bg-surface transition shadow-xs cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-primary" /> Import
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
                type="button"
                onClick={loadContohMatriksSPPG}
                title="Muat contoh lembar inspeksi Matriks Multi-Area SPPG (8 Area A-H)"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-500/20 transition shadow-xs cursor-pointer"
              >
                🍱 Contoh Matriks SPPG
              </button>
              <button
                type="button"
                onClick={loadContohJajananKeliling}
                title="Muat contoh lengkap formulir Jajanan Keliling Golongan A1 & A2"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[11px] font-bold hover:bg-amber-500/20 transition shadow-xs cursor-pointer"
              >
                🍿 Contoh IKL Jajanan
              </button>
              <button
                onClick={() => {
                  setSelectedTemplateId(null);
                  setIsCreating(true);
                  resetForm();
                }}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-white text-[11px] font-bold hover:bg-primary-hover active:scale-95 transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Buat Template
              </button>
            </div>
          </div>
        </div>

        {/* ── CONTENT BODY (CANVAS) ── */}
        <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[72px] rounded-card bg-surface border border-border shadow-subtle animate-pulse"
                />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-card bg-surface border border-dashed border-border shadow-subtle p-10 flex flex-col items-center justify-center text-center">
              <FileText className="w-8 h-8 text-muted-foreground/40 mb-3" />
              <p className="text-[13px] font-bold text-foreground">Belum Ada Template</p>
              <p className="text-[12px] text-muted-foreground mt-1">Import PDF/Word atau buat manual.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={templateSearch}
                    onChange={(e) => {
                      setTemplateSearch(e.target.value);
                      setTemplatePage(1);
                    }}
                    placeholder="Cari template pemeriksaan..."
                    className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-surface text-[12px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>
                <span className="text-[11px] font-bold text-muted-foreground">
                  Menampilkan {paginatedTemplates.length} dari {filteredTemplates.length} template
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {paginatedTemplates.map((tpl: any) => {
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
                        setMatrixColumns(
                          Array.isArray(tpl.config?.matrixColumns) && tpl.config.matrixColumns.length > 0
                            ? tpl.config.matrixColumns
                            : DEFAULT_MATRIX_COLUMNS,
                        );
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
                              subNomor: f.config?.subNomor || f.subNomor || "",
                              areaScores: f.config?.areaScores || f.areaScores || {},
                              skor: f.config?.skor ?? f.skor ?? 0,
                              skorBenar: f.config?.skorBenar ?? f.skorBenar ?? 1,
                              skorSalah: f.config?.skorSalah ?? f.skorSalah ?? 0,
                            };
                          }),
                        );
                        setSubCategoryId(tpl.subCategoryId ?? null);
                        setDataDasarCategoryId(tpl.config?.dataDasarCategoryId ?? null);
                      }}
                      className="group flex items-stretch rounded-card border border-border bg-surface hover:border-primary/40 hover:shadow-subtle transition-all overflow-hidden text-left shadow-subtle"
                    >
                      <div className="w-1.5 shrink-0 bg-primary" />
                      <div className="flex-1 flex items-center gap-3 sm:gap-4 px-3.5 sm:px-5 py-3.5 sm:py-4">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-[12px] sm:text-[13px] font-extrabold text-foreground truncate group-hover:text-primary transition-colors">
                              {tpl.nama}
                            </h4>
                            {!tpl.puskesmasId ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 shrink-0">
                                🏛️ Dinkes
                              </span>
                            ) : tpl.puskesmas?.nama || tpl.config?.authorPuskesmas ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                  currentUserRole === "ADMIN" ||
                                  (tpl.puskesmasId && tpl.puskesmasId === currentUserPkmId)
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
                                }`}
                              >
                                🏥 {tpl.puskesmas?.nama || tpl.config?.authorPuskesmas}
                              </span>
                            ) : null}
                            {currentUserRole !== "ADMIN" && tpl.puskesmasId && tpl.puskesmasId !== currentUserPkmId && (
                              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                Publik
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground flex-wrap">
                            <span className="font-semibold">
                              {tpl.subCategory ? tpl.subCategory.nama : "Tanpa sub kategori"}
                            </span>
                            {tpl.config?.authorName && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 font-medium text-foreground/80">
                                  👤 {tpl.config.authorName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2.5 sm:gap-4">
                          <div className="text-center">
                            <div className="text-[14px] sm:text-[16px] font-black tabular-nums leading-none text-foreground">
                              {fieldCount}
                            </div>
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mt-0.5">
                              Butir
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[14px] sm:text-[16px] font-black tabular-nums leading-none text-primary">
                              {grupCount}
                            </div>
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mt-0.5">
                              Grup
                            </div>
                          </div>
                          {(currentUserRole === "ADMIN" ||
                            (tpl.puskesmasId && tpl.puskesmasId === currentUserPkmId)) && (
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
                          )}
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pagination Controls Template */}
              {totalTemplatePages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <button
                    onClick={() => setTemplatePage((p) => Math.max(1, p - 1))}
                    disabled={templatePage <= 1}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface text-[12px] font-bold text-foreground disabled:opacity-30 disabled:pointer-events-none hover:bg-surface-subtle shadow-subtle transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Sebelumnya
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalTemplatePages }).map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setTemplatePage(i + 1)}
                        className={`w-8 h-8 rounded-lg text-[12px] font-bold transition-all ${
                          templatePage === i + 1
                            ? "bg-primary text-white shadow-subtle"
                            : "text-muted-foreground hover:bg-surface-subtle"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setTemplatePage((p) => Math.min(totalTemplatePages, p + 1))}
                    disabled={templatePage >= totalTemplatePages}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface text-[12px] font-bold text-foreground disabled:opacity-30 disabled:pointer-events-none hover:bg-surface-subtle shadow-subtle transition-colors"
                  >
                    Selanjutnya <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
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
    <div className="w-full fade-in min-h-screen bg-canvas">
      {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
      <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-4 sm:py-5">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => {
                setSelectedTemplateId(null);
                setIsCreating(false);
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-surface-subtle hover:bg-surface border border-border text-[11px] font-bold text-foreground transition-all shrink-0 shadow-xs"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali
            </button>
            <div className="h-6 w-px bg-border shrink-0" />
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama Template..."
              className="flex-1 text-[18px] sm:text-[22px] font-black text-foreground placeholder:text-muted-foreground/40 outline-none bg-transparent tracking-tight min-w-0"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {/* Auto-save status */}
            {selectedTemplateId && !isCreating && (
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-full border transition-colors ${
                  autoSaveState === "saved"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : autoSaveState === "saving"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : autoSaveState === "error"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : autoSaveState === "dirty"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-muted text-muted-foreground border-border"
                }`}
                title="Perubahan tersimpan otomatis setelah 2 detik"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    autoSaveState === "saved"
                      ? "bg-emerald-500"
                      : autoSaveState === "saving"
                        ? "bg-blue-500 animate-pulse"
                        : autoSaveState === "error"
                          ? "bg-rose-500"
                          : autoSaveState === "dirty"
                            ? "bg-amber-500"
                            : "bg-muted-foreground"
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
              onClick={loadContohMatriksSPPG}
              title="Muat contoh lembar inspeksi Matriks Multi-Area SPPG (8 Area A-H)"
              className="flex items-center justify-center gap-1.5 h-11 px-3.5 text-[11px] font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors rounded-xl flex-1 sm:flex-initial"
            >
              🍱 Contoh Matriks SPPG
            </button>
            <button
              type="button"
              onClick={loadContohJajananKeliling}
              title="Muat contoh lengkap formulir Jajanan Keliling Golongan A1 & A2"
              className="flex items-center justify-center gap-1.5 h-11 px-3.5 text-[11px] font-bold border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-colors rounded-xl flex-1 sm:flex-initial"
            >
              🍿 Contoh A1 / A2
            </button>
            {selectedTemplateId && isOwner && (
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
                className="flex items-center justify-center gap-1.5 h-11 px-3.5 text-[12px] font-bold border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors rounded-xl shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Hapus</span>
              </button>
            )}
            {selectedTemplateId && !isOwner && (
              <button
                type="button"
                onClick={handleDuplicate}
                className="flex items-center justify-center gap-1.5 h-9 px-4 text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700 transition-all rounded-full shadow-xs shrink-0"
              >
                <Copy className="w-3.5 h-3.5" /> Duplikat
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleSave}
                disabled={createMutation.isPending}
                className="flex items-center justify-center gap-2 h-9 px-5 text-[11px] font-bold bg-primary text-white hover:bg-primary-hover disabled:opacity-40 transition-all rounded-full shadow-xs flex-1 sm:flex-initial"
              >
                <Check className="w-4 h-4" />
                {createMutation.isPending ? "Menyimpan..." : "Simpan"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT BODY (CANVAS) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
        {!isOwner && activeTemplate && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-card border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-[12px] font-medium shadow-subtle">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Mode Pratinjau (Read-Only):</strong> Template ini dibuat oleh{" "}
                <strong>
                  {activeTemplate.puskesmas?.nama || activeTemplate.config?.authorPuskesmas || "Puskesmas Lain"}
                </strong>
                {activeTemplate.config?.authorName ? ` (${activeTemplate.config.authorName})` : ""}. Anda dapat melihat
                butir pertanyaan atau menduplikatnya untuk disesuaikan dengan Puskesmas Anda.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDuplicate}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 transition-colors shadow-xs"
            >
              <Copy className="w-3.5 h-3.5" /> Duplikat ke Puskesmas Saya
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">
          {/* Left Panel: Config */}
          <div className="space-y-4">
            {/* Konfigurasi Sasaran & Kolom Area Matriks */}
            <div className="rounded-card bg-surface border border-border shadow-subtle overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-surface-subtle/50">
                <span className="text-[12px] font-bold text-foreground">Sasaran & Deskripsi Laporan</span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em] mb-2 block">
                    Deskripsi Form
                  </label>
                  <textarea
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    rows={2}
                    placeholder="Tuliskan keterangan sasaran dan tujuan form inspeksi..."
                    className="w-full text-[13px] text-foreground placeholder:text-muted-foreground/40 border border-border rounded-xl px-3 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-surface resize-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em] mb-2 block">
                    Kategori Sasaran (Data Dasar)
                  </label>
                  <select
                    value={dataDasarCategoryId || ""}
                    onChange={(e) => setDataDasarCategoryId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full h-10 px-3 text-[13px] font-medium border border-border rounded-xl outline-none bg-surface hover:bg-surface-subtle/50 focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground transition-all cursor-pointer appearance-none"
                  >
                    <option value="">— Pilih Kategori Sasaran —</option>
                    {categories
                      .filter((c: any) => (c.parameters || []).some((p: any) => p.isBaseline))
                      .map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.nama}
                        </option>
                      ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Sumber master data objek/lokasi sasaran (SPPG, RS, Restoran, dll)
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em] mb-2 block">
                    Sub Kategori Laporan
                  </label>
                  <select
                    value={subCategoryId || ""}
                    onChange={(e) => setSubCategoryId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full h-10 px-3 text-[13px] font-medium border border-border rounded-xl outline-none bg-surface hover:bg-surface-subtle/50 focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground transition-all cursor-pointer appearance-none"
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
                  <p className="text-[11px] text-muted-foreground mt-2">Referensi input untuk agregasi laporan</p>
                </div>

                {/* Kolom Area Matriks Terpadu di Sasaran */}
                <div className="pt-3 border-t border-border space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-5 h-5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-[10px] font-black shrink-0">
                        ⊞
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-foreground truncate">
                        Kolom Area Matriks ({matrixColumns.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMatrixColManager(!showMatrixColManager)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-border hover:bg-surface-subtle text-muted-foreground transition shrink-0"
                    >
                      {showMatrixColManager ? "Tutup" : "Kelola"}
                    </button>
                  </div>

                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Area inspeksi sasaran dinamis. Dapat ditambah tanpa batas (A-H, I, dst).
                  </p>

                  {/* Ringkasan Kode Area Pill */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {matrixColumns.map((col, cIdx) => (
                      <span
                        key={cIdx}
                        title={`${col.code}: ${col.label}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-subtle border border-border text-[10px] font-bold text-foreground"
                      >
                        <strong className="text-primary">{col.code}</strong>
                        <span className="text-[11px] text-muted-foreground max-w-[80px] truncate hidden sm:inline">
                          {col.label}
                        </span>
                      </span>
                    ))}
                  </div>

                  {/* Mode Detail / Manager */}
                  {showMatrixColManager && (
                    <div className="pt-2 border-t border-border space-y-2">
                      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                        {matrixColumns.map((col, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 p-1 rounded-lg border border-border bg-surface-subtle/40"
                          >
                            <input
                              type="text"
                              value={col.code}
                              onChange={(e) => updateMatrixColumn(idx, "code", e.target.value.toUpperCase())}
                              className="w-9 h-6 text-center text-[10px] font-black uppercase rounded bg-surface border border-border outline-none focus:border-primary text-foreground"
                              placeholder="Kode"
                            />
                            <input
                              type="text"
                              value={col.label}
                              onChange={(e) => updateMatrixColumn(idx, "label", e.target.value)}
                              className="flex-1 h-6 px-2 text-[10px] font-medium rounded bg-surface border border-border outline-none focus:border-primary text-foreground"
                              placeholder="Keterangan area..."
                            />
                            <button
                              type="button"
                              onClick={() => removeMatrixColumn(idx)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
                              title="Hapus kolom"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Form Tambah Kolom Baru */}
                      <div className="pt-2 border-t border-dashed border-border space-y-1.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                          + Tambah Kolom Baru
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={newColumnCode}
                            onChange={(e) => setNewColumnCode(e.target.value.toUpperCase())}
                            placeholder={
                              matrixColumns.length > 0 && matrixColumns[matrixColumns.length - 1].code.length === 1
                                ? String.fromCharCode(matrixColumns[matrixColumns.length - 1].code.charCodeAt(0) + 1)
                                : `A${matrixColumns.length + 1}`
                            }
                            className="w-12 h-7 px-1 text-center text-[10px] font-black uppercase rounded-lg border border-border bg-surface outline-none focus:border-primary text-foreground"
                          />
                          <input
                            type="text"
                            value={newColumnLabel}
                            onChange={(e) => setNewColumnLabel(e.target.value)}
                            placeholder="Deskripsi area..."
                            className="flex-1 h-7 px-2 text-[10px] font-medium rounded-lg border border-border bg-surface outline-none focus:border-primary text-foreground"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addMatrixColumn();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => addMatrixColumn()}
                            className="h-7 px-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[10px] font-bold shrink-0 transition shadow-xs"
                          >
                            <Plus className="w-3 h-3 inline mr-0.5" /> Tambah
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setMatrixColumns(DEFAULT_MATRIX_COLUMNS);
                              toast.info("Kolom area direset ke standar A s/d H");
                            }}
                            className="text-[11px] text-muted-foreground hover:text-foreground underline"
                          >
                            Reset ke Default (A-H)
                          </button>
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            Total: {matrixColumns.length} Kolom
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rumus Penilaian */}
            <div className="rounded-card bg-surface border border-border shadow-subtle overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-surface-subtle/50">
                <span className="text-[12px] font-bold text-foreground">Rumus Penilaian</span>
                <span className="ml-auto text-[11px] font-bold text-muted-foreground">{rumusLabel}</span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em] mb-2 block">
                    Metode
                  </label>
                  <select
                    value={rumus}
                    onChange={(e) => setRumus(e.target.value)}
                    className="w-full h-10 px-3 text-[13px] font-medium border border-border rounded-xl outline-none bg-surface hover:bg-surface-subtle/50 focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground transition-all cursor-pointer appearance-none"
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
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em] mb-2 block">
                      Rumus Kustom
                    </label>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {["SUM()", "AVG()", "MIN()", "MAX()", "COUNT()", "✓", "✗"].map((fn) => (
                        <button
                          key={fn}
                          onClick={() => setCustomFormula((prev) => `${prev}${fn}`)}
                          className="text-[10px] font-bold px-2.5 py-1 border border-border hover:bg-surface-subtle transition-colors rounded-md"
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
                      className="w-full text-[13px] text-foreground placeholder:text-muted-foreground/40 border border-border rounded-xl px-3 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-surface resize-none font-mono transition-all"
                    />
                  </div>
                )}
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-[32px] font-black text-foreground tabular-nums leading-none">
                    {demoSkorTerisi}
                  </span>
                  <span className="text-[13px] text-muted-foreground">/ {totalSkor}</span>
                  <span className="text-[13px] font-bold text-primary">{demoPersentase}%</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {RUMUS_OPTIONS.find((r) => r.value === rumus)?.desc}
                </p>
              </div>
            </div>

            {/* Ambang Batas */}
            <div className="rounded-card bg-surface border border-border shadow-subtle overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-surface-subtle/50">
                <span className="text-[12px] font-bold text-foreground">Ambang Batas Kelulusan</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-muted-foreground">Jika Akhir</span>
                  <select
                    value={thresholdOperator}
                    onChange={(e) => setThresholdOperator(e.target.value)}
                    className="h-9 px-3 text-[12px] font-bold border border-border bg-surface rounded-xl outline-none focus:border-primary text-foreground"
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
                    className="w-20 h-9 px-3 text-[12px] font-bold border border-border bg-surface rounded-xl outline-none focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={thresholdPassText}
                    onChange={(e) => setThresholdPassText(e.target.value)}
                    placeholder="Teks lulus"
                    className="w-full h-10 px-3 text-[12px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 outline-none focus:border-emerald-500 rounded-xl"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={thresholdFailText}
                    onChange={(e) => setThresholdFailText(e.target.value)}
                    placeholder="Teks tidak lulus"
                    className="w-full h-10 px-3 text-[12px] text-rose-700 dark:text-rose-300 font-bold bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 outline-none focus:border-rose-500 rounded-xl"
                  />
                </div>
                {/* Mode penilaian cepat */}
                <button
                  type="button"
                  onClick={() => setDefaultYa(!defaultYa)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    defaultYa ? "border-primary/40 bg-primary-subtle" : "border-border hover:bg-surface-subtle"
                  }`}
                >
                  <span
                    className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${
                      defaultYa ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-subtle transition-all ${
                        defaultYa ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12px] font-bold text-foreground">Mode Penilaian Cepat</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      Semua butir default Ya — operator cukup tandai yang negatif
                    </span>
                  </span>
                </button>
              </div>
            </div>

            {/* Agregasi Laporan Bulanan */}
            <div className="rounded-card bg-surface border border-border shadow-subtle overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-border bg-surface-subtle/50">
                <div className="flex items-center gap-2 min-w-0">
                  <BarChart3 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-[12px] font-bold truncate text-foreground">Agregasi Laporan Bulanan</span>
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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                      Belum Terpetakan
                    </span>
                  ))}
              </div>

              <div className="p-4 sm:p-5 space-y-3.5">
                {!subCategoryId ? (
                  <div className="py-4 px-3 text-center space-y-2 rounded-xl border border-dashed border-border bg-surface-subtle/50">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <p className="text-[12px] font-bold text-foreground">Sub Kategori Belum Dipilih</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                      Pilih <strong>Sub Kategori Laporan</strong> pada form di atas terlebih dahulu untuk memetakan
                      parameter agregasi bulanan.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-subtle border border-border text-[11px]">
                      <div className="min-w-0">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                          Target Laporan
                        </span>
                        <span className="font-bold text-foreground truncate block">
                          {selectedLaporanCategory?.nama || "Kategori"} → {selectedSubCategory?.nama || "Sub Kategori"}
                        </span>
                      </div>
                      {availableParameters.length > 0 && (
                        <button
                          type="button"
                          onClick={handleAutoMatchParameters}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-primary-subtle text-primary hover:bg-primary/20 border border-primary/30 transition shrink-0"
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
                            className={`p-3 rounded-xl border border-border bg-surface transition-all ${item.accentBorder} ${
                              item.value ? "ring-1 ring-border shadow-subtle" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Icon className={`w-3.5 h-3.5 shrink-0 ${item.iconColor}`} />
                                <span className="text-[11px] font-bold text-foreground truncate">{item.label}</span>
                              </div>
                              <span
                                className={`text-[11px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${item.badgeClass}`}
                              >
                                {item.badge}
                              </span>
                            </div>
                            <select
                              value={item.value || ""}
                              onChange={(e) => item.setter(e.target.value ? Number(e.target.value) : null)}
                              className="w-full h-9 px-2.5 text-[11px] font-bold border border-border rounded-lg bg-surface text-foreground outline-none hover:bg-surface-subtle transition-colors cursor-pointer"
                            >
                              <option value="">— Belum Dipetakan —</option>
                              {availableParameters.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                  {p.nama} {p.code ? `(${p.code})` : ""}
                                </option>
                              ))}
                            </select>
                            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{item.desc}</p>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
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
              <div className="sticky top-0 z-20 -mx-1 px-1 py-2 mb-3 bg-canvas/95 backdrop-blur border-b border-border">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {groupedFields.map((g) => (
                    <button
                      key={g.grup}
                      onClick={() => scrollToGroup(g.grup)}
                      className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold transition-colors ${
                        activeGroup === g.grup
                          ? "bg-primary text-white shadow-subtle"
                          : "bg-surface text-muted-foreground hover:bg-surface-subtle hover:text-foreground border border-border"
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
                      <span className="text-[11px] opacity-70">{g.fields.length}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-card bg-surface border border-border shadow-subtle overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-surface-subtle/50">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-[12px] font-bold text-foreground">Daftar Ceklis</span>
                <span className="text-[11px] font-bold text-muted-foreground">{fields.length} item</span>
                <span className="text-[11px] text-muted-foreground">· {groupedFields.length} bagian</span>
                <div className="ml-auto flex items-center gap-2">
                  {groupedFields.length > 0 && (
                    <div className="flex items-center rounded-lg border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleAllGroups(false)}
                        className="px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-surface-subtle transition-colors"
                        title="Buka semua bagian"
                      >
                        Buka
                      </button>
                      <span className="w-px h-4 bg-border" />
                      <button
                        type="button"
                        onClick={() => toggleAllGroups(true)}
                        className="px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-surface-subtle transition-colors"
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
                    className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 bg-primary text-white hover:bg-primary-hover transition-colors rounded-lg shadow-subtle"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Butir
                  </button>
                </div>
              </div>

              {fields.length === 0 ? (
                <div className="p-12 text-center space-y-4">
                  <p className="text-[14px] text-muted-foreground">Belum ada butir pemeriksaan</p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <button
                      onClick={() => addField("__META__")}
                      className="flex items-center gap-2 h-10 px-4 text-[12px] font-bold border border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors rounded-xl"
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
                      className="flex items-center gap-2 h-10 px-4 text-[12px] font-bold border border-border hover:bg-surface-subtle transition-colors rounded-xl"
                    >
                      <FolderPlus className="w-4 h-4" /> Tambah Grup
                    </button>
                    <button
                      onClick={() => addField()}
                      className="flex items-center gap-2 h-10 px-4 text-[12px] font-bold bg-primary text-white hover:bg-primary-hover transition-colors rounded-xl shadow-subtle"
                    >
                      <Plus className="w-4 h-4" /> Tambah Butir
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
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
                          ? "border-primary bg-primary-subtle text-primary ring-2 ring-primary/40 scale-[1.01]"
                          : "border-primary/40 bg-primary-subtle/50 text-primary hover:bg-primary-subtle"
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
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors hover:bg-surface-subtle ${
                            group.subbagian ? "pl-10 bg-surface-subtle/70" : "bg-surface-subtle/40"
                          } ${
                            dragState?.type === "field" && dropTarget === `group:${group.grup}`
                              ? "ring-2 ring-inset ring-primary bg-primary-subtle"
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
                            <GripVertical className="w-4 h-4 shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing hover:text-primary" />
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 text-muted-foreground transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                          />
                          <div
                            className={`w-9 h-7 flex items-center justify-center text-[11px] font-black shrink-0 rounded-lg ${
                              group.grup === "__META__"
                                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
                                : group.subbagian
                                  ? "bg-primary-subtle text-primary border border-primary/20"
                                  : "bg-primary text-white"
                            }`}
                          >
                            {group.grup === "__META__"
                              ? "M"
                              : group.subbagian
                                ? `${toRoman(group.areaIndex)}.${group.subIndex}`
                                : toRoman(group.areaIndex)}
                          </div>
                          {group.grup === "__META__" ? (
                            <span className="flex-1 text-[13px] font-bold text-muted-foreground tracking-wide">
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
                              className="flex-1 text-[13px] font-bold border border-primary/50 rounded-lg px-2 py-1 outline-none bg-surface text-foreground"
                            />
                          ) : (
                            <span className="flex-1 text-[13px] font-bold text-foreground tracking-wide truncate">
                              {(group.subbagian || group.grup).toUpperCase()}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground shrink-0">{group.fields.length} item</span>
                          {/* Geser atas/bawah grup / metadata */}
                          {editingGroupKey !== group.grup && (
                            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => moveGroup(group.grup, "up")}
                                disabled={groupedFields.indexOf(group) === 0}
                                title={group.grup === "__META__" ? "Geser metadata ke atas" : "Geser bagian ke atas"}
                                className="p-1.5 rounded-md text-muted-foreground hover:bg-surface-subtle hover:text-foreground disabled:opacity-25 transition-colors"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveGroup(group.grup, "down")}
                                disabled={groupedFields.indexOf(group) === groupedFields.length - 1}
                                title={group.grup === "__META__" ? "Geser metadata ke bawah" : "Geser bagian ke bawah"}
                                className="p-1.5 rounded-md text-muted-foreground hover:bg-surface-subtle hover:text-foreground disabled:opacity-25 transition-colors"
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
                                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-primary-subtle text-primary border border-primary/20 hover:bg-primary/20 transition-colors rounded-md"
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
                                className="p-1.5 rounded-md text-muted-foreground hover:bg-surface-subtle hover:text-foreground transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addSubbagian(group.area);
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 border border-border bg-surface hover:bg-surface-subtle transition-colors rounded-md"
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
                                  className="text-[11px] font-bold bg-surface border border-border px-1 py-1 outline-none rounded-md text-muted-foreground hover:border-purple-400"
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
                                className="p-1.5 rounded-md text-muted-foreground hover:bg-surface-subtle hover:text-foreground transition-colors"
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
                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 border border-border bg-surface hover:bg-surface-subtle transition-colors rounded-md"
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
                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 border border-rose-200 dark:border-rose-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors rounded-md"
                            title={group.grup === "__META__" ? "Hapus seluruh grup metadata" : "Hapus grup ini"}
                          >
                            <Trash2 className="w-3 h-3" /> Hapus
                          </button>
                        </div>

                        {/* Inline add subbagian */}
                        {addingInline?.type === "sub" && addingInline.area === group.area && !group.subbagian && (
                          <div className="flex items-center gap-2 px-5 py-3 bg-primary-subtle/50 border-t border-primary/20">
                            <span className="text-[11px] font-bold text-primary shrink-0">Subbagian {group.area}:</span>
                            <input
                              autoFocus
                              value={inlineName}
                              onChange={(e) => setInlineName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") submitInline();
                                if (e.key === "Escape") setAddingInline(null);
                              }}
                              placeholder="Nama subbagian..."
                              className="flex-1 h-8 px-3 text-[12px] border border-primary/30 rounded-lg outline-none focus:border-primary bg-surface text-foreground"
                            />
                            <button
                              onClick={submitInline}
                              className="h-8 px-3 text-[11px] font-bold bg-primary text-white rounded-lg hover:bg-primary-hover shadow-subtle"
                            >
                              Tambah
                            </button>
                            <button
                              onClick={() => setAddingInline(null)}
                              className="h-8 px-3 text-[11px] font-bold text-muted-foreground hover:bg-surface-subtle rounded-lg"
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
                          <div className="border-t border-border bg-surface-subtle/30 p-3 space-y-2.5">
                            {group.fields.map(({ field, index }: { field: any; index: number }, localIdx: number) => {
                              return (
                                <div
                                  key={index}
                                  draggable
                                  onDragStart={(e) => {
                                    // Jangan drag kalau mulai dari kontrol interaktif (tetap bisa edit)
                                    const el = e.target as HTMLElement;
                                    if (el.closest("input, select, textarea, button, label")) {
                                      e.preventDefault();
                                      return;
                                    }
                                    // Set dragState di sini untuk SEMUA jalur (grip & badan kartu);
                                    // handler grip juga set sama — dobel tidak masalah, nilainya identik.
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
                                  className={`rounded-xl border bg-surface p-3 transition-all cursor-grab active:cursor-grabbing ${
                                    field.isDisabled
                                      ? "border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 opacity-75"
                                      : "border-border hover:border-primary/40 shadow-subtle"
                                  } ${
                                    dragState?.type === "field" && dropTarget === `field:${index}`
                                      ? "border-t-2 border-t-primary ring-1 ring-primary/40"
                                      : ""
                                  } ${dragState?.index === index ? "opacity-40" : ""}`}
                                >
                                  {/* Baris utama: nomor + pertanyaan + aksi */}
                                  <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                                      <span
                                        draggable
                                        onDragStart={(e) => {
                                          setDragState({ type: "field", index });
                                          e.dataTransfer.effectAllowed = "move";
                                          e.dataTransfer.setData("text/plain", String(index));
                                        }}
                                        onDragEnd={resetDrag}
                                        title="Tarik untuk memindahkan butir (atau tarik kartu ini)"
                                        className="cursor-grab active:cursor-grabbing"
                                      >
                                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-primary transition-colors" />
                                      </span>
                                      <span className="w-6 h-6 flex items-center justify-center text-[10px] font-black rounded-md bg-surface-subtle text-muted-foreground border border-border">
                                        {localIdx + 1}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => moveField(index, "up")}
                                        disabled={index === 0}
                                        title="Geser ke atas"
                                        className="p-0.5 rounded text-muted-foreground hover:bg-surface-subtle hover:text-primary disabled:opacity-20 transition-colors"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => moveField(index, "down")}
                                        disabled={index === fields.length - 1}
                                        title="Geser ke bawah"
                                        className="p-0.5 rounded text-muted-foreground hover:bg-surface-subtle hover:text-primary disabled:opacity-20 transition-colors"
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
                                        className={`w-full text-[13px] font-semibold bg-transparent outline-none border-b-2 border-transparent focus:border-primary/50 px-1 py-0.5 text-foreground ${
                                          field.isDisabled ? "line-through text-muted-foreground" : ""
                                        }`}
                                      />

                                      {/* Baris kontrol: tipe, opsi, kondisional, sasaran */}
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <select
                                          value={field.tipe}
                                          onChange={(e) => updateField(index, "tipe", e.target.value)}
                                          className="text-[10px] font-bold bg-surface-subtle border border-border px-1.5 py-1 outline-none rounded-md text-foreground"
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
                                            className="w-44 text-[10px] bg-surface-subtle/50 border border-dashed border-border px-1.5 py-1 outline-none rounded-md focus:border-primary/50 text-foreground"
                                          />
                                        )}

                                        {group.grup === "__META__" ? (
                                          <>
                                            <select
                                              value={field.autoFill || ""}
                                              onChange={(e) => updateField(index, "autoFill", e.target.value || "")}
                                              className="text-[10px] bg-surface-subtle/50 border border-dashed border-border px-1.5 py-1 outline-none rounded-md text-foreground"
                                            >
                                              <option value="">Manual (Diisi Saat Input)</option>
                                              <option value="USER_NAME">👤 Otomatis Nama Akun</option>
                                              <option value="USER_PUSKESMAS">🏥 Otomatis Puskesmas</option>
                                            </select>
                                            {field.autoFill === "USER_NAME" && (
                                              <span className="text-[11px] font-bold text-primary bg-primary-subtle border border-primary/20 px-1.5 py-0.5 rounded">
                                                Nama Petugas
                                              </span>
                                            )}
                                            {field.autoFill === "USER_PUSKESMAS" && (
                                              <span className="text-[11px] font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">
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
                                            className="text-[10px] max-w-[220px] bg-surface-subtle/50 border border-dashed border-border px-1.5 py-1 outline-none rounded-md text-muted-foreground"
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
                                            className="text-[10px] max-w-[180px] bg-surface-subtle/50 border border-dashed border-border px-1.5 py-1 outline-none rounded-md text-muted-foreground"
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
                                              className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md bg-surface-subtle hover:bg-primary-subtle hover:text-primary text-muted-foreground border border-dashed border-border transition-colors"
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
                                                className="text-[11px] font-bold bg-surface-subtle border border-dashed border-border px-1 py-1 outline-none rounded-md text-muted-foreground hover:border-purple-400"
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

                                      {/* Sasaran untuk non-meta (khusus tipe non-matriks karena matriks sudah dinilai per kolom area) */}
                                      {group.grup !== "__META__" &&
                                        field.tipe !== "MATRIX_AREA" &&
                                        availableSasaranOptions.length > 0 && (
                                          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/50">
                                            <span className="text-[10px] font-bold text-muted-foreground">
                                              🎯 Sasaran:
                                            </span>
                                            <div className="inline-flex flex-wrap gap-0.5 rounded-md border border-border bg-surface p-0.5 text-[10px]">
                                              <button
                                                type="button"
                                                onClick={() => updateField(index, "targetGolongan", "ALL")}
                                                className={`px-2 py-0.5 rounded transition-colors ${
                                                  !field.targetGolongan || field.targetGolongan === "ALL"
                                                    ? "bg-primary text-white font-bold shadow-subtle"
                                                    : "text-muted-foreground hover:text-foreground"
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
                                                        : "text-muted-foreground hover:text-foreground"
                                                    }`}
                                                  >
                                                    {opt}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                            {field.targetGolongan && field.targetGolongan !== "ALL" && (
                                              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-200">
                                                🎯 Khusus {field.targetGolongan}
                                              </span>
                                            )}
                                          </div>
                                        )}

                                      {field.dependsOn && (
                                        <span className="inline-block text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                          🔒 Tergantung Butir {field.dependsOn.parentIndex + 1} (
                                          {field.dependsOn.requiredValue === "TRUE" ? "Ya" : "Tidak"})
                                        </span>
                                      )}

                                      {/* Editor Bobot Matriks Multi-Area Dinamis */}
                                      {field.tipe === "MATRIX_AREA" && (
                                        <div className="mt-2 p-2.5 rounded-lg border border-primary/25 bg-primary-subtle/20 space-y-2">
                                          <div className="flex items-center justify-between flex-wrap gap-1.5">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[10px] font-black text-primary uppercase tracking-wide">
                                                📊 Bobot Area
                                              </span>
                                              <span className="text-[11px] text-muted-foreground">
                                                (Sub-nomor & bobot penalti {matrixColumns.length} kolom)
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px]">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newScores: Record<string, any> = {};
                                                  matrixColumns.forEach((col) => {
                                                    newScores[col.code] = 1;
                                                  });
                                                  const totalSkor = matrixColumns.reduce((sum, col) => {
                                                    const s = newScores[col.code];
                                                    return sum + (typeof s === "number" ? s : 0);
                                                  }, 0);
                                                  setFields(
                                                    fields.map((f, i) =>
                                                      i === index
                                                        ? { ...f, areaScores: newScores, skor: totalSkor }
                                                        : f,
                                                    ),
                                                  );
                                                }}
                                                className="px-1.5 py-0.5 rounded border border-border bg-surface text-muted-foreground hover:text-foreground font-semibold"
                                              >
                                                Semua 1
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newScores: Record<string, any> = {};
                                                  matrixColumns.forEach((col) => {
                                                    newScores[col.code] = 2;
                                                  });
                                                  const totalSkor = matrixColumns.reduce((sum, col) => {
                                                    const s = newScores[col.code];
                                                    return sum + (typeof s === "number" ? s : 0);
                                                  }, 0);
                                                  setFields(
                                                    fields.map((f, i) =>
                                                      i === index
                                                        ? { ...f, areaScores: newScores, skor: totalSkor }
                                                        : f,
                                                    ),
                                                  );
                                                }}
                                                className="px-1.5 py-0.5 rounded border border-border bg-surface text-muted-foreground hover:text-foreground font-semibold"
                                              >
                                                Semua 2
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newScores: Record<string, any> = {};
                                                  matrixColumns.forEach((col) => {
                                                    newScores[col.code] = 3;
                                                  });
                                                  const totalSkor = matrixColumns.reduce((sum, col) => {
                                                    const s = newScores[col.code];
                                                    return sum + (typeof s === "number" ? s : 0);
                                                  }, 0);
                                                  setFields(
                                                    fields.map((f, i) =>
                                                      i === index
                                                        ? { ...f, areaScores: newScores, skor: totalSkor }
                                                        : f,
                                                    ),
                                                  );
                                                }}
                                                className="px-1.5 py-0.5 rounded border border-border bg-surface text-muted-foreground hover:text-foreground font-semibold"
                                              >
                                                Semua 3
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newScores: Record<string, any> = {};
                                                  matrixColumns.forEach((col) => {
                                                    newScores[col.code] = "NA";
                                                  });
                                                  setFields(
                                                    fields.map((f, i) =>
                                                      i === index ? { ...f, areaScores: newScores, skor: 0 } : f,
                                                    ),
                                                  );
                                                }}
                                                className="px-1.5 py-0.5 rounded border border-border bg-surface text-muted-foreground hover:text-foreground font-semibold"
                                              >
                                                Semua NA
                                              </button>
                                            </div>
                                          </div>

                                          {/* Sub-Nomor */}
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                                              Sub-Nomor:
                                            </span>
                                            <input
                                              type="text"
                                              value={field.subNomor || field.config?.subNomor || ""}
                                              onChange={(e) => updateField(index, "subNomor", e.target.value)}
                                              placeholder="Misal: 1, 8.a, II.b"
                                              className="w-24 text-[11px] font-bold bg-surface border border-border px-2 py-0.5 rounded outline-none focus:border-primary text-foreground"
                                            />
                                            <span className="text-[11px] text-muted-foreground">
                                              (Nomor urut kriteria di lembar kertas formulir)
                                            </span>
                                          </div>

                                          {/* Grid Kolom Dinamis */}
                                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5 pt-1">
                                            {matrixColumns.map((col) => {
                                              const currentVal =
                                                field.areaScores?.[col.code] ??
                                                field.config?.areaScores?.[col.code] ??
                                                "NA";
                                              return (
                                                <div
                                                  key={col.code}
                                                  className={`p-1.5 rounded border flex flex-col items-center gap-1 ${
                                                    currentVal === "NA"
                                                      ? "bg-surface/50 border-border/60 opacity-75"
                                                      : "bg-surface border-primary/40 shadow-xs"
                                                  }`}
                                                >
                                                  <div className="flex items-center justify-between w-full">
                                                    <span className="text-[10px] font-black text-foreground">
                                                      {col.code}
                                                    </span>
                                                    <span
                                                      className="text-[10px] text-muted-foreground truncate max-w-[60px]"
                                                      title={col.label}
                                                    >
                                                      {col.label.split(" ")[0]}
                                                    </span>
                                                  </div>
                                                  <select
                                                    value={String(currentVal)}
                                                    onChange={(e) => {
                                                      const val =
                                                        e.target.value === "NA" ? "NA" : Number(e.target.value);
                                                      const updatedAreaScores = {
                                                        ...(field.areaScores || field.config?.areaScores || {}),
                                                        [col.code]: val,
                                                      };
                                                      const totalSkor = matrixColumns.reduce((sum, c) => {
                                                        const s = updatedAreaScores[c.code];
                                                        return sum + (typeof s === "number" ? s : 0);
                                                      }, 0);
                                                      setFields(
                                                        fields.map((f, i) =>
                                                          i === index
                                                            ? { ...f, areaScores: updatedAreaScores, skor: totalSkor }
                                                            : f,
                                                        ),
                                                      );
                                                    }}
                                                    className={`w-full text-center text-[10px] font-bold py-0.5 rounded outline-none border transition-colors ${
                                                      currentVal === "NA"
                                                        ? "bg-surface-subtle text-muted-foreground border-border"
                                                        : "bg-primary text-white font-black border-primary"
                                                    }`}
                                                  >
                                                    <option value="NA">NA</option>
                                                    <option value="1">1</option>
                                                    <option value="2">2</option>
                                                    <option value="3">3</option>
                                                    <option value="4">4</option>
                                                    <option value="5">5</option>
                                                  </select>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Kolom skor + aksi di kanan */}
                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                      <div className="flex items-center gap-1.5">
                                        <label className="flex flex-col items-center" title="Wajib diisi">
                                          <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                            Wajib
                                          </span>
                                          <input
                                            type="checkbox"
                                            checked={field.isRequired}
                                            onChange={(e) => updateField(index, "isRequired", e.target.checked)}
                                            className="w-3.5 h-3.5 accent-primary"
                                          />
                                        </label>
                                        <label className="flex flex-col items-center" title="Skor maksimal">
                                          <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                            Skor
                                          </span>
                                          <input
                                            type="number"
                                            value={field.skor ?? 0}
                                            onChange={(e) =>
                                              updateField(index, "skor", parseFloat(e.target.value) || 0)
                                            }
                                            className="w-12 text-center text-[10px] font-bold border border-border bg-surface px-0.5 py-0.5 outline-none rounded-md focus:border-primary/50 text-foreground"
                                          />
                                        </label>
                                        {field.tipe === "BOOLEAN" && (
                                          <>
                                            <label className="flex flex-col items-center" title="Skor jawaban benar">
                                              <span className="text-[10px] font-bold uppercase text-emerald-600">
                                                B
                                              </span>
                                              <input
                                                type="number"
                                                value={field.skorBenar ?? 1}
                                                onChange={(e) =>
                                                  updateField(index, "skorBenar", parseFloat(e.target.value) || 0)
                                                }
                                                className="w-10 text-center text-[10px] border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 px-0.5 py-0.5 outline-none rounded-md text-foreground"
                                              />
                                            </label>
                                            <label className="flex flex-col items-center" title="Skor jawaban salah">
                                              <span className="text-[10px] font-bold uppercase text-rose-500">S</span>
                                              <input
                                                type="number"
                                                value={field.skorSalah ?? 0}
                                                onChange={(e) =>
                                                  updateField(index, "skorSalah", parseFloat(e.target.value) || 0)
                                                }
                                                className="w-10 text-center text-[10px] border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 px-0.5 py-0.5 outline-none rounded-md text-foreground"
                                              />
                                            </label>
                                            <label
                                              className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none"
                                              title="Izinkan jawaban T/A (Tidak Ada / tidak applicable)"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={field.allowNA ?? false}
                                                onChange={(e) => updateField(index, "allowNA", e.target.checked)}
                                                className="w-3 h-3 accent-primary"
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
                                          className={`px-1.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                                            field.isDisabled
                                              ? "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                                              : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                          }`}
                                        >
                                          {field.isDisabled ? "🚫" : "✓"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeField(index)}
                                          title="Hapus butir"
                                          className="p-1.5 rounded-md text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
                                    ? "border-primary bg-primary-subtle text-primary ring-2 ring-primary/30 scale-[1.01]"
                                    : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-primary"
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
                          ? "border-primary bg-primary-subtle text-primary ring-2 ring-primary/40 scale-[1.01]"
                          : "border-primary/40 bg-primary-subtle/50 text-primary hover:bg-primary-subtle"
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
                <div className="px-5 py-4 border-t border-border bg-surface-subtle/30">
                  {addingInline?.type === "bagian" ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-primary shrink-0">Bagian baru:</span>
                      <input
                        autoFocus
                        value={inlineName}
                        onChange={(e) => setInlineName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitInline();
                          if (e.key === "Escape") setAddingInline(null);
                        }}
                        placeholder="Contoh: AIR, BANGUNAN, UDARA..."
                        className="flex-1 h-8 px-3 text-[12px] border border-primary/30 rounded-lg outline-none focus:border-primary bg-surface text-foreground"
                      />
                      <button
                        onClick={submitInline}
                        className="h-8 px-3 text-[11px] font-bold bg-primary text-white rounded-lg hover:bg-primary-hover shadow-subtle"
                      >
                        Tambah
                      </button>
                      <button
                        onClick={() => setAddingInline(null)}
                        className="h-8 px-3 text-[11px] font-bold text-muted-foreground hover:bg-surface-subtle rounded-lg"
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
                        className="flex items-center gap-2 h-9 px-4 text-[11px] font-bold border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors rounded-lg"
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
