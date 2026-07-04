const fs = require('fs');
let code = fs.readFileSync('/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/laporan-builder/page.tsx', 'utf-8');

code = code.replace(
  /useEffect\(\(\) => \{\n    if \(selectedModule\) \{\n      setModForm\(\{/g,
  'useEffect(() => {\n    if (selectedModule && selectedModuleId !== null) {\n      setModForm({'
);

code = code.replace(
  /\}, \[selectedModuleId, categories\]\);/g,
  '}, [selectedModuleId]); // <-- Fix Stale State Bounce! Hapus categories dari dependency array agar tidak reset saat mutate'
);

fs.writeFileSync('/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/laporan-builder/page.tsx', code);
