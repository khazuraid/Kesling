const fs = require('fs');

const filePath = '/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/laporan-builder/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

if (content.endsWith(');}')) {
  // Wait, standard return is `return (...); }`
  console.log("Original end:", content.slice(-50));
  // Let's add a brace if missing, or fix it
  // Biome says "expected `}` but instead the file ends"
  // So it means it is missing a closing brace.
  
  content += '\n}';
  fs.writeFileSync(filePath, content);
  console.log("Appended a closing brace");
}
