const fs = require('fs');
const path = require('path');

const filePath = '/Users/fikri/aplikasi/apps-kes/apps/web/src/app/(app)/laporan/[categoryCode]/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add dataDasarList query
const queryLaporanMatch = code.match(/const { data: laporanList = \[\], isLoading } = useQuery.*?\}\);/s);
if (!queryLaporanMatch) throw new Error("Could not find laporanList query");

const dataDasarQuery = `
  const { data: dataDasarList = [] } = useQuery<DynamicLaporan[]>({
    queryKey: ["laporan", categoryCode, 0, tahun],
    queryFn: async () => {
      const res = await fetch(\`/api/laporan/\${categoryCode}?bulan=0&tahun=\${tahun}\`);
      if (!res.ok) throw new Error("Gagal memuat data dasar");
      return res.json();
    },
    enabled: !!categoryCode,
    refetchInterval: 5000,
  });
`;
code = code.replace(queryLaporanMatch[0], queryLaporanMatch[0] + "\n" + dataDasarQuery);

// 2. Add showDataDasarForm state
code = code.replace(
  'const [showForm, setShowForm] = useState(false);',
  'const [showForm, setShowForm] = useState(false);\n  const [showDataDasarForm, setShowDataDasarForm] = useState(false);'
);

// 3. Update openForm to use dataDasarList instead of prevLaporanList
code = code.replace(
  /if \(baselineParams.length > 0 && prevLaporanList.length > 0\) \{.*?\} else \{.*?setFormValues\(\{\}\);.*?\}/s,
  `if (baselineParams.length > 0 && dataDasarList.length > 0) {
          const baselineData = dataDasarList.find((l) => l.puskesmasId === id);
          if (baselineData) {
            const prefilled: ValueMap = {};
            for (const v of baselineData.values) {
              if (baselineParams.some((bp) => bp.id === v.parameterId)) {
                prefilled[buildKey(v.parameterId, v.subCategoryId)] = v.value;
              }
            }
            setFormValues(prefilled);
          } else {
            setFormValues({});
          }
        } else {
          setFormValues({});
        }`
);

// 4. Update submitMutation to handle isDataDasar
code = code.replace(
  'body: JSON.stringify({ ...data, bulan, tahun }),',
  'body: JSON.stringify({ ...data, bulan: data.isDataDasar ? 0 : bulan, tahun }),'
);
code = code.replace(
  'mutationFn: async (data: { puskesmasId: number; values: any[] }) => {',
  'mutationFn: async (data: { puskesmasId: number; values: any[]; isDataDasar?: boolean }) => {'
);
code = code.replace(
  'queryClient.invalidateQueries({ queryKey: ["laporan", categoryCode] });',
  'queryClient.invalidateQueries({ queryKey: ["laporan", categoryCode] });\n      if (data.isDataDasar) setShowDataDasarForm(false); else setShowForm(false);'
);
code = code.replace(
  'onSuccess: () => {\n      setShowForm(false);',
  'onSuccess: (_, data) => {'
);

// 5. Add openDataDasarForm function
const openFormMatch = code.match(/const openForm = useCallback.*?\}\);/s);
const openDataDasarForm = `
  const openDataDasarForm = useCallback(
    (id: number) => {
      setFormPuskesmasId(id);
      const existing = dataDasarList.find((l) => l.puskesmasId === id);
      if (existing) {
        setFormValues(buildValueMap(existing.values));
      } else {
        setFormValues({});
      }
      setShowDataDasarForm(true);
    },
    [dataDasarList]
  );
`;
code = code.replace(openFormMatch[0], openFormMatch[0] + "\n" + openDataDasarForm);

// 6. Modify handleSubmit to accept isDataDasar
code = code.replace(
  'function handleSubmit(e: React.FormEvent) {',
  'function handleSubmit(e: React.FormEvent, isDataDasar = false) {'
);
code = code.replace(
  'submitMutation.mutate({ puskesmasId: formPuskesmasId, values });',
  'submitMutation.mutate({ puskesmasId: formPuskesmasId, values, isDataDasar });'
);
code = code.replace(
  'onSubmit={handleSubmit}',
  'onSubmit={(e) => handleSubmit(e, false)}'
);

