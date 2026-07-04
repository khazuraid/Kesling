const fs = require('fs');

const filePath = 'apps/web/src/components/ui/dialog.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Replace rounded-* and shadow-* classes
code = code.replace(/rounded-\w+|rounded-\[\w+\]/g, '');
code = code.replace(/shadow-\w+|shadow-\[\w+\]/g, '');

fs.writeFileSync(filePath, code);
