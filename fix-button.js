const fs = require('fs');
const filePath = '/Users/fikri/aplikasi/apps-kes/apps/web/src/app/(app)/laporan/[categoryCode]/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const regex = /<button\s+onClick=\{\(\) => openForm\(0\)\}\s+className="h-11 px-5 rounded-xl bg-zinc-950/s;
code = code.replace(regex, `<button
              onClick={() => openDataDasarForm(0)}
              className="h-11 px-5 rounded-xl bg-white border border-zinc-200 text-zinc-950 font-bold text-[13px] hover:bg-zinc-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Database className="w-4 h-4" /> Atur Data Dasar
            </button>
            <button
              onClick={() => openForm(0)}
              className="h-11 px-5 rounded-xl bg-zinc-950`);

fs.writeFileSync(filePath, code);
