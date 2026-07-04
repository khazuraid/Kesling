const fs = require('fs');
const path = require('path');

const filePath = '/Users/fikri/aplikasi/apps-kes/apps/web/src/app/(app)/laporan/[categoryCode]/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Update openForm to check for baselineParams and dataDasarList
code = code.replace(
  /const openForm = useCallback\(\s*\(id: number\) => \{/,
  `const openForm = useCallback(
    (id: number) => {
      const baselineParams = category?.parameters.filter((p) => p.isBaseline) || [];
      if (baselineParams.length > 0) {
        // If there are baseline parameters, require data dasar to be filled first
        const hasDataDasar = dataDasarList.some((l) => l.puskesmasId === (id === 0 ? (session?.user as any)?.puskesmasId || puskesmasList[0]?.id : id));
        if (!hasDataDasar) {
          alert("Anda harus mengisi 'Atur Data Dasar' terlebih dahulu untuk instansi ini sebelum dapat menginput laporan bulanan.");
          return;
        }
      }`
);

fs.writeFileSync(filePath, code);
console.log("Patched openForm alert");
