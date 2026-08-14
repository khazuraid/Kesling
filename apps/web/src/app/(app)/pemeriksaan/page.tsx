"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Database,
  Download,
  Edit3,
  FileText,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { FormView } from "./FormView";
/* NOTE: <Fragment key={...}> used wrap map groups instead of useMemo.Component */

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

  // Same Sasaran register and category semantics as /data-dasar/[categoryCode].
  // API auth applies the identical Puskesmas visibility rule and createdAt ordering.
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

  const handleFieldChange = useCallback((fieldId: number, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleMetaChange = useCallback((fieldId: number, value: any) => {
    setMetaValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  function handleOpenForm(template: any) {
    setEditingId(null);
    setSasaranId(null);
    setSasaranSearch("");
    const dataDasarCategoryId = Number(template.config?.dataDasarCategoryId ?? template.dataDasarCategory?.id);
    if (!Number.isInteger(dataDasarCategoryId) || dataDasarCategoryId <= 0) {
      toast.error("Form belum terhubung ke kategori Data Dasar");
      return;
    }
    setPendingForm({
      ...template,
      config: { ...template.config, dataDasarCategoryId },
    });
  }

  function openFormWithSasaran(template: any, sasaran: any) {
    const initVal: Record<number, any> = {};
    const initMeta: Record<number, any> = {};
    const dynamicSource = (sasaran?.dataDinamis || {}) as Record<string, unknown>;
    const baselineParams = template.dataDasarCategory?.parameters || [];
    template.fields.forEach((f: any) => {
      if (f.grup === "__META__") {
        const configuredCode = f.config?.dataDasarCode || f.config?.parameterCode;
        const configuredEntityField = f.config?.syncToEntityField;
        const parameter = baselineParams.find(
          (p: any) =>
            p.code === configuredCode ||
            (configuredEntityField && p.config?.syncToEntityField === configuredEntityField),
        );
        const entityField = configuredEntityField || parameter?.config?.syncToEntityField;
        initMeta[f.id] =
          (parameter?.code ? dynamicSource[parameter.code] : undefined) ??
          (entityField ? sasaran?.[entityField] : undefined) ??
          "";
      } else initVal[f.id] = null;
    });
    setSasaranId(sasaran.id);
    setFormValues(initVal);
    setMetaValues(initMeta);
    setPendingForm(null);
    setActiveForm(template);
  }

  function handleEditResult(result: any) {
    const template = templates.find((t) => t.id === result.templateId);
    if (!template) return toast.error("Template form tidak ditemukan");
    setEditingId(result.id);
    const initVal: Record<number, any> = {};
    const initMeta: Record<number, any> = {};
    template.fields.forEach((f: any) => {
      if (f.grup === "__META__") initMeta[f.id] = "";
      else initVal[f.id] = null;
    });
    result.values?.forEach((v: any) => {
      const field = template.fields.find((f: any) => f.id === v.fieldId);
      if (field) {
        if (field.grup === "__META__") initMeta[field.id] = v.valueString ?? "";
        else initVal[field.id] = v.valueString ?? v.valueNumber;
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
      handleMetaChange(id, `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`);
    });
  }

  async function exportResultPdf(res: any) {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    const template = templates.find((t) => t.id === res.templateId);
    const namaSasaran = res.sasaran ? res.sasaran.nama : res.namaSasaran || "-";
    const alamatSasaran = res.sasaran ? res.sasaran.alamat : res.alamatSasaran || "-";
    const tanggal = res.tanggal
      ? new Date(res.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : new Date(res.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    // Header
    doc.setFontSize(14);
    doc.setTextColor(0, 122, 255); // accent
    doc.text("HASIL PEMERIKSAAN KESEHATAN LINGKUNGAN", 14, 15);
    doc.setTextColor(9, 9, 11);
    doc.setFontSize(12);
    doc.text(template?.nama || "Pemeriksaan", 14, 23);
    doc.setFontSize(9);
    doc.setTextColor(113, 113, 122);
    doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, 28);

    // Info sasaran
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

    // Hasil checklist
    const rows: (string | number)[][] = [];
    (template?.fields || [])
      .filter((f: any) => f.grup !== "__META__")
      .forEach((f: any) => {
        const v = (res.values || []).find((rv: any) => rv.fieldId === f.id);
        let answer = "-";
        if (v) {
          if (f.tipe === "BOOLEAN") answer = v.valueString === "True" || v.valueString === "true" ? "✔ Ya" : "✘ Tidak";
          else if (v.valueNumber !== null && v.valueNumber !== undefined) answer = String(v.valueNumber);
          else if (v.valueString) answer = v.valueString;
        }
        rows.push([f.pertanyaan, answer]);
      });

    const skor = res.skor;
    if (skor !== undefined && skor !== null) {
      rows.push(["SKOR AKHIR", String(skor)]);
    }

    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 55,
      head: [["Variabel / Pertanyaan", "Hasil"]],
      body: rows,
      styles: { fontSize: 9, cellPadding: 3, textColor: [9, 9, 11] },
      headStyles: { fillColor: [0, 122, 255], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [244, 244, 245] },
      columnStyles: { 1: { cellWidth: 60 } },
    });

    doc.save(`pemeriksaan-${namaSasaran.replace(/\s+/g, "-").toLowerCase()}.pdf`);
  }

  function handleSubmit() {
    // Extract signature & photo from values → simpan ke kolom khusus
    const signatures: Record<string, string> = {};
    const fotoPaths: string[] = [];
    let tanggalPemeriksaan: string | null = null;

    const valuesArray = Object.entries(formValues).map(([fid, val]) => {
      const field = activeForm.fields.find((f: any) => f.id === Number(fid));
      if (field?.tipe === "SIGNATURE" && val && val !== "") {
        signatures[field.pertanyaan || "petugas"] = val;
      }
      if (field?.tipe === "PHOTO" && val && val !== "") {
        fotoPaths.push(val);
      }
      if (field?.tipe === "DATE" && val && val !== "") {
        tanggalPemeriksaan = val;
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
      if (field?.tipe === "DATE" && val && val !== "") {
        tanggalPemeriksaan = val;
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

    let bulan = new Date().getMonth() + 1;
    let tahun = new Date().getFullYear();
    if (tanggalPemeriksaan) {
      const d = new Date(tanggalPemeriksaan);
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
      lat: null,
      lng: null,
      bulan,
      tahun,
      tanggalPemeriksaan,
      signatureData: Object.keys(signatures).length > 0 ? signatures : null,
      fotoPaths: fotoPaths.length > 0 ? fotoPaths : null,
      values: [...valuesArray, ...metaArray],
    });
  }

  const _metaFields = useMemo(() => activeForm?.fields.filter((f: any) => f.grup === "__META__") || [], [activeForm]);
  const fieldsToChecklist = useMemo(
    () => activeForm?.fields.filter((f: any) => f.grup !== "__META__") || [],
    [activeForm],
  );
  const _groupedFields = useMemo(() => {
    if (!activeForm) return [];
    const groups: { grup: string; fields: any[] }[] = [];
    const groupMap = new Map<string, any[]>();
    fieldsToChecklist.forEach((f: any) => {
      const g = f.grup || "Lainnya";
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)?.push(f);
    });
    groupMap.forEach((fields, grup) => {
      groups.push({ grup, fields });
    });
    return groups;
  }, [activeForm, fieldsToChecklist]);

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
      const skorBenar = f.config?.skorBenar ?? f.config?.skor ?? 1;
      const skorSalah = f.config?.skorSalah ?? 0;
      max += Math.max(skorBenar, skorSalah);
      const val = formValues[f.id];
      if (f.tipe === "BOOLEAN") {
        if (val === "TRUE") {
          gained += skorBenar;
          countBenar++;
        } else if (val === "FALSE") {
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
          .replace(/✓/g, String(countBenar))
          .replace(/✗/g, String(countSalah));
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
  }, [activeForm, formValues]);

  const canSubmit =
    activeForm &&
    fieldsToChecklist
      .filter((f: any) => f.isRequired !== false)
      .every((f: any) => {
        const val = formValues[f.id];
        return val !== null && val !== undefined && val !== "";
      });

  // ══════════════════════════════════════
  // PAGE GUARD — ADMIN tidak bisa akses
  // ══════════════════════════════════════
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

  // ================= DATA DASAR CHOOSER =================
  if (pendingForm) {
    return (
      <div className="w-full pb-6 fade-in">
        <button
          onClick={() => setPendingForm(null)}
          className="mb-5 flex items-center gap-2 text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke formulir
        </button>
        <div className="border-b border-[hsl(var(--border))] pb-5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
            <FileText className="h-3.5 w-3.5" /> {pendingForm.nama} <ChevronRight className="h-3 w-3" /> Data Dasar
          </div>
          <h1 className="text-[22px] font-bold tracking-tight">Pilih Sasaran Pemeriksaan</h1>
          <p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">
            Menampilkan Data Dasar modul {pendingForm.dataDasarCategory?.nama} untuk seluruh jenis entitas. Pilih satu
            sasaran untuk membuka formulir.
          </p>
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
                Tambahkan sasaran pada menu Data Dasar untuk kategori ini.
              </p>
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
      </div>
    );
  }

  // ================= LIST VIEW =================
  if (!activeForm) {
    return (
      <div className="w-full mx-auto pb-4 space-y-4 fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[hsl(var(--accent-light))] border border-[hsl(var(--accent))/0.15] flex items-center justify-center">
            <FileText className="w-4 h-4 text-[hsl(var(--accent))]" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-[hsl(var(--foreground))]">Pemeriksaan Lapangan</h1>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Daftar form dan riwayat pemeriksaan</p>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-[hsl(var(--border))]">
          <button
            onClick={() => setActiveTab("formulir")}
            className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
              activeTab === "formulir"
                ? "border-[hsl(var(--accent))] text-[hsl(var(--accent))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))]"
            }`}
          >
            Formulir{" "}
            <span
              className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-md ${activeTab === "formulir" ? "bg-[hsl(var(--accent-light))] text-[hsl(var(--accent))]" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"}`}
            >
              {templates.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("riwayat")}
            className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
              activeTab === "riwayat"
                ? "border-[hsl(var(--accent))] text-[hsl(var(--accent))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))]"
            }`}
          >
            Riwayat{" "}
            <span
              className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-md ${activeTab === "riwayat" ? "bg-[hsl(var(--accent-light))] text-[hsl(var(--accent))]" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"}`}
            >
              {results.length}
            </span>
          </button>
        </div>

        {activeTab === "formulir" && (
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-[var(--shadow)]">
            {templates.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--accent-light))] flex items-center justify-center">
                  <FileText className="w-7 h-7 text-[hsl(var(--accent))] opacity-60" />
                </div>
                <div>
                  <p className="text-[14px] font-bold">Belum ada template</p>
                  <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">
                    Import template lewat Settings → Import.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[hsl(var(--border))]">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center justify-between gap-3 p-4 hover:bg-[hsl(var(--accent-light))]/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-bold flex items-center gap-2">
                        {tpl.nama}
                        {tpl.subCategory && (
                          <span className="text-[10px] font-bold text-[hsl(var(--accent))] uppercase bg-[hsl(var(--accent-light))] px-2 py-0.5 rounded-md shrink-0">
                            {tpl.subCategory.nama}
                          </span>
                        )}
                      </h3>
                      <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                        {tpl.deskripsi || "-"} • {tpl.fields?.filter((f: any) => f.grup !== "__META__").length || 0}{" "}
                        Variabel
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenForm(tpl)}
                      className="px-4 py-2 rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] text-[12px] font-bold hover:opacity-90 transition-opacity shadow-sm shrink-0"
                    >
                      Buka Form
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "riwayat" && (
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto shadow-[var(--shadow)]">
            {results.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--success-light))] flex items-center justify-center">
                  <ShieldAlert className="w-7 h-7 text-[hsl(var(--success))] opacity-60" />
                </div>
                <div>
                  <p className="text-[14px] font-bold">Belum ada riwayat</p>
                  <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">
                    Hasil pemeriksaan akan tampil di sini.
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    <th className="px-4 py-2">Tanggal</th>
                    <th className="px-4 py-2">Sasaran</th>
                    <th className="px-4 py-2">Template</th>
                    <th className="px-4 py-2">Unit PKM</th>
                    <th className="px-4 py-2 text-right w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]/50 text-[12px]">
                  {results.map((res) => (
                    <tr key={res.id} className="hover:bg-[hsl(var(--muted))]/30 transition-colors">
                      <td className="px-4 py-2.5">
                        {new Date(res.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-2.5 font-bold">{res.sasaran ? res.sasaran.nama : res.namaSasaran}</td>
                      <td className="px-4 py-2.5 text-[hsl(var(--muted-foreground))]">{res.template?.nama}</td>
                      <td className="px-4 py-2.5 text-[hsl(var(--muted-foreground))]">{res.puskesmas?.nama}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => exportResultPdf(res)}
                            title="Export PDF"
                            className="text-[hsl(var(--accent))] hover:opacity-75"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditResult(res)}
                            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus?`)) deleteMut.mutate(res.id);
                            }}
                            className="text-[hsl(var(--muted-foreground))] hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    );
  }

  // ================= FORM CHECKLIST VIEW =================
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
        onTanggalChange={setTanggalPemeriksaan}
        onBack={() => {
          setActiveForm(null);
          setEditingId(null);
          setFormValues({});
          setMetaValues({});
        }}
        onFieldChange={handleFieldChange}
        onMetaChange={handleMetaChange}
        onGPS={handleGPS}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