// 7. Render "Atur Data Dasar" button next to "Input Laporan Baru"
code = code.replace(
  '<button\n              onClick={() => openForm(0)}\n              className="h-11 px-5 rounded-xl bg-zinc-950 text-white font-bold text-[13px] hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-sm"',
  `<button
              onClick={() => openDataDasarForm(0)}
              className="h-11 px-5 rounded-xl bg-white text-zinc-950 font-bold text-[13px] border border-zinc-200 hover:bg-zinc-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Database className="w-4 h-4" /> Atur Data Dasar
            </button>
            <button
              onClick={() => openForm(0)}
              className="h-11 px-5 rounded-xl bg-zinc-950 text-white font-bold text-[13px] hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-sm"`
);

// 8. Render showDataDasarForm modal (duplicate showForm but filter parameters)
const showFormMatch = code.match(/\{\/\* 4\. Sleek Form Builder Modal \*\/\}.*?showForm && category && \((.*?)\)\}/s);
if (!showFormMatch) throw new Error("Could not find showForm");
let dataDasarModalHtml = showFormMatch[1]
  .replace(/showForm/g, 'showDataDasarForm')
  .replace(/setShowForm/g, 'setShowDataDasarForm')
  .replace(/Input Data \{category\.nama\}/, 'Atur Data Dasar - {category.nama}')
  .replace(/onSubmit=\{\(e\) => handleSubmit\(e, false\)\}/, 'onSubmit={(e) => handleSubmit(e, true)}');

// in dataDasarModalHtml, we need to filter parameters to ONLY those that are isBaseline.
// we can do this by replacing `category.parameters` with `category.parameters.filter(p => p.isBaseline)`
dataDasarModalHtml = dataDasarModalHtml.replace(/category\.parameters/g, 'category.parameters.filter(p => p.isBaseline)');

// in the main form, disable inputs if p.isBaseline is true
code = code.replace(
  'onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}\n                                    className="w-full h-11 bg-zinc-50 border border-zinc-200/60 rounded-xl px-3 text-center text-[13px] font-semibold text-zinc-950 focus:border-zinc-950 focus:bg-white outline-none transition-all shadow-inner"',
  `onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                                    readOnly={p.isBaseline}
                                    className={\`w-full h-11 bg-zinc-50 border border-zinc-200/60 rounded-xl px-3 text-center text-[13px] font-semibold text-zinc-950 focus:border-zinc-950 focus:bg-white outline-none transition-all shadow-inner \${p.isBaseline ? "opacity-50 cursor-not-allowed" : ""}\`}`
);
code = code.replace(
  'onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}\n                            className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-[13px] font-semibold text-zinc-950 focus:ring-2 focus:ring-zinc-950/20 focus:border-transparent outline-none transition-all shadow-sm"',
  `onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                            readOnly={p.isBaseline}
                            className={\`w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-[13px] font-semibold text-zinc-950 focus:ring-2 focus:ring-zinc-950/20 focus:border-transparent outline-none transition-all shadow-sm \${p.isBaseline ? "opacity-50 cursor-not-allowed bg-zinc-100" : ""}\`}`
);


code = code.replace('{/* 4. Sleek Form Builder Modal */}', `{/* Data Dasar Modal */}
      {showDataDasarForm && category && (
        ${dataDasarModalHtml}
      )}

      {/* 4. Sleek Form Builder Modal */}`);

// We need to import Database icon if not there.
if (!code.includes('Database')) {
  code = code.replace('import { Download, FileSpreadsheet, Plus, Search } from "lucide-react";', 'import { Database, Download, FileSpreadsheet, Plus, Search } from "lucide-react";');
}

fs.writeFileSync(filePath, code);
console.log("Patched successfully");
