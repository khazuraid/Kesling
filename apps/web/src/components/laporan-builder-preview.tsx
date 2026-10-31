import { Layers } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function parseOptions(raw: any): string[] {
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

export function LaporanBuilderPreview({
  module,
  isOpen,
  onClose,
}: {
  module: any;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [dummyValues, setDummyValues] = useState<Record<string, string>>({});

  if (!module) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-surface p-0 gap-0 border border-border rounded-2xl shadow-float">
        <div className="p-4 sm:p-6 border-b border-border shrink-0 bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border text-primary flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                Live Preview: {module.nama}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                Simulasi tampilan formulir input data bagi petugas puskesmas
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-canvas">
          {module.parameters.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl bg-surface">
              <p className="text-[13px] text-muted-foreground font-medium">Modul ini belum memiliki parameter/field.</p>
            </div>
          ) : module.isRowBased ? (
            <div className="border border-border rounded-xl bg-surface overflow-x-auto shadow-subtle">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-subtle">
                    <th className="p-3 sm:p-4 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider min-w-[180px]">
                      Entitas / Sasaran
                    </th>
                    {[...(module.parameters || [])]
                      .sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0))
                      .map((p: any) => (
                        <th
                          key={p.id}
                          className="p-3 sm:p-4 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider min-w-[140px]"
                        >
                          {p.nama} {p.required && <span className="text-rose-500">*</span>}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {!module.subCategories || module.subCategories.length === 0 ? (
                    <tr>
                      <td
                        colSpan={(module.parameters || []).length + 1}
                        className="p-8 text-center text-[13px] text-[hsl(var(--muted-foreground))] font-medium"
                      >
                        Belum ada entitas. Tambahkan entitas untuk melihat baris form.
                      </td>
                    </tr>
                  ) : (
                    [...module.subCategories]
                      .sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0))
                      .map((sub: any) => (
                        <tr key={sub.id} className="hover:bg-[hsl(var(--muted))]/20 transition-colors">
                          <td className="p-4 border-b border-[hsl(var(--border))] font-medium text-[hsl(var(--foreground))] text-[13px] whitespace-nowrap">
                            {sub.nama}
                          </td>
                          {[...(module.parameters || [])]
                            .sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0))
                            .map((p: any) => {
                              const key = `${sub.id}-${p.id}`;
                              return (
                                <td key={p.id} className="p-4 border-b border-[hsl(var(--border))] min-w-[150px]">
                                  {p.type === "SELECT" && p.config?.options ? (
                                    <Select
                                      className="w-full h-9 px-3 text-xs font-medium"
                                      value={dummyValues[key] || ""}
                                      onChange={(e) => setDummyValues({ ...dummyValues, [key]: e.target.value })}
                                    >
                                      <option value="">Pilih...</option>
                                      {parseOptions(p.config.options).map((opt: string) => (
                                        <option key={opt} value={opt}>
                                          {opt}
                                        </option>
                                      ))}
                                    </Select>
                                  ) : (
                                    <Input
                                      type={p.type === "NUMBER" || p.type === "DECIMAL" ? "number" : "text"}
                                      min={p.config?.min}
                                      max={p.config?.max}
                                      placeholder={p.type === "NUMBER" ? "0" : "Isi nilai..."}
                                      className="w-full h-9 px-3 text-xs font-medium"
                                      value={dummyValues[key] || ""}
                                      onChange={(e) => setDummyValues({ ...dummyValues, [key]: e.target.value })}
                                    />
                                  )}
                                </td>
                              );
                            })}
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-surface p-4 sm:p-6 border border-border rounded-xl shadow-subtle">
              {module.parameters
                .sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0))
                .map((p: any) => {
                  const key = `null-${p.id}`;
                  return (
                    <div key={p.id} className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                        {p.nama} {p.required && <span className="text-rose-500">*</span>}
                      </Label>
                      {p.type === "SELECT" && p.config?.options ? (
                        <Select
                          className="w-full text-xs font-medium"
                          value={dummyValues[key] || ""}
                          onChange={(e) => setDummyValues({ ...dummyValues, [key]: e.target.value })}
                        >
                          <option value="">Pilih...</option>
                          {parseOptions(p.config.options).map((opt: string) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          type={p.type === "NUMBER" || p.type === "DECIMAL" ? "number" : "text"}
                          min={p.config?.min}
                          max={p.config?.max}
                          placeholder={p.type === "NUMBER" ? "0" : "Isi nilai..."}
                          className="w-full text-xs font-medium"
                          value={dummyValues[key] || ""}
                          onChange={(e) => setDummyValues({ ...dummyValues, [key]: e.target.value })}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border shrink-0 bg-surface flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-5 rounded-full border border-border text-xs font-bold text-foreground hover:bg-surface-subtle transition-colors"
          >
            Tutup Preview
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
