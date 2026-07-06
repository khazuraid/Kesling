"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, FileText, ShieldAlert, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { FormView } from "./FormView";
/* NOTE: <Fragment key={...}> used wrap map groups instead of useMemo.Component */

export default function PemeriksaanPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [activeForm, setActiveForm] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<Record<number, any>>({});
  const [metaValues, setMetaValues] = useState<Record<number, any>>({});
  const [tanggalPemeriksaan, setTanggalPemeriksaan] = useState<string>(new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState<"formulir" | "riwayat">("formulir");

  const [sasaranId, setSasaranId] = useState<number | null>(null);

  // Fetch sasaran data (Data Dasar) untuk SubCategory form yang sedang aktif
  const { data: sasarans = [] } = useQuery<any[]>({
    queryKey: ["sasarans", activeForm?.subCategoryId],
    queryFn: async () => {
      if (!activeForm?.subCategoryId) return [];
      const res = await fetch(`/api/sasaran?subCategoryId=${activeForm.subCategoryId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeForm?.subCategoryId,
  });

  const { data: templates = [], isLoading } = useQuery<any[]>({
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
    const initVal: Record<number, any> = {};
    const initMeta: Record<number, any> = {};
    template.fields.forEach((f: any) => {
      if (f.grup === "__META__") initMeta[f.id] = "";
      else initVal[f.id] = null;
    });
    setFormValues(initVal);
    setMetaValues(initMeta);
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
    setActiveForm(template);
  }

  function handleGPS(id: number) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      handleMetaChange(id, `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`);
    });
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
    groupMap.forEach((fields, grup) => groups.push({ grup, fields }));
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

  // ================= LIST VIEW =================
  if (!activeForm) {
    return (
      <div className="w-full mx-auto pb-4 space-y-4 fade-in">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
          <div>
            <h1 className="text-[16px] font-bold text-[hsl(var(--foreground))]">Pemeriksaan Lapangan</h1>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Daftar form dan riwayat pemeriksaan</p>
          </div>
        </div>

        <div className="flex items-center border-b border-[hsl(var(--border))]">
          <button
            onClick={() => setActiveTab("formulir")}
            className={`px-4 py-2 text-[12px] font-bold border-b-2 transition-colors ${
              activeTab === "formulir"
                ? "border-[hsl(var(--foreground))] text-[hsl(var(--foreground))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))]"
            }`}
          >
            Formulir <span className="bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[10px]">{templates.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("riwayat")}
            className={`px-4 py-2 text-[12px] font-bold border-b-2 transition-colors ${
              activeTab === "riwayat"
                ? "border-[hsl(var(--foreground))] text-[hsl(var(--foreground))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))]"
            }`}
          >
            Riwayat <span className="bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[10px]">{results.length}</span>
          </button>
        </div>

        {activeTab === "formulir" && (
          <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            {templates.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[12px] font-bold">Belum ada template</p>
              </div>
            ) : (
              <div className="divide-y divide-[hsl(var(--border))]">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center justify-between p-4 hover:bg-[hsl(var(--muted))]/30 transition-colors"
                  >
                    <div>
                      <h3 className="text-[13px] font-bold flex items-center gap-2">
                        {tpl.nama}
                        {tpl.subCategory && (
                          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase border border-[hsl(var(--border))] px-1.5 py-0.5">
                            {tpl.subCategory.nama}
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                        {tpl.deskripsi || "-"} • {tpl.fields?.filter((f: any) => f.grup !== "__META__").length || 0}{" "}
                        Variabel
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenForm(tpl)}
                      className="px-4 py-1.5 border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[11px] font-bold uppercase hover:bg-[hsl(var(--foreground))] hover:text-[hsl(var(--background))] transition-colors"
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
          <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
            {results.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[12px] font-bold">Belum ada riwayat</p>
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
      {/* DROPDOWN DATA DASAR (SASARAN) */}
      <div className="px-5 pt-4 pb-2 bg-[hsl(var(--background))] border-b border-[hsl(var(--border))]">
        <label className="block text-[10px] font-black uppercase text-[hsl(var(--muted-foreground))] mb-1">
          Pilih Data Dasar (Sasaran)
        </label>
        <select
          value={sasaranId || ""}
          onChange={(e) => setSasaranId(e.target.value ? Number(e.target.value) : null)}
          className="w-full max-w-sm px-3 py-2 border border-[hsl(var(--border))] bg-transparent text-[12px] font-bold"
        >
          <option value="">-- Pilih Sasaran dari Data Dasar --</option>
          {sasarans.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.nama}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
          Atau isi info manual di form meta bawah ini jika belum terdaftar.
        </p>
      </div>

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
