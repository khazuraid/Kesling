"use client";

import { ArrowLeft, MapPin, Upload } from "lucide-react";
import { SignaturePad } from "@/components/ui/signature-pad";
import { toRoman } from "./helpers";

interface FormViewProps {
  activeForm: any;
  editingId: number | null;
  formValues: Record<number, any>;
  metaValues: Record<number, any>;
  liveSkor: { gained: number; max: number; valueText: string; pass: boolean; text: string };
  canSubmit: boolean;
  isPending: boolean;
  tanggalPemeriksaan: string;
  onBack: () => void;
  onFieldChange: (id: number, val: any) => void;
  onMetaChange: (id: number, val: any) => void;
  onGPS: (id: number) => void;
  onTanggalChange: (val: string) => void;
  onSubmit: () => void;
}

export function FormView({
  activeForm,
  editingId,
  formValues,
  metaValues,
  liveSkor,
  canSubmit,
  isPending,
  tanggalPemeriksaan,
  onBack,
  onFieldChange,
  onMetaChange,
  onGPS,
  onTanggalChange,
  onSubmit,
}: FormViewProps) {
  const metaFields = activeForm.fields.filter((f: any) => f.grup === "__META__");
  const penilaianFields = activeForm.fields.filter((f: any) => f.grup !== "__META__");

  const groups: { grup: string; fields: any[] }[] = [];
  const groupMap = new Map<string, any[]>();
  penilaianFields.forEach((f: any) => {
    const g = f.grup || "Lainnya";
    if (!groupMap.has(g)) groupMap.set(g, []);
    groupMap.get(g)?.push(f);
  });
  groupMap.forEach((fields, grup) => groups.push({ grup, fields }));

  return (
    <div className="w-full pb-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[13px] font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
      </div>

      {/* Title & Score */}
      <div className="border-b border-[hsl(var(--border))] pb-6 mb-8">
        <h1 className="text-[24px] font-bold mb-2">{activeForm.nama}</h1>
        {activeForm.deskripsi && (
          <p className="text-[13px] text-[hsl(var(--muted-foreground))] mb-4">{activeForm.deskripsi}</p>
        )}

        {liveSkor.max > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-bold tabular-nums">{liveSkor.valueText}</span>
              <span className="text-[13px] text-[hsl(var(--muted-foreground))]">/ {liveSkor.max}</span>
            </div>
            {activeForm.config?.thresholdOperator && (
              <span className={`text-[12px] font-medium ${liveSkor.pass ? "text-green-700" : "text-red-700"}`}>
                {liveSkor.text}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Meta Fields */}
      <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 mb-6">
        <h2 className="text-[14px] font-semibold mb-4 pb-3 border-b border-[hsl(var(--border))]">Informasi Sasaran</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <label className="text-[13px] font-medium leading-relaxed">
                Tanggal Pemeriksaan <span className="ml-1 text-red-500">*</span>
              </label>
            </div>
            <input
              type="date"
              value={tanggalPemeriksaan}
              onChange={(e) => onTanggalChange(e.target.value)}
              className="w-full max-w-[200px] border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[13px] outline-none focus:border-[hsl(var(--foreground))] transition-colors"
            />
          </div>
          {metaFields.map((f: any) => (
            <FieldInput
              key={f.id}
              field={f}
              value={metaValues[f.id] ?? ""}
              onChange={(v) => onMetaChange(f.id, v)}
              onGPS={() => onGPS(f.id)}
            />
          ))}
        </div>
      </div>

      {/* Penilaian Groups */}
      <div className="space-y-6">
        {groups.map((group, gi) => (
          <div key={group.grup} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            {/* Group Header */}
            <div className="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10">
              <h2 className="text-[14px] font-semibold flex items-center gap-2">
                <span className="text-[13px] text-[hsl(var(--muted-foreground))]">{toRoman(gi + 1)}.</span>
                {group.grup}
              </h2>
            </div>

            {/* Group Fields */}
            <div className="p-6 space-y-6">
              {group.fields.map((f: any) => (
                <FieldInput
                  key={f.id}
                  field={f}
                  value={formValues[f.id] ?? null}
                  onChange={(v) => onFieldChange(f.id, v)}
                  onGPS={() => onGPS(f.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tombol Simpan di bawah */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={onSubmit}
          disabled={!canSubmit || isPending}
          className="h-10 px-8 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[13px] font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {isPending ? "Menyimpan..." : editingId ? "Update" : "Simpan"}
        </button>
      </div>
    </div>
  );
}

// ─── Field Input Component ──────────────────────────────────────────────

function FieldInput({
  field: f,
  value,
  onChange,
  onGPS,
}: {
  field: any;
  value: any;
  onChange: (v: any) => void;
  onGPS: () => void;
}) {
  const hasValue = value !== null && value !== undefined && value !== "";

  return (
    <div className="space-y-2">
      {/* Label Row */}
      <div className="flex items-start justify-between gap-3">
        <label className="text-[13px] font-medium leading-relaxed">
          {f.pertanyaan}
          {f.isRequired && <span className="ml-1 text-red-500">*</span>}
        </label>
        {(f.config?.skor ?? 0) > 0 && (
          <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))] whitespace-nowrap">
            Bobot: {f.config.skor}
          </span>
        )}
      </div>

      {/* Input by Type */}
      {f.tipe === "BOOLEAN" && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange("TRUE")}
            className={`flex-1 h-10 px-4 text-[13px] font-medium border transition-colors ${
              value === "TRUE"
                ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                : "border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--foreground))]"
            }`}
          >
            Ya
          </button>
          <button
            type="button"
            onClick={() => onChange("FALSE")}
            className={`flex-1 h-10 px-4 text-[13px] font-medium border transition-colors ${
              value === "FALSE"
                ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                : "border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--foreground))]"
            }`}
          >
            Tidak
          </button>
        </div>
      )}

      {f.tipe === "TEXT" && (
        <textarea
          rows={3}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tulis jawaban..."
          className="w-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-[hsl(var(--foreground))] transition-colors resize-y"
        />
      )}

      {f.tipe === "NUMBER" && (
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full max-w-[200px] border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[13px] tabular-nums outline-none focus:border-[hsl(var(--foreground))] transition-colors"
        />
      )}

      {f.tipe === "DATE" && (
        <input
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full max-w-[200px] border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[13px] outline-none focus:border-[hsl(var(--foreground))] transition-colors"
        />
      )}

      {(f.tipe === "DROPDOWN" || f.tipe === "SELECT") && (
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[13px] outline-none focus:border-[hsl(var(--foreground))] transition-colors"
        >
          <option value="">— Pilih —</option>
          {(f.options ? (typeof f.options === "string" ? JSON.parse(f.options) : f.options) : []).map((opt: string) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {f.tipe === "GPS" && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGPS}
            className="h-9 px-4 border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[12px] font-medium hover:border-[hsl(var(--foreground))] transition-colors flex items-center gap-2"
          >
            <MapPin className="w-3.5 h-3.5" />
            {hasValue ? "Perbarui Lokasi" : "Ambil Lokasi"}
          </button>
          {hasValue && <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{value}</span>}
        </div>
      )}

      {f.tipe === "PHOTO" && (
        <div>
          {hasValue ? (
            <div className="relative inline-block border border-[hsl(var(--border))]">
              <img src={value} className="w-32 h-32 object-cover" alt="foto" />
              <button
                onClick={() => onChange("")}
                className="absolute top-1 right-1 w-5 h-5 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] flex items-center justify-center text-[10px] font-bold hover:opacity-80"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="h-9 px-4 border border-dashed border-[hsl(var(--border))] cursor-pointer text-[12px] font-medium text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground))] transition-colors flex items-center gap-2">
              <Upload className="w-3.5 h-3.5" />
              Upload Foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => onChange(reader.result);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          )}
        </div>
      )}

      {f.tipe === "SIGNATURE" && (
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
          <div className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">
            Tanda Tangan
          </div>
          <SignaturePad value={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
