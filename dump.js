const fs = require('fs');

const filePath = '/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/laporan-builder/page.tsx';
const content = fs.readFileSync(filePath, 'utf8');

// Write chunks of 3000 chars each
const chunkSize = 3000;
for (let i = 0; i < content.length; i += chunkSize) {
  const chunk = content.slice(i, i + chunkSize);
  fs.writeFileSync(`/tmp/chunk_${Math.floor(i/chunkSize)}.txt`, chunk);
}
console.log("Total chunks:", Math.ceil(content.length / chunkSize));
console.log("Total length:", content.length);
