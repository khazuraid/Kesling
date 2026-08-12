"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Check,
  FileText,
  FolderPlus,
  Hash,
  Plus,
  Settings2,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
  const [isImporting, setIsImporting] = useState(false);
  const [importStage, setImportStage] = useState("");
  const [importProgress, setImportProgress] = useState(0);

  // Form state
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [subCategoryId, setSubCategoryId] = useState<number | null>(null);
  const [dataDasarCategoryId, setDataDasarCategoryId] = useState<number | null>(null);
  const [fields, setFields] = useState<any[]>([]);

  // Agregasi Laporan State
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
      const res = await fetch(`/api/inspection/templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspection-templates"] });
      setSelectedTemplateId(null);
      toast.success("Template dihapus");
    },
  });

  // ─── Mutations ───────────────────────────

  function handleSave() {
    if (!nama) {
      toast.error("Nama template wajib diisi");
      return;
    }
    // Auto-set fields without a grup to "Lainnya"
    const cleanFields = fields.map((f, i) => ({
      ...f,
      grup: f.grup || "Lainnya",
      urutan: i,
      config: { skor: f.skor ?? 0, skorBenar: f.skorBenar ?? f.skor ?? 1, skorSalah: f.skorSalah ?? 0 },
    }));
    createMutation.mutate({
      id: selectedTemplateId || undefined,
      nama,
      deskripsi,
      subCategoryId,
      config: {
        dataDasarCategoryId,
        rumus,
        customFormula: rumus === "custom" ? customFormula : undefined,
        thresholdOperator,
        thresholdValue,
        thresholdPassText,
        thresholdFailText,
        agregasi: {
          paramDiperiksaId,
          paramMsId,
          paramTmsId,
        },
      },
      fields: cleanFields,
    });
  }

  async function handleImportFile(file: File) {
    setIsImporting(true);
    setImportStage("Mengunggah file ke server...");
    setImportProgress(10);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/inspection/templates/import", { method: "POST", body: formData });
      const initData = await res.json();
      if (!res.ok) throw new Error(initData?.error || "Gagal import file");

      const jobId = initData.jobId;
      setImportStage("File diterima; menunggu worker...");
      setImportProgress(20);

      const poll = async () => {
        return new Promise<any>((resolve, reject) => {
          const interval = setInterval(async () => {
            try {
              const checkRes = await fetch(`/api/inspection/templates/import?jobId=${jobId}`);
              const statusData = await checkRes.json();
              if (!checkRes.ok) {
                clearInterval(interval);
                reject(new Error(statusData?.error || "Gagal memantau job import"));
                return;
              }
              if (statusData.status === "processing") {
                setImportStage(statusData.message || "Memproses...");
                setImportProgress(statusData.progress || 50);
              } else if (statusData.status === "complete") {
                clearInterval(interval);
                resolve(statusData.result);
              } else if (statusData.status === "failed") {
                clearInterval(interval);
                reject(new Error(statusData.error || "Gagal memproses file di worker"));
              }
            } catch (err) {
              clearInterval(interval);
              reject(err);
            }
          }, 2000);
        });
      };

      const result = await poll();
      setSelectedTemplateId(null);
      setIsCreating(true);
      setNama(result.nama || file.name.replace(/\.(pdf|docx?)$/i, ""));
      setDeskripsi(result.deskripsi || `Diimpor dari file ${file.name}`);
      setSubCategoryId(null);
      setDataDasarCategoryId(null);
      setRumus("sum");
      setCustomFormula("");
      setThresholdOperator(">=");
      setThresholdValue(80);
      setThresholdPassText("Memenuhi Syarat");
      setThresholdFailText("Tidak Memenuhi Syarat");
      setParamDiperiksaId(null);
      setParamMsId(null);
      setParamTmsId(null);
      setFields(result.fields || []);
      toast.success(`Import berhasil: ${(result.fields || []).length} butir pemeriksaan`);
    } catch (error: any) {
      toast.error(error?.message || "Gagal import file");
    } finally {
      setIsImporting(false);
      setImportStage("");
      setImportProgress(0);
    }
  }

  // ─── Field Helpers ───────────────────────

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
      },
    ]);
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index));
  }

  function updateField(index: number, key: string, value: any) {
    const next = [...fields];
    next[index] = { ...next[index], [key]: value };
    setFields(next);
  }

  function moveField(index: number, dir: "up" | "down") {
    if (dir === "up" && index === 0) return;
    if (dir === "down" && index === fields.length - 1) return;
    const next = [...fields];
    const tgt = dir === "up" ? index - 1 : index + 1;
    [next[index], next[tgt]] = [next[tgt], next[index]];
    setFields(next);
  }

  function addGrup(name: string) {
    if (!name.trim()) {
      toast.error("Nama grup tidak boleh kosong");
      return;
    }
    addField(name.trim());
    toast.success(`Grup "${name}" ditambahkan`);
  }

  function addSubbagian(area: string) {
    const name = prompt(`Nama subbagian untuk "${area}":`);
    if (!name?.trim()) return;
    const cleanName = name.trim().replace(/\s+—\s+/g, " - ");
    const grup = `${area} — ${cleanName}`;
    if (fields.some((field) => field.grup === grup)) {
      toast.error(`Subbagian "${cleanName}" sudah ada`);
      return;
    }
    addField(grup);
    toast.success(`Subbagian "${cleanName}" ditambahkan`);
  }

  function renameGrup(oldName: string, newName: string) {
    if (!newName.trim()) return;
    setFields(fields.map((f) => (f.grup === oldName ? { ...f, grup: newName } : f)));
  }

  function deleteGrup(grupName: string) {
    const count = fields.filter((f) => f.grup === grupName).length;
    if (confirm(`Hapus grup "${grupName}" dan ${count} item di dalamnya?`)) {
      setFields(fields.filter((f) => f.grup !== grupName));
      toast.success(`Grup "${grupName}" dihapus`);
    }
  }

  // ─── Grouping ────────────────────────────

  const groupedFields = useMemo(() => {
    const groups: {
      grup: string;
      area: string;
      subbagian: string | null;
      areaIndex: number;
      firstInArea: boolean;
      fields: { field: any; index: number }[];
    }[] = [];
    const groupMap = new Map<string, { field: any; index: number }[]>();

    fields.forEach((f, i) => {
      const g = f.grup || "Tanpa Grup";
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)?.push({ field: f, index: i });
    });

    const areaIndexes = new Map<string, number>();
    groupMap.forEach((items, grup) => {
      const delimiterIndex = grup.indexOf(" — ");
      const area = delimiterIndex >= 0 ? grup.slice(0, delimiterIndex).trim() : grup;
      const subbagian = delimiterIndex >= 0 ? grup.slice(delimiterIndex + 3).trim() || null : null;
      if (!areaIndexes.has(area)) areaIndexes.set(area, areaIndexes.size + 1);
      groups.push({
        grup,
        area,
        subbagian,
        areaIndex: areaIndexes.get(area)!,
        firstInArea: !groups.some((group) => group.area === area),
        fields: items,
      });
    });

    return groups;
  }, [fields]);

  const totalSkor = useMemo(() => {
    return fields.reduce((s, f) => s + (f.skor ?? 0), 0);
  }, [fields]);

  // ─── Group Name Editor State ─────────────
  const [editingGrup, setEditingGrup] = useState<string | null>(null);
  const [grupEditValue, setGrupEditValue] = useState("");

  // ─── Rumus State ─────────────────────────
  const [rumus, setRumus] = useState<string>("sum");
  const [customFormula, setCustomFormula] = useState<string>("");

  // ─── Kesimpulan State ─────────────────────
  const [thresholdOperator, setThresholdOperator] = useState<string>(">=");
  const [thresholdValue, setThresholdValue] = useState<number>(80);
  const [thresholdPassText, setThresholdPassText] = useState<string>("Memenuhi Syarat");
  const [thresholdFailText, setThresholdFailText] = useState<string>("Tidak Memenuhi Syarat");

  const rumusLabel = useMemo(() => {
    const opt = RUMUS_OPTIONS.find((r) => r.value === rumus);
    return opt ? opt.label : "Jumlah";
  }, [rumus]);

  const rumusDesc = useMemo(() => {
    if (rumus === "custom") return customFormula || customFormula.trim() ? customFormula : "Rumus kustom";
    const opt = RUMUS_OPTIONS.find((r) => r.value === rumus);
    return opt ? opt.desc : "";
  }, [rumus, customFormula]);

  const maxSkor = useMemo(() => totalSkor, [totalSkor]);

  // Example preview values when formula is applied
  // sum = totalSkor
  // percentage = (totalSkor / maxSkor) * 100 (but maxSkor is totalSkor here, so 100%)
  // For demo purposes, we show what happens if half the fields are scored
  const demoSkorTerisi = useMemo(() => {
    // Assume roughly 70% of fields are marked "terpenuhi" for preview
    const filled = fields.filter((f) => f.skor > 0);
    if (filled.length === 0) return 0;
    const halfScore = filled.reduce((s, f) => s + (f.skor ?? 0), 0) * 0.7;
    return Math.round(halfScore);
  }, [fields]);

  const demoPersentase = useMemo(() => {
    if (maxSkor === 0) return 0;
    return Math.round((demoSkorTerisi / maxSkor) * 100);
  }, [demoSkorTerisi, maxSkor]);

  // ─── Role Guard ──────────────────────────
  if ((session?.user as any)?.role === "ADMIN") {
    return (
      <div className="w-full mx-auto pt-0 pb-4 flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <ShieldAlert className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
        <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Akses Ditolak</p>
        <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Halaman ini hanya untuk Puskesmas.</p>
      </div>
    );
  }

  // ─── RENDER: List View ───────────────────

  if (!selectedTemplateId && !isCreating) {
    return (
      <div className="w-full mx-auto pb-4 space-y-4 fade-in">
        {isImporting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-[420px] max-w-[calc(100vw-32px)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-2xl">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 shrink-0 animate-spin border-2 border-[hsl(var(--border))] border-t-[hsl(var(--foreground))]" />
                <div className="space-y-1">
                  <h3 className="text-[13px] font-bold text-[hsl(var(--foreground))]">Memproses Import Template...</h3>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Status:{" "}
                    <span className="font-medium text-[hsl(var(--foreground))]">{importStage || "Menyiapkan..."}</span>{" "}
                    ({importProgress}%)
                  </p>
                </div>
              </div>
              <div className="mt-4 w-full bg-[hsl(var(--border))] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[hsl(var(--foreground))] h-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <div className="mt-4 space-y-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--foreground))]" />
                  <span>Mengunggah file ke server...</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--foreground))]" />
                  <span>Membaca PDF dengan Docling dan model tabel...</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--foreground))]" />
                  <span>Menyusun butir pertanyaan ke Form Pemeriksaan...</span>
                </div>
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                Proses PDF besar bisa memakan waktu 30-120 detik. Jangan tutup halaman ini.
              </p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
          <div>
            <h1 className="text-[16px] font-bold text-[hsl(var(--foreground))]">Form Pemeriksaan</h1>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Template formulir inspeksi — format tabel ceklis
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 h-9 px-3 text-[11px] font-bold border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              {isImporting ? "Mengimpor..." : "Import PDF/Word"}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={isImporting}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              onClick={() => {
                setIsCreating(true);
                setNama("");
                setDeskripsi("");
                setSubCategoryId(null);
                setDataDasarCategoryId(null);
                setRumus("sum");
                setCustomFormula("");
                setThresholdOperator(">=");
                setThresholdValue(80);
                setThresholdPassText("Memenuhi Syarat");
                setThresholdFailText("Tidak Memenuhi Syarat");
                setParamDiperiksaId(null);
                setParamMsId(null);
                setParamTmsId(null);
                setFields([]);
              }}
              className="flex items-center gap-1.5 h-9 px-3 text-[11px] font-bold border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Template Baru
            </button>
          </div>
        </div>

        {/* Template List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[hsl(var(--border))] border-t-[hsl(var(--accent))] animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col items-center justify-center py-20 gap-2">
            <FileText className="w-8 h-8 text-[hsl(var(--muted-foreground))] opacity-30" />
            <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Belum ada template</p>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Klik "Template Baru" untuk membuat formulir pertama.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {templates.map((tpl: any) => (
              <button
                key={tpl.id}
                onClick={() => {
                  setSelectedTemplateId(tpl.id);
                  setNama(tpl.nama);
                  setDeskripsi(tpl.deskripsi || "");
                  setRumus(tpl.config?.rumus || "sum");
                  setCustomFormula(tpl.config?.customFormula || "");
                  setThresholdOperator(tpl.config?.thresholdOperator || ">=");
                  setThresholdValue(tpl.config?.thresholdValue ?? 80);
                  setThresholdPassText(tpl.config?.thresholdPassText || "Memenuhi Syarat");
                  setThresholdFailText(tpl.config?.thresholdFailText || "Tidak Memenuhi Syarat");

                  // Set Agregasi Config
                  setParamDiperiksaId(tpl.config?.agregasi?.paramDiperiksaId ?? null);
                  setParamMsId(tpl.config?.agregasi?.paramMsId ?? null);
                  setParamTmsId(tpl.config?.agregasi?.paramTmsId ?? null);

                  setFields(
                    (tpl.fields || []).map((f: any) => ({
                      ...f,
                      skor: f.config?.skor ?? 0,
                      skorBenar: f.config?.skorBenar ?? f.config?.skor ?? 1,
                      skorSalah: f.config?.skorSalah ?? 0,
                    })),
                  );
                  setSubCategoryId(tpl.subCategoryId || null);
                  setDataDasarCategoryId(tpl.config?.dataDasarCategoryId ?? null);
                }}
                className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-left hover:border-[hsl(var(--accent))] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-[hsl(var(--muted))] flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                    {tpl.fields?.length || 0} field
                  </span>
                </div>
                <h3 className="text-[12px] font-bold text-[hsl(var(--foreground))] mb-1">{tpl.nama}</h3>
                {tpl.deskripsi && (
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] line-clamp-2 mb-2">{tpl.deskripsi}</p>
                )}
                {/* Metadata: Pembuat & Koneksi Laporan */}
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                    {tpl.puskesmas?.nama || "Dinas"}
                  </span>
                  {tpl.subCategory?.category?.nama && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]">
                      {tpl.subCategory.category.icon} {tpl.subCategory.category.nama}
                      {tpl.subCategory?.nama ? ` → ${tpl.subCategory.nama}` : ""}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── RENDER: Table Checklist Editor ──────

  return (
    <div className="w-full mx-auto pb-4 space-y-4 fade-in">
      {/* Top Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setSelectedTemplateId(null);
            setIsCreating(false);
          }}
          className="text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] font-bold"
        >
          &larr; Kembali
        </button>
        <div className="h-5 w-px bg-[hsl(var(--border))]" />
        <input
          type="text"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama Template..."
          className="flex-1 text-[14px] font-bold text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/40 outline-none bg-transparent"
        />
        <button
          onClick={handleSave}
          disabled={createMutation.isPending}
          className="flex items-center gap-1.5 h-8 px-4 text-[11px] font-bold bg-[hsl(var(--foreground))] text-[hsl(var(--card))] hover:opacity-80 disabled:opacity-40 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          {createMutation.isPending ? "Menyimpan..." : "Simpan"}
        </button>
      </div>

      {/* Description */}
      <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="px-4 py-2.5 border-b border-[hsl(var(--border))]">
          <span className="text-[13px] font-bold">Deskripsi &amp; Koneksi Laporan</span>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-1.5">
              Deskripsi
            </label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Deskripsi atau petunjuk penggunaan template..."
              rows={2}
              className="w-full text-[12px] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/40 border border-[hsl(var(--border))] px-3 py-2 outline-none focus:border-[hsl(var(--accent))] bg-[hsl(var(--card))] resize-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-1.5">
              Kategori Data Dasar
            </label>
            <select
              value={dataDasarCategoryId || ""}
              onChange={(e) => setDataDasarCategoryId(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-9 px-3 text-[12px] font-medium border border-[hsl(var(--border))] outline-none bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]/30 transition-colors cursor-pointer appearance-none"
            >
              <option value="">— Tidak terhubung —</option>
              {categories
                .filter((category: any) => (category.parameters ?? []).some((parameter: any) => parameter.isBaseline))
                .map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.nama}
                  </option>
                ))}
            </select>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1.5">
              Menentukan daftar sasaran Data Dasar dan sumber autofill saat pemeriksaan.
            </p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-1.5">
              Koneksi Laporan Bulanan
            </label>
            <select
              value={subCategoryId || ""}
              onChange={(e) => setSubCategoryId(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-9 px-3 text-[12px] font-medium border border-[hsl(var(--border))] outline-none bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]/30 transition-colors cursor-pointer appearance-none"
            >
              <option value="">-- Pilih Koneksi Laporan (Opsional) --</option>
              {categories.map((cat: any) =>
                (cat.subCategories || []).map((sub: any) => (
                  <option key={sub.id} value={sub.id}>
                    {cat.icon} {cat.nama} &rarr; {sub.nama}
                  </option>
                )),
              )}
            </select>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1.5">
              Hubungkan template ini ke jenis laporan bulanan. Skor hasil pemeriksaan lapangan akan diintegrasikan
              langsung sebagai data input/referensi laporan bulanan.
            </p>
          </div>
        </div>
      </div>

      {/* Scoring Formula Section */}
      <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
          <Hash className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <span className="text-[13px] font-bold">Rumus Penilaian</span>
          <span className="ml-auto text-[10px] font-bold text-[hsl(var(--muted-foreground))]">{rumusLabel}</span>
        </div>
        <div className="flex items-center gap-4 px-4 py-3">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-1.5">
              Metode Perhitungan
            </label>
            <select
              value={rumus}
              onChange={(e) => setRumus(e.target.value)}
              className="w-full h-9 px-3 text-[12px] font-medium border border-[hsl(var(--border))] outline-none bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]/30 transition-colors cursor-pointer appearance-none"
            >
              {RUMUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.desc}
                </option>
              ))}
            </select>
            {rumus === "custom" && (
              <div className="mt-2">
                <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-1">
                  Rumus Kustom
                </label>
                <div className="flex items-center gap-1.5 mb-2">
                  <button
                    onClick={() => setCustomFormula((prev) => `${prev}SUM()`)}
                    className="text-[9px] font-bold px-2 py-0.5 border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    SUM
                  </button>
                  <button
                    onClick={() => setCustomFormula((prev) => `${prev}AVG()`)}
                    className="text-[9px] font-bold px-2 py-0.5 border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    AVG
                  </button>
                  <button
                    onClick={() => setCustomFormula((prev) => `${prev}MIN()`)}
                    className="text-[9px] font-bold px-2 py-0.5 border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    MIN
                  </button>
                  <button
                    onClick={() => setCustomFormula((prev) => `${prev}MAX()`)}
                    className="text-[9px] font-bold px-2 py-0.5 border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    MAX
                  </button>
                  <button
                    onClick={() => setCustomFormula((prev) => `${prev}COUNT()`)}
                    className="text-[9px] font-bold px-2 py-0.5 border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    COUNT
                  </button>
                  <button
                    onClick={() => setCustomFormula((prev) => `${prev}✓`)}
                    className="text-[9px] font-bold px-2 py-0.5 border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    ✓ (Benar)
                  </button>
                  <button
                    onClick={() => setCustomFormula((prev) => `${prev}✗`)}
                    className="text-[9px] font-bold px-2 py-0.5 border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    ✗ (Salah)
                  </button>
                </div>
                <textarea
                  value={customFormula}
                  onChange={(e) => setCustomFormula(e.target.value)}
                  placeholder="Contoh: (SUM(✓) × 2) / (COUNT() + 1) atau deskripsi manual..."
                  rows={2}
                  className="w-full text-[11px] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/40 border border-[hsl(var(--border))] px-3 py-2 outline-none focus:border-[hsl(var(--accent))] bg-[hsl(var(--card))] resize-none"
                />
              </div>
            )}
          </div>

          {/* Live Score Preview */}
          <div className="border-l border-[hsl(var(--border))] pl-4">
            <div className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
              Pratinjau Skor
            </div>
            <div className="flex items-baseline gap-2">
              {rumus === "sum" && (
                <>
                  <span className="text-[24px] font-extrabold text-[hsl(var(--foreground))] tabular-nums">
                    {totalSkor}
                  </span>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">/ {totalSkor}</span>
                  <span className="text-[12px] font-bold text-[hsl(var(--accent))]">100%</span>
                </>
              )}
              {rumus === "percentage" && (
                <>
                  <span className="text-[24px] font-extrabold text-[hsl(var(--foreground))] tabular-nums">
                    {demoPersentase}
                  </span>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">%</span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    (est. {demoSkorTerisi}/{totalSkor})
                  </span>
                </>
              )}
              {rumus === "weighted" && (
                <>
                  <span className="text-[24px] font-extrabold text-[hsl(var(--foreground))] tabular-nums">
                    {demoPersentase}
                  </span>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">%</span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">(est. nilai tertimbang)</span>
                </>
              )}
              {rumus === "custom" && (
                <>
                  <span className="text-[14px] font-extrabold text-[hsl(var(--foreground))] italic">ƒ(x)</span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Rumus manual</span>
                </>
              )}
            </div>
            <p className="text-[9px] text-[hsl(var(--muted-foreground))] mt-1">{rumusDesc}</p>
          </div>
        </div>

        {/* Threshold Section */}
        <div className="border-t border-[hsl(var(--border))] px-4 py-3 bg-[hsl(var(--muted))]/10">
          <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-2">
            Kriteria Kesimpulan
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))]">Jika Nilai Akhir</span>
                <select
                  value={thresholdOperator}
                  onChange={(e) => setThresholdOperator(e.target.value)}
                  className="h-8 px-2 text-[11px] font-bold border border-[hsl(var(--border))] bg-[hsl(var(--card))] outline-none"
                >
                  <option value=">=">&ge; (Lebih dari sama dengan)</option>
                  <option value=">">&gt; (Lebih dari)</option>
                  <option value="=">= (Sama dengan)</option>
                </select>
                <input
                  type="number"
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(parseInt(e.target.value, 10) || 0)}
                  className="w-16 h-8 px-2 text-[11px] font-bold border border-[hsl(var(--border))] bg-[hsl(var(--card))] outline-none"
                />
              </div>
              <input
                type="text"
                value={thresholdPassText}
                onChange={(e) => setThresholdPassText(e.target.value)}
                placeholder="Teks (Misal: Memenuhi Syarat)"
                className="w-full h-8 px-3 text-[11px] text-green-700 font-bold bg-green-50 border border-green-200 outline-none focus:border-green-400"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))]">Sebaliknya</span>
              </div>
              <input
                type="text"
                value={thresholdFailText}
                onChange={(e) => setThresholdFailText(e.target.value)}
                placeholder="Teks (Misal: Tidak Memenuhi Syarat)"
                className="w-full h-8 px-3 text-[11px] text-red-700 font-bold bg-red-50 border border-red-200 outline-none focus:border-red-400"
              />
            </div>
          </div>
        </div>

        {/* Agregasi Laporan Bulanan Section */}
        {subCategoryId && (
          <div className="border-t border-[hsl(var(--border))] px-4 py-3 bg-[hsl(var(--muted))]/10">
            <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-2">
              Koneksi Agregasi Laporan Bulanan
            </label>
            <p className="text-[9px] text-[hsl(var(--muted-foreground))] mb-3 leading-relaxed">
              Petakan nilai dari form ini agar masuk secara akurat ke kolom Parameter Laporan Bulanan yang tepat. Sistem
              akan otomatis menambahkan angka +1 ke kolom Laporan Bulanan yang Anda pilih.
            </p>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-[hsl(var(--foreground))] w-[120px] shrink-0">
                  1. Jumlah Diperiksa
                </span>
                <select
                  value={paramDiperiksaId || ""}
                  onChange={(e) => setParamDiperiksaId(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 h-8 px-2 text-[11px] font-bold border border-[hsl(var(--border))] bg-[hsl(var(--card))] outline-none focus:border-[hsl(var(--accent))]"
                >
                  <option value="">— Jangan agregasi —</option>
                  {categories
                    .find((c) => c.subCategories?.some((sc: any) => sc.id === subCategoryId))
                    ?.parameters?.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} (Kode: {p.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-green-700 w-[120px] shrink-0">
                  2. {thresholdPassText || "Memenuhi Syarat"}
                </span>
                <select
                  value={paramMsId || ""}
                  onChange={(e) => setParamMsId(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 h-8 px-2 text-[11px] font-bold border border-green-200 bg-green-50 outline-none focus:border-green-400 text-green-800"
                >
                  <option value="">— Jangan agregasi —</option>
                  {categories
                    .find((c) => c.subCategories?.some((sc: any) => sc.id === subCategoryId))
                    ?.parameters?.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} (Kode: {p.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-red-700 w-[120px] shrink-0">
                  3. {thresholdFailText || "Tdk Memenuhi Syarat"}
                </span>
                <select
                  value={paramTmsId || ""}
                  onChange={(e) => setParamTmsId(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 h-8 px-2 text-[11px] font-bold border border-red-200 bg-red-50 outline-none focus:border-red-400 text-red-800"
                >
                  <option value="">— Jangan agregasi —</option>
                  {categories
                    .find((c) => c.subCategories?.some((sc: any) => sc.id === subCategoryId))
                    ?.parameters?.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} (Kode: {p.code})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Checklist Tables — One per Group */}
      <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[hsl(var(--border))]">
          <Settings2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <span className="text-[13px] font-bold">Daftar Ceklis</span>
          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] ml-auto">
            {fields.length} item &middot; {totalSkor} total bobot
          </span>
        </div>

        {fields.length === 0 && (
          <div className="p-8 text-center space-y-3">
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Belum ada field. Mulai dengan menambah grup atau field:
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => addField("__META__")}
                className="flex items-center gap-1.5 h-9 px-4 text-[11px] font-bold border border-indigo-500 text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Info Sasaran
              </button>
              <button
                onClick={() => {
                  const name = prompt("Nama grup (contoh: AIR, BANGUNAN, UDARA):");
                  if (name) addGrup(name);
                }}
                className="flex items-center gap-1.5 h-9 px-4 text-[11px] font-bold border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" /> Tambah Grup
              </button>
              <button
                onClick={() => addField()}
                className="flex items-center gap-1.5 h-9 px-4 text-[11px] font-bold bg-[hsl(var(--foreground))] text-[hsl(var(--card))] hover:opacity-80 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Item
              </button>
            </div>
          </div>
        )}

        {groupedFields.map((group) => {
          const romanIndex = group.areaIndex;

          return (
            <div key={group.grup} className="border-b border-[hsl(var(--border))] last:border-b-0">
              {group.subbagian && group.firstInArea && (
                <div className="flex items-center gap-3 px-4 py-3 bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">
                  <div className="w-7 h-7 flex items-center justify-center bg-[hsl(var(--foreground))] text-[hsl(var(--card))] text-[9px] font-black shrink-0">
                    {toRoman(romanIndex)}
                  </div>
                  <span className="flex-1 text-[11px] font-bold text-[hsl(var(--foreground))] uppercase tracking-wide">
                    {group.area}
                  </span>
                  <button
                    onClick={() => addSubbagian(group.area)}
                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:opacity-80 transition-colors"
                  >
                    <FolderPlus className="w-3 h-3" /> Tambah Subbagian
                  </button>
                </div>
              )}
              {/* Group Header — Roman numeral + Editable name */}
              <div
                className={`flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))] ${group.subbagian ? "pl-14 bg-[hsl(var(--muted))]/40" : "bg-[hsl(var(--muted))]"}`}
              >
                {!group.subbagian && (
                  <div className="w-7 h-7 flex items-center justify-center bg-[hsl(var(--foreground))] text-[hsl(var(--card))] text-[9px] font-black shrink-0">
                    {toRoman(romanIndex)}
                  </div>
                )}
                {group.grup === "__META__" ? (
                  <span className="flex-1 text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                    Data Pokok
                  </span>
                ) : editingGrup === group.grup ? (
                  <input
                    type="text"
                    value={grupEditValue}
                    onChange={(e) => setGrupEditValue(e.target.value)}
                    onBlur={() => {
                      if (grupEditValue.trim() && grupEditValue !== (group.subbagian ?? group.grup)) {
                        renameGrup(
                          group.grup,
                          group.subbagian ? `${group.area} — ${grupEditValue.trim()}` : grupEditValue.trim(),
                        );
                      }
                      setEditingGrup(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (grupEditValue.trim() && grupEditValue !== (group.subbagian ?? group.grup)) {
                          renameGrup(
                            group.grup,
                            group.subbagian ? `${group.area} — ${grupEditValue.trim()}` : grupEditValue.trim(),
                          );
                        }
                        setEditingGrup(null);
                      }
                      if (e.key === "Escape") {
                        setEditingGrup(null);
                      }
                    }}
                    className="flex-1 text-[11px] font-bold bg-transparent border-b border-[hsl(var(--accent))] outline-none px-1 py-0"
                  />
                ) : (
                  <span
                    className="flex-1 text-[11px] font-bold text-[hsl(var(--foreground))] cursor-pointer hover:text-[hsl(var(--accent))] transition-colors uppercase tracking-wide"
                    onClick={() => {
                      setEditingGrup(group.grup);
                      setGrupEditValue(group.subbagian ?? group.grup);
                    }}
                  >
                    {(group.subbagian ?? group.grup).toUpperCase()}
                  </span>
                )}
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{group.fields.length} item</span>
                {!group.subbagian && group.grup !== "__META__" && (
                  <button
                    onClick={() => addSubbagian(group.area)}
                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 border border-[hsl(var(--border))] hover:bg-[hsl(var(--card))] transition-colors"
                  >
                    <FolderPlus className="w-3 h-3" /> Tambah Subbagian
                  </button>
                )}
                <button
                  onClick={() => addField(group.grup)}
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 border border-[hsl(var(--border))] hover:bg-[hsl(var(--card))] transition-colors"
                  title="Tambah item ke grup ini"
                >
                  <Plus className="w-3 h-3" /> Tambah
                </button>
                {group.grup !== "__META__" && (
                  <button
                    onClick={() => deleteGrup(group.grup)}
                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                    title="Hapus grup ini"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus
                  </button>
                )}
              </div>

              {/* Table */}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="w-10 px-2 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      No
                    </th>
                    <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Variabel / Komponen
                    </th>
                    <th className="w-16 px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Tipe
                    </th>
                    <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Opsi
                    </th>
                    <th className="w-14 px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Wajib
                    </th>
                    <th className="w-14 px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Nilai ✓
                    </th>
                    <th className="w-14 px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Nilai ✗
                    </th>
                    <th className="w-14 px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Bobot
                    </th>
                    <th className="w-20 px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.fields.map(({ field, index }) => {
                    const globalIndex = index + 1;
                    return (
                      <tr
                        key={index}
                        className="border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--muted))]/30 transition-colors"
                      >
                        {/* No */}
                        <td className="px-2 py-2 text-center">
                          <span className="w-6 h-6 inline-flex items-center justify-center text-[10px] font-bold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]">
                            {globalIndex}
                          </span>
                        </td>

                        {/* Variabel */}
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={field.pertanyaan}
                            onChange={(e) => updateField(index, "pertanyaan", e.target.value)}
                            placeholder="Ketik pertanyaan/komponen..."
                            className="w-full text-[11px] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/40 outline-none bg-transparent"
                          />
                        </td>

                        {/* Tipe */}
                        <td className="px-2 py-2 text-center">
                          <select
                            value={field.tipe}
                            onChange={(e) => updateField(index, "tipe", e.target.value)}
                            className="text-[9px] border border-[hsl(var(--border))] px-1.5 py-1 outline-none bg-[hsl(var(--card))] w-full"
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Opsi (untuk SELECT/DROPDOWN) */}
                        <td className="px-2 py-2">
                          {field.tipe === "SELECT" || field.tipe === "DROPDOWN" ? (
                            <input
                              value={
                                typeof field.options === "string"
                                  ? field.options
                                  : Array.isArray(field.options)
                                    ? field.options.join(", ")
                                    : ""
                              }
                              onChange={(e) => updateField(index, "options", e.target.value)}
                              placeholder="Opsi, pisahkan dengan koma"
                              className="w-full max-w-[220px] text-[10px] border border-[hsl(var(--border))] px-1.5 py-1 outline-none bg-[hsl(var(--card))]"
                            />
                          ) : (
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))] opacity-40">-</span>
                          )}
                        </td>

                        {/* Wajib */}
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={field.isRequired}
                            onChange={(e) => updateField(index, "isRequired", e.target.checked)}
                            className="w-4 h-4 border-[hsl(var(--border))] accent-[hsl(var(--foreground))] cursor-pointer"
                          />
                        </td>

                        {/* Skor Benar / Salah / Bobot */}
                        <td className="px-2 py-2 text-center">
                          {field.tipe === "BOOLEAN" ? (
                            <input
                              type="number"
                              value={field.skorBenar ?? 1}
                              onChange={(e) => updateField(index, "skorBenar", parseInt(e.target.value, 10) || 0)}
                              className="w-12 text-[10px] font-bold text-center border border-[hsl(var(--border))] px-1 py-1 outline-none bg-green-50 text-green-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              title="Nilai jika terpenuhi (Ya)"
                            />
                          ) : (
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))] opacity-50">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {field.tipe === "BOOLEAN" ? (
                            <input
                              type="number"
                              value={field.skorSalah ?? 0}
                              onChange={(e) => updateField(index, "skorSalah", parseInt(e.target.value, 10) || 0)}
                              className="w-12 text-[10px] font-bold text-center border border-[hsl(var(--border))] px-1 py-1 outline-none bg-red-50 text-red-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              title="Nilai jika tidak terpenuhi (Tidak)"
                            />
                          ) : (
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))] opacity-50">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            value={field.skor ?? 0}
                            onChange={(e) => updateField(index, "skor", parseInt(e.target.value, 10) || 0)}
                            min={0}
                            className="w-12 text-[10px] font-bold text-center border border-[hsl(var(--border))] px-1 py-1 outline-none bg-[hsl(var(--card))] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            title={field.tipe === "BOOLEAN" ? "Bobot pengali" : "Nilai/Bobot"}
                          />
                        </td>

                        {/* Aksi */}
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              onClick={() => moveField(index, "up")}
                              disabled={index === 0}
                              className="w-6 h-6 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-30 transition-colors"
                              title="Naik"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveField(index, "down")}
                              disabled={index === fields.length - 1}
                              className="w-6 h-6 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-30 transition-colors"
                              title="Turun"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => removeField(index)}
                              className="w-6 h-6 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-[hsl(var(--muted))] transition-colors"
                              title="Hapus"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Group Footer — Subtotal Score */}
              {group.fields.some((f) => (f.field.skor ?? 0) > 0) && (
                <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                  <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                    Subtotal Bobot {toRoman(romanIndex)}:
                  </span>
                  <span className="text-[12px] font-bold text-[hsl(var(--foreground))]">
                    {group.fields.reduce((s, { field }) => s + (field.skor ?? 0), 0)}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Bottom: Add Group */}
        {fields.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--border))]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => addField("__META__")}
                className="flex items-center gap-1.5 h-9 px-3 text-[11px] font-bold border border-indigo-500 text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Info Sasaran
              </button>
              <button
                onClick={() => {
                  const name = prompt("Nama grup (contoh: AIR, BANGUNAN, UDARA):");
                  if (name) addGrup(name);
                }}
                className="flex items-center gap-1.5 h-9 px-3 text-[11px] font-bold border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" /> Tambah Grup
              </button>
            </div>

            {/* Total Score */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))]">Total Bobot</span>
              <span className="text-[18px] font-bold text-[hsl(var(--foreground))]">{totalSkor}</span>
            </div>
          </div>
        )}
      </div>

      {/* Delete */}
      {selectedTemplateId && (
        <button
          onClick={() => {
            if (confirm("Hapus template ini?")) {
              deleteMutation.mutate(selectedTemplateId);
            }
          }}
          className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 hover:underline"
        >
          <Trash2 className="w-3.5 h-3.5" /> Hapus Template
        </button>
      )}
    </div>
  );
}
