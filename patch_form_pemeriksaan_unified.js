const fs = require('fs');
let code = fs.readFileSync('/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/form-pemeriksaan/page.tsx', 'utf-8');

// The user wants the META fields (header dinamis) to just look and act identically to regular fields, 
// OR they want the new fields to be integrated smoothly into the "Informasi Form" block without looking like a "different" or "new" feature compared to the fixed inputs (Nama, Deskripsi, Kategori).
// I will merge the UI block so it seamlessly sits inside the "Informasi Form" card.

code = code.replace(
  /<div className="mt-6 border-t border-neutral-100 pt-4">/g,
  '<div className="mt-4 pt-4 border-t border-neutral-100">'
);

code = code.replace(
  /<h4 className="text-\[10px\] font-bold uppercase tracking-wider text-neutral-400">Field Header Dinamis \(Tambahan\)<\/h4>/g,
  '<h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Informasi Tambahan (Input Operator)</h4>'
);

// Remove the distinction in the device preview so they flow naturally as normal fields (just placed before the regular ones)
code = code.replace(
  /<div key={`msim-\$\{i\}`} className="space-y-1 p-2 bg-neutral-50\/50 border border-neutral-100 rounded-sm">/g,
  '<div key={`msim-${i}`} className="space-y-1">'
);

code = code.replace(
  /\{f\.pertanyaan \|\| `Header \$\{i\+1\}`\}/g,
  '{f.pertanyaan || `Informasi Tambahan ${i+1}`}'
);

fs.writeFileSync('/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/form-pemeriksaan/page.tsx', code);
