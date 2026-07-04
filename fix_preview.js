const fs = require('fs');
const filePath = 'apps/web/src/components/laporan-builder-preview.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Replace rounded-* and shadow-* classes
code = code.replace(/rounded-\w+|rounded-\[\w+\]/g, '');
code = code.replace(/shadow-\w+|shadow-\[\w+\]/g, '');
code = code.replace(/bg-zinc-\w+\/\d+|bg-zinc-\w+/g, 'bg-[hsl(var(--muted))]');
code = code.replace(/text-zinc-\w+/g, 'text-[hsl(var(--muted-foreground))]');
code = code.replace(/border-zinc-\w+/g, 'border-[hsl(var(--border))]');

fs.writeFileSync(filePath, code);
