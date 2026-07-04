const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'apps/web/src/app/(app)/laporan-builder/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Chunk 1: Imports
content = content.replace(
  '  Calculator,\n  ChevronRight,',
  '  ArrowUp,\n  ArrowDown,\n  Eye,\n  List,\n  Calculator,\n  ChevronRight,'
);

// Chunk 2: State variables
content = content.replace(
  'const [editParamId, setEditParamId] = useState<number | null>(null);',
  `const [editParamId, setEditParamId] = useState<number | null>(null);
  const [paramMin, setParamMin] = useState<number | "">("");
  const [paramMax, setParamMax] = useState<number | "">("");
  const [paramOptions, setParamOptions] = useState("");`
);

// Chunk 3: Reorder Mutation & Move logic
content = content.replace(
  '  return (',
  `  const reorderMutation = useMutation({
    mutationFn: async (payload: { table: string; items: any[] }) => {
      const res = await fetch("/api/master/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Gagal merubah urutan");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master-categories"] }),
  });

  const moveParam = (index: number, direction: -1 | 1) => {
    if (!selectedCategory) return;
    const params = [...selectedCategory.parameters].sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
    if (index + direction < 0 || index + direction >= params.length) return;
    const temp = params[index];
    params[index] = params[index + direction];
    params[index + direction] = temp;
    reorderMutation.mutate({
      table: "dynamicParameter",
      items: params.map((p: any, i: number) => ({ id: p.id, urutan: i })),
    });
  };

  const moveSub = (index: number, direction: -1 | 1) => {
    if (!selectedCategory) return;
    const subs = [...selectedCategory.subCategories].sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
    if (index + direction < 0 || index + direction >= subs.length) return;
    const temp = subs[index];
    subs[index] = subs[index + direction];
    subs[index + direction] = temp;
    reorderMutation.mutate({
      table: "dynamicSubCategory",
      items: subs.map((s: any, i: number) => ({ id: s.id, urutan: i })),
    });
  };

  return (`
);

// Chunk 4: Add Parameter logic
content = content.replace(
  'setParamBaseline(false);',
  `setParamBaseline(false);
                          setParamMin("");
                          setParamMax("");
                          setParamOptions("");`
);

// Chunk 5: Edit Parameter Logic
content = content.replace(
  'setParamBaseline(p.isBaseline);',
  `setParamBaseline(p.isBaseline);
                                    setParamMin(p.config?.min ?? "");
                                    setParamMax(p.config?.max ?? "");
                                    setParamOptions(p.config?.options ?? "");`
);

// Chunk 6: Add SELECT option
content = content.replace(
  '<option value="TEXT">Free Text</option>',
  '<option value="TEXT">Free Text</option>\n                            <option value="SELECT">Pilihan Ganda (Dropdown)</option>'
);

// Chunk 7: SELECT icon
content = content.replace(
  '<Type className="w-4 h-4" />',
  `p.type === "SELECT" ? (
                                  <List className="w-4 h-4" />
                                ) : (
                                  <Type className="w-4 h-4" />
                                )`
);

// Chunk 8: Min/Max/Options UI
const targetMinMax = '</div>\n                      </div>\n                      <div className="flex gap-3 pt-8 mt-6 border-t border-black/5">';
content = content.replace(
  targetMinMax,
  `</div>
                      </div>

                      {/* Extra configurations based on Type */}
                      {(paramType === "NUMBER" || paramType === "DECIMAL") && (
                        <div className="grid md:grid-cols-2 gap-6 mt-6 p-4 rounded-xl border border-black/5 bg-[#FCFCFD]">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase">Min Value (Opsional)</label>
                            <Input type="number" value={paramMin} onChange={(e) => setParamMin(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 0" className="bg-white border-black/5 shadow-none" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase">Max Value (Opsional)</label>
                            <Input type="number" value={paramMax} onChange={(e) => setParamMax(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 100" className="bg-white border-black/5 shadow-none" />
                          </div>
                        </div>
                      )}
                      {paramType === "SELECT" && (
                        <div className="mt-6 p-4 rounded-xl border border-black/5 bg-[#FCFCFD] space-y-2">
                          <label className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase">Pilihan (Pisahkan dengan koma)</label>
                          <Input value={paramOptions} onChange={(e) => setParamOptions(e.target.value)} placeholder="e.g. Ya, Tidak, Tidak Tahu" className="bg-white border-black/5 shadow-none" />
                        </div>
                      )}

                      <div className="flex gap-3 pt-8 mt-6 border-t border-black/5">`
);

// Chunk 9: Save config in mutation
content = content.replace(
  'isBaseline: paramBaseline,',
  `isBaseline: paramBaseline,
                              config: (() => {
                                const c: any = {};
                                if (paramType === "NUMBER" || paramType === "DECIMAL") {
                                  if (paramMin !== "") c.min = paramMin;
                                  if (paramMax !== "") c.max = paramMax;
                                }
                                if (paramType === "SELECT" && paramOptions) c.options = paramOptions;
                                return Object.keys(c).length > 0 ? c : undefined;
                              })(),`
);

// Chunk 10: Sort mapping for params
content = content.replace(
  '{selectedCategory.parameters.map((p: any) => (',
  '{selectedCategory.parameters.sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0)).map((p: any, i: number) => ('
);

// Chunk 11: Add Move arrows for param
content = content.replace(
  '<button\n                                  onClick={() => {',
  `<button onClick={() => moveParam(i, -1)} disabled={i === 0 || reorderMutation.isPending} className="p-2 text-neutral-400 hover:text-black rounded-lg hover:bg-black/5 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                                <button onClick={() => moveParam(i, 1)} disabled={i === selectedCategory.parameters.length - 1 || reorderMutation.isPending} className="p-2 text-neutral-400 hover:text-black rounded-lg hover:bg-black/5 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                                <button
                                  onClick={() => {`
);

// Chunk 12: Sort mapping for subs
content = content.replace(
  '{selectedCategory.subCategories.map((sub: any) => (',
  '{selectedCategory.subCategories.sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0)).map((sub: any, i: number) => ('
);

// Chunk 13: Add Move arrows for sub
content = content.replace(
  '<button\n                                        onClick={() => {',
  `<button onClick={() => moveSub(i, -1)} disabled={i === 0 || reorderMutation.isPending} className="p-2 text-neutral-400 hover:text-black rounded-lg hover:bg-black/5 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                                      <button onClick={() => moveSub(i, 1)} disabled={i === selectedCategory.subCategories.length - 1 || reorderMutation.isPending} className="p-2 text-neutral-400 hover:text-black rounded-lg hover:bg-black/5 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                                      <button
                                        onClick={() => {`
);


fs.writeFileSync(targetFile, content, 'utf8');
console.log('Patch complete.');
