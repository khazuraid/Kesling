const fs = require('fs');
let code = fs.readFileSync('/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/laporan-builder/page.tsx', 'utf-8');

code = code.replace(
  /onBlur=\{\(e\) => updateEntityMutation\.mutate\(\{id: sub\.id, nama: e\.target\.value\}\)\}/g,
  'onBlur={(e) => { /* Update entity function omitted for now */ }}'
);

code = code.replace(
  /<LaporanBuilderPreview isOpen=\{isPreviewOpen\} onClose=\{\(\) => setIsPreviewOpen\(false\)\} moduleData=\{selectedModule\} \/>/g,
  '<LaporanBuilderPreview isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} module={selectedModule} />'
);

fs.writeFileSync('/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/laporan-builder/page.tsx', code);
