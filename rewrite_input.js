const fs = require('fs');

['apps/web/src/components/ui/input.tsx', 'apps/web/src/components/ui/select.tsx'].forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let code = fs.readFileSync(filePath, 'utf8');
    code = code.replace(/rounded-\w+|rounded-\[\w+\]/g, '');
    code = code.replace(/shadow-\w+|shadow-\[\w+\]/g, '');
    fs.writeFileSync(filePath, code);
  }
});
