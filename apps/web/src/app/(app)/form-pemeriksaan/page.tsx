"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FileText,
  FolderPlus,
  History,
  Plus,
  Settings2,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
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

  const _deleteMutation = useMutation({
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

  function handleSave() {
    if (!nama.trim()) {
      toast.error("Nama template wajib diisi");
      return;
    }
    createMutation.mutate({
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
          allowNA: f.allowNA ?? f.config?.allowNA ?? false,
        },
      })),
    });
  }

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
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next);
  }

  const groupedFields = useMemo(() => {
    const groupMap = new Map<string, { field: any; index: number }[]>();
    fields.forEach((f, i) => {
      const g = f.grup || "Tanpa Grup";
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)?.push({ field: f, index: i });
    });

    const areaIndexes = new Map<string, number>();
    const subIndexes = new Map<string, number>(); // per-area sub counter
    const groups: any[] = [];
    groupMap.forEach((items, grup) => {
      const delimiterIndex = grup.indexOf(" — ");
      const area = delimiterIndex >= 0 ? grup.slice(0, delimiterIndex).trim() : grup;
      const subbagian = delimiterIndex >= 0 ? grup.slice(delimiterIndex + 3).trim() || null : null;
      if (!areaIndexes.has(area)) areaIndexes.set(area, areaIndexes.size + 1);
      let subIndex: number | null = null;
      if (subbagian) {
        const key = `${area}::${subbagian}`;
        if (!subIndexes.has(key)) {
          const countInArea = [...subIndexes.keys()].filter((k) => k.startsWith(`${area}::`)).length;
          subIndexes.set(key, countInArea + 1);
        }
        subIndex = subIndexes.get(key) ?? null;
      }
      groups.push({
        grup,
        area,
        subbagian,
        areaIndex: areaIndexes.get(area) ?? 1,
        subIndex,
        fields: items,
      });
    });
    // Sort: bagian (non-sub) dulu, lalu sub-bagiannya, per area
    groups.sort((a, b) => {
      if (a.areaIndex !== b.areaIndex) return a.areaIndex - b.areaIndex;
      if (!a.subbagian && b.subbagian) return -1;
      if (a.subbagian && !b.subbagian) return 1;
      if (a.subbagian && b.subbagian) return (a.subIndex ?? 0) - (b.subIndex ?? 0);
      return 0;
    });
    return groups;
  }, [fields]);

  const totalSkor = useMemo(() => fields.reduce((s, f) => s + (f.skor ?? 0), 0), [fields]);
  const rumusLabel = RUMUS_OPTIONS.find((r) => r.value === rumus)?.label || rumus;

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
                      <div className="shrink-0 flex items-center gap-3 sm:gap-5">
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
        <button
          onClick={handleSave}
          disabled={createMutation.isPending}
          className="flex items-center justify-center gap-2 h-11 px-5 text-[12px] font-bold bg-[hsl(var(--foreground))] text-[hsl(var(--card))] hover:opacity-80 disabled:opacity-40 transition-colors rounded-lg w-full sm:w-auto shrink-0"
        >
          <Check className="w-4 h-4" />
          {createMutation.isPending ? "Menyimpan..." : "Simpan"}
        </button>
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

          {/* Agregasi */}
          {subCategoryId && (
            <div className="border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b-2 border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
                <span className="text-[12px] font-bold">Agregasi Laporan Bulanan</span>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  Petakan nilai form ke parameter laporan bulanan.
                </p>
                {[
                  { label: "1. Jumlah Diperiksa", value: paramDiperiksaId, setter: setParamDiperiksaId, color: "" },
                  { label: "2. Memenuhi Syarat", value: paramMsId, setter: setParamMsId, color: "text-green-700" },
                  { label: "3. Tidak Memenuhi", value: paramTmsId, setter: setParamTmsId, color: "text-red-700" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className={`text-[12px] font-bold w-[130px] shrink-0 ${item.color}`}>{item.label}</span>
                    <select
                      value={item.value || ""}
                      onChange={(e) => item.setter(e.target.value ? Number(e.target.value) : null)}
                      className={`flex-1 h-10 px-3 text-[12px] font-bold border-2 outline-none rounded-lg ${
                        item.color
                          ? item.color === "text-green-700"
                            ? "border-green-200 bg-green-50 text-green-800 focus:border-green-400"
                            : "border-red-200 bg-red-50 text-red-800 focus:border-red-400"
                          : "border-[hsl(var(--border))] bg-[hsl(var(--card))] focus:border-[hsl(var(--accent))]"
                      }`}
                    >
                      <option value="">—</option>
                      {categories
                        .find((c: any) => c.subCategories?.some((sc: any) => sc.id === subCategoryId))
                        ?.parameters?.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.nama} ({p.code})
                          </option>
                        ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
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
              <span className="ml-auto text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                {fields.length} item
              </span>
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
                        className={`flex items-center gap-3 px-5 py-3 cursor-pointer select-none transition-colors hover:bg-[hsl(var(--muted))]/60 ${
                          group.subbagian ? "pl-10 bg-[hsl(var(--muted))]/40" : "bg-[hsl(var(--muted))]/30"
                        }`}
                      >
                        <ChevronRight
                          className={`w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                        />
                        <div className="w-9 h-7 flex items-center justify-center bg-[hsl(var(--foreground))] text-[hsl(var(--card))] text-[11px] font-black shrink-0 rounded-lg">
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
                        ) : (
                          <span className="flex-1 text-[13px] font-bold text-[hsl(var(--foreground))] tracking-wide">
                            {(group.subbagian || group.grup).toUpperCase()}
                          </span>
                        )}
                        <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                          {group.fields.length} item
                        </span>
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
                          </div>
                        )}
                        {!group.subbagian && group.grup !== "__META__" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addSubbagian(group.area);
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors rounded-md"
                          >
                            <FolderPlus className="w-3 h-3" /> Subbagian
                          </button>
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
                        {group.grup !== "__META__" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteGrup(group.grup);
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 border border-red-200 text-red-500 hover:bg-red-50 transition-colors rounded-md"
                          >
                            <Trash2 className="w-3 h-3" /> Hapus
                          </button>
                        )}
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
                      {!isCollapsed && (
                        <div className="w-full overflow-x-auto border-t border-[hsl(var(--border))]">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b-2 border-[hsl(var(--border))]">
                                <th className="w-12 px-3 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">
                                  No
                                </th>
                                <th className="min-w-[280px] px-3 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">
                                  Pertanyaan & Kondisi
                                </th>
                                <th className="w-24 px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">
                                  Tipe
                                </th>
                                <th className="min-w-[180px] px-3 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">
                                  Opsi / Pengaturan
                                </th>
                                <th className="w-20 px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">
                                  Status
                                </th>
                                <th className="w-16 px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">
                                  Wajib
                                </th>
                                <th className="w-16 px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">
                                  Skor
                                </th>
                                <th className="w-16 px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">
                                  Benar
                                </th>
                                <th className="w-16 px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">
                                  Salah
                                </th>
                                <th className="w-24 px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">
                                  Aksi
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[hsl(var(--border))]">
                              {group.fields.map(({ field, index }: { field: any; index: number }, localIdx: number) => (
                                <tr
                                  key={index}
                                  className={`hover:bg-[hsl(var(--muted))]/20 ${field.isDisabled ? "bg-red-50/30 opacity-75" : ""}`}
                                >
                                  <td className="px-3 py-3 text-[12px] font-mono text-[hsl(var(--muted-foreground))]">
                                    {localIdx + 1}
                                  </td>
                                  <td className="px-3 py-3 space-y-1.5">
                                    <input
                                      type="text"
                                      value={field.pertanyaan}
                                      onChange={(e) => updateField(index, "pertanyaan", e.target.value)}
                                      placeholder="Tulis pertanyaan..."
                                      className={`w-full text-[12px] font-medium bg-transparent outline-none border-b-2 border-transparent focus:border-[hsl(var(--accent))] px-1 py-1 ${
                                        field.isDisabled ? "line-through text-[hsl(var(--muted-foreground))]" : ""
                                      }`}
                                    />
                                    {/* AutoFill atau Ketergantungan Kondisional */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {group.grup === "__META__" ? (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <select
                                            value={field.autoFill || ""}
                                            onChange={(e) => updateField(index, "autoFill", e.target.value || "")}
                                            className="text-[10px] bg-[hsl(var(--muted))]/40 border border-[hsl(var(--border))] rounded px-1.5 py-0.5 text-[hsl(var(--foreground))] outline-none font-medium"
                                          >
                                            <option value="">Manual (Diisi Saat Input)</option>
                                            <option value="USER_NAME">👤 Otomatis Nama Akun Petugas</option>
                                            <option value="USER_PUSKESMAS">
                                              🏥 Otomatis Wilayah Kerja (Puskesmas)
                                            </option>
                                          </select>
                                          {field.autoFill === "USER_NAME" && (
                                            <span className="text-[9px] font-bold text-[#00A876] bg-[#00A876]/10 px-1.5 py-0.5 rounded">
                                              Nama Petugas
                                            </span>
                                          )}
                                          {field.autoFill === "USER_PUSKESMAS" && (
                                            <span className="text-[9px] font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                              Puskesmas Petugas
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 flex-wrap">
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
                                            className="text-[10px] bg-[hsl(var(--muted))]/30 border border-dashed border-[hsl(var(--border))] rounded px-1.5 py-0.5 text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))] transition-colors"
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
                                                    Hanya aktif jika Butir {i + 1} = &quot;Ya&quot;
                                                  </option>
                                                  <option value={`${i}:FALSE`}>
                                                    Hanya aktif jika Butir {i + 1} = &quot;Tidak&quot;
                                                  </option>
                                                </optgroup>
                                              ))}
                                          </select>
                                          {field.dependsOn && (
                                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                              🔒 Tergantung Butir {field.dependsOn.parentIndex + 1} (
                                              {field.dependsOn.requiredValue === "TRUE" ? "Ya" : "Tidak"})
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <select
                                      value={field.tipe}
                                      onChange={(e) => updateField(index, "tipe", e.target.value)}
                                      className="text-[11px] font-bold border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1 outline-none rounded-md"
                                    >
                                      {FIELD_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>
                                          {t.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-3 py-3">
                                    {(field.tipe === "SELECT" || field.tipe === "DROPDOWN") && (
                                      <input
                                        type="text"
                                        value={field.opsi || ""}
                                        onChange={(e) => updateField(index, "opsi", e.target.value)}
                                        placeholder="Opsi 1, Opsi 2, Opsi 3"
                                        className="w-full text-[11px] bg-transparent outline-none border-b-2 border-transparent focus:border-[hsl(var(--accent))] px-1 py-1"
                                      />
                                    )}
                                    {field.tipe === "BOOLEAN" && (
                                      <label className="flex items-center gap-1.5 text-[10px] text-[hsl(var(--muted-foreground))] cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={field.allowNA ?? false}
                                          onChange={(e) => updateField(index, "allowNA", e.target.checked)}
                                          className="w-3.5 h-3.5 accent-[#00A876]"
                                        />
                                        <span>Izinkan &quot;T/A&quot; (Tidak Ada)</span>
                                      </label>
                                    )}
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => updateField(index, "isDisabled", !field.isDisabled)}
                                      title={
                                        field.isDisabled
                                          ? "Butir dinonaktifkan (Klik untuk aktifkan)"
                                          : "Butir aktif (Klik untuk nonaktifkan/disable)"
                                      }
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all border ${
                                        field.isDisabled
                                          ? "bg-red-50 text-red-700 border-red-200"
                                          : "bg-green-50 text-green-700 border-green-200"
                                      }`}
                                    >
                                      {field.isDisabled ? "🚫 Disable" : "✓ Aktif"}
                                    </button>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={field.isRequired}
                                      onChange={(e) => updateField(index, "isRequired", e.target.checked)}
                                      className="w-4 h-4 accent-[hsl(var(--accent))]"
                                    />
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <input
                                      type="number"
                                      value={field.skor ?? 0}
                                      onChange={(e) => updateField(index, "skor", parseFloat(e.target.value) || 0)}
                                      className="w-14 text-center text-[11px] border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1 py-1 outline-none rounded-md"
                                    />
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <input
                                      type="number"
                                      value={field.skorBenar ?? 1}
                                      onChange={(e) => updateField(index, "skorBenar", parseFloat(e.target.value) || 0)}
                                      className="w-14 text-center text-[11px] border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1 py-1 outline-none rounded-md"
                                    />
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <input
                                      type="number"
                                      value={field.skorSalah ?? 0}
                                      onChange={(e) => updateField(index, "skorSalah", parseFloat(e.target.value) || 0)}
                                      className="w-14 text-center text-[11px] border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1 py-1 outline-none rounded-md"
                                    />
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => moveField(index, "up")}
                                        disabled={index === 0}
                                        className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30"
                                      >
                                        ↑
                                      </button>
                                      <button
                                        onClick={() => moveField(index, "down")}
                                        disabled={index === fields.length - 1}
                                        className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30"
                                      >
                                        ↓
                                      </button>
                                      <button
                                        onClick={() => removeField(index)}
                                        className="p-1.5 text-red-400 hover:text-red-600"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
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
