import re

file_path = "/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/form-pemeriksaan/page.tsx"
with open(file_path, "r") as f:
    text = f.read()

# Add logic functions for meta fields
meta_funcs = """
  function addMetaField() {
    setMetaFields([...metaFields, { pertanyaan: "", tipe: "TEXT", isRequired: true, grup: "__META__", options: "" }]);
  }

  function removeMetaField(index: number) {
    setMetaFields(metaFields.filter((_, i) => i !== index));
  }

  function updateMetaField(index: number, key: string, value: any) {
    const newFields = [...metaFields];
    newFields[index] = { ...newFields[index], [key]: value };
    setMetaFields(newFields);
  }
"""

text = text.replace("function addField() {", meta_funcs + "\n  function addField() {")

# Add the UI to the Meta Config block
meta_ui = """
                  <div className="mt-6 border-t border-neutral-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Field Header Dinamis (Tambahan)</h4>
                      <button onClick={addMetaField} className="flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-1 border border-neutral-200 bg-neutral-50 hover:bg-neutral-100">
                        <Plus className="w-3 h-3" /> Tambah Header
                      </button>
                    </div>
                    <div className="space-y-2">
                      {metaFields.map((mf, index) => (
                        <div key={`meta-${index}`} className="flex gap-2 items-start p-2 border border-neutral-100 bg-neutral-50/50">
                          <div className="flex-1 space-y-1">
                            <input type="text" className="w-full h-7 px-2 border border-neutral-200 text-[11px] font-medium focus:border-black outline-none" value={mf.pertanyaan} onChange={(e) => updateMetaField(index, "pertanyaan", e.target.value)} placeholder="cth: Nama Petugas / Tanggal" />
                          </div>
                          <div className="w-32 space-y-1">
                            <select className="w-full h-7 px-1 border border-neutral-200 text-[10px] outline-none" value={mf.tipe} onChange={(e) => updateMetaField(index, "tipe", e.target.value)}>
                              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          {mf.tipe === "DROPDOWN" && (
                            <div className="flex-1 space-y-1">
                               <input type="text" className="w-full h-7 px-2 border border-neutral-200 text-[11px] font-medium outline-none" value={mf.options || ""} onChange={(e) => updateMetaField(index, "options", e.target.value)} placeholder="Opsi 1, Opsi 2" />
                            </div>
                          )}
                          <button onClick={() => removeMetaField(index)} className="h-7 px-2 text-red-400 hover:text-red-600 border border-transparent hover:border-red-100 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                      ))}
                    </div>
                  </div>
"""

# Insert right after the category select box ends
text = text.replace('</select>\n                  </div>\n                </div>', '</select>\n                  </div>\n' + meta_ui + '\n                </div>')

# Fix device simulation to show meta fields at the top
sim_fix = """
                     {metaFields.map((f, i) => (
                       <div key={`msim-${i}`} className="space-y-1 p-2 bg-neutral-50/50 border border-neutral-100 rounded-sm">
                         <label className="block text-[9px] font-bold text-neutral-500 uppercase">
                           {f.pertanyaan || `Header ${i+1}`} {f.isRequired && <span className="text-red-400">*</span>}
                         </label>
                         <input type="text" disabled placeholder="..." className="w-full h-6 px-2 border border-neutral-100 bg-white text-[9px] outline-none" />
                       </div>
                     ))}
"""

# Insert before fields.map in simulation
text = text.replace('{fields.map((f, i) => (', sim_fix + '\n                     {fields.map((f, i) => (')

with open(file_path, "w") as f:
    f.write(text)

