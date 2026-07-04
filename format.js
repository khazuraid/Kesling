const fs = require('fs');

const filePath = '/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/laporan-builder/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Strategy: Insert newlines at key boundaries to make it readable
// 1. After each import statement
content = content.replace(/import \{/g, '\nimport {');
// 2. Before export default function
content = content.replace(/export default function/g, '\n\nexport default function');
// 3. After each semicolon that ends a statement (not inside strings/JSX)
// This is tricky. Better: split on known patterns.

// Let's be more surgical - split on ; followed by space and a letter/const
content = content.replace(/; /g, ';\n  ');

// Split on }) — common in mutations and callbacks 
content = content.replace(/\}\)\s*\}/g, '\n  })\n}');

// Split on ,  onSuccess
content = content.replace(/, onSuccess:/g, ',\n    onSuccess:');
content = content.replace(/, onError:/g, ',\n    onError:');

// Split on mutationFn
content = content.replace(/, mutationFn:/g, ',\n    mutationFn:');

// From the output I saw, the file already has proper structure in terms of content,
// just no newlines. Let me write it out and inspect.

fs.writeFileSync('/tmp/laporan-builder-raw.txt', content);
console.log("Wrote to /tmp/laporan-builder-raw.txt");
console.log("Total lines:", content.split('\n').length);
