const fs = require('fs');
const path = require('path');

const filePath = 'apps/web/src/app/(app)/laporan-builder/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Replace rounded-* and shadow-* classes across the entire file
code = code.replace(/rounded-\w+|rounded-\[\w+\]/g, '');
code = code.replace(/shadow-\w+|shadow-\[\w+\]/g, '');
code = code.replace(/backdrop-blur-\w+/g, '');

// Save changes
fs.writeFileSync(filePath, code);
console.log('Flat design fixes applied to laporan-builder');
