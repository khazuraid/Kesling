const fs = require('fs');

const code = `import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Layers } from "lucide-react";
import { useState } from "react";

export function LaporanBuilderPreview({ 
  module, 
  isOpen, 
  onClose 
}: { 
  module: any; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [dummyValues, setDummyValues] = useState<Record<string, string>>({});

  if (!module) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-[hsl(var(--background))] p-0 gap-0 border border-[hsl(var(--border))] !rounded-none">
        <div className="p-6 md:p-8 border-b border-[hsl(var(--border))] shrink-0 bg-[hsl(var(--muted))]/20">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                Live Preview: {module.nama}
              </DialogTitle>
              <p className="text-[hsl(var(--muted-foreground))] font-medium">
                Below is how this module will appear to operators during data entry.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[hsl(var(--background))]">
          {module.parameters.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10">
              <p className="text-[14px] text-[hsl(var(--muted-foreground))] font-medium">Modul ini belum memiliki parameter/field.</p>
            </div>
          ) : module.isRowBased ? (
            <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[hsl(var(--muted))]/30">
                    <th className="p-4 border-b border-[hsl(var(--border))] text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider min-w-[200px]">
                      Entitas / Sasaran
                    </th>
                    {module.parameters
                      .sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0))
                      .map((p: any) => (
                        <th key={p.id} className="p-4 border-b border-[hsl(var(--border))] text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider min-w-[150px]">
                          {p.nama} {p.required && <span className="text-rose-500">*</span>}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {!module.subCategories || module.subCategories.length === 0 ? (
                    <tr>
                      <td colSpan={module.parameters.length + 1} className="p-8 text-center text-[13px] text-[hsl(var(--muted-foreground))] font-medium">
                        Belum ada entitas. Tambahkan entitas untuk melihat baris form.
                      </td>
                    </tr>
                  ) : (
                    module.subCategories
                      .sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0))
                      .map((sub: any) => (
                        <tr key={sub.id} className="hover:bg-[hsl(var(--muted))]/20 transition-colors">
                          <td className="p-4 border-b border-[hsl(var(--border))] font-medium text-[hsl(var(--foreground))] text-[13px] whitespace-nowrap">
                            {sub.nama}
                          </td>
                          {module.parameters
                            .sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0))
                            .map((p: any) => {
                              const key = \`\${sub.id}-\${p.id}\`;
                              return (
                                <td key={p.id} className="p-4 border-b border-[hsl(var(--border))] min-w-[150px]">
                                  {p.type === "SELECT" && p.config?.options ? (
                                    <select
                                      className="w-full h-9 px-3 border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-medium focus:border-[hsl(var(--ring))] outline-none"
                                      value={dummyValues[key] || ""}
                                      onChange={(e) => setDummyValues({ ...dummyValues, [key]: e.target.value })}
                                    >
                                      <option value="">Pilih...</option>
                                      {p.config.options.split(",").map((opt: string) => (
                                        <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type={p.type === "NUMBER" || p.type === "DECIMAL" ? "number" : "text"}
                                      min={p.config?.min}
                                      max={p.config?.max}
                                      placeholder={p.type === "NUMBER" ? "0" : "Isi nilai..."}
                                      className="w-full h-9 px-3 border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-medium focus:border-[hsl(var(--ring))] outline-none transition-colors"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[hsl(var(--card))] p-8 border border-[hsl(var(--border))]">
              {module.parameters
                .sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0))
                .map((p: any) => {
                  const key = \`null-\${p.id}\`;
                  return (
                    <div key={p.id} className="space-y-2">
                      <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
                        {p.nama} {p.required && <span className="text-rose-500">*</span>}
                      </label>
                      {p.type === "SELECT" && p.config?.options ? (
                        <select
                          className="w-full h-11 px-3 border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[13px] font-medium focus:border-[hsl(var(--ring))] outline-none transition-all"
                          value={dummyValues[key] || ""}
                          onChange={(e) => setDummyValues({ ...dummyValues, [key]: e.target.value })}
                        >
                          <option value="">Pilih...</option>
                          {p.config.options.split(",").map((opt: string) => (
                            <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={p.type === "NUMBER" || p.type === "DECIMAL" ? "number" : "text"}
                          min={p.config?.min}
                          max={p.config?.max}
                          placeholder={p.type === "NUMBER" ? "0" : "Isi nilai..."}
                          className="w-full h-11 px-3 border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[13px] font-medium focus:border-[hsl(var(--ring))] outline-none transition-all"
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
      </DialogContent>
    </Dialog>
  );
}
`;

fs.writeFileSync('apps/web/src/components/laporan-builder-preview.tsx', code);
