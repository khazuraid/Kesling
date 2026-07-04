const fs = require('fs');
const filePath = '/Users/fikri/aplikasi/apps-kes/apps/web/src/app/(app)/laporan/[categoryCode]/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Remove prevLaporanList
const prevLaporanRegex = /  const prevBulan = bulan === 1 \? 12 : bulan - 1;\n  const prevTahun = bulan === 1 \? tahun - 1 : tahun;\n  const \{ data: prevLaporanList = \[\] \} = useQuery<DynamicLaporan\[\]>\(\{\n    queryKey: \["laporan", categoryCode, prevBulan, prevTahun\],\n    queryFn: async \(\) => \{\n      const res = await fetch\(`\/api\/laporan\/\$\{categoryCode\}\?bulan=\$\{prevBulan\}&tahun=\$\{prevTahun\}`\);\n      if \(!res\.ok\) return \[\];\n      return res\.json\(\);\n    \},\n    enabled: !!categoryCode,\n  \}\);\n/g;
code = code.replace(prevLaporanRegex, '');

// Import Database icon
code = code.replace(
  'import { Activity, Layers, Plus, Search } from "lucide-react";',
  'import { Activity, Database, Layers, Plus, Search } from "lucide-react";'
);
if (!code.includes('Database,')) {
  code = code.replace(
    'import { Activity, Layers,',
    'import { Activity, Database, Layers,'
  );
}


// Add Button
const buttonHtml = `            <button
              onClick={() => openDataDasarForm(0)}
              className="h-11 px-5 rounded-xl bg-white border border-zinc-200 text-zinc-950 font-bold text-[13px] hover:bg-zinc-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Database className="w-4 h-4" /> Atur Data Dasar
            </button>
            <button
              onClick={() => openForm(0)}`;
code = code.replace('            <button\n              onClick={() => openForm(0)}', buttonHtml);

fs.writeFileSync(filePath, code);
console.log("Final fix applied");
