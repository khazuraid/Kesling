const fs = require('fs');
const filePath = '/Users/fikri/aplikasi/apps-kes/apps/web/src/app/(app)/laporan/[categoryCode]/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// I will look for openDataDasarForm and then find where the syntax error is.
const startIdx = code.indexOf('const openDataDasarForm = useCallback');
if (startIdx !== -1) {
  // Let's find the closing brace of openDataDasarForm
  // ...
  // Wait, let's just use regex to remove the EXACT rogue block.
  const regex = /          \}\n        \} else \{\n          setFormValues\(\{\}\);\n        \}\n        \} else \{\n          setFormValues\(\{\}\);\n        \}\n      \}\n      setShowForm\(true\);\n    \},\n    \[laporanList, prevLaporanList, puskesmasList, session, category\],\n  \);/g;
  code = code.replace(regex, '');
  fs.writeFileSync(filePath, code);
  console.log("Rogue block removed.");
}
