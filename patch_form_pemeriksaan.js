const fs = require('fs');
let code = fs.readFileSync('/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/form-pemeriksaan/page.tsx', 'utf-8');

// We will modify the state to distinctively handle META fields and NORMAL fields
// META fields will be identified by a specific invisible group tag like '__META__'

// Replace save mutation builder logic
code = code.replace(
  /fields: fields\.map\(\(f, i\) => \(\{\n\s+\.\.\.f,\n\s+urutan: i,/g,
  'fields: [...metaFields.map((f, i) => ({ ...f, urutan: i, grup: "__META__" })), ...fields.map((f, i) => ({ ...f, urutan: metaFields.length + i, grup: f.grup || "" }))].map((f, i) => ({ ...f,'
);

// Add state for meta fields
code = code.replace(
  /const \[fields, setFields\] = useState<any\[\]>\(\[\]\);/g,
  'const [fields, setFields] = useState<any[]>([]);\n  const [metaFields, setMetaFields] = useState<any[]>([]);'
);

// Populate state safely
code = code.replace(
  /setFields\(activeTemplate\.fields \|\| \[\]\);/g,
  'setFields((activeTemplate.fields || []).filter((f: any) => f.grup !== "__META__"));\n      setMetaFields((activeTemplate.fields || []).filter((f: any) => f.grup === "__META__"));'
);

// Fix initial state clearing
code = code.replace(
  /setFields\(\[\{ pertanyaan: "", tipe: "BOOLEAN", isRequired: true, grup: "", options: "" \}\]\);/g,
  'setFields([{ pertanyaan: "", tipe: "BOOLEAN", isRequired: true, grup: "", options: "" }]); setMetaFields([]);'
);

fs.writeFileSync('/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/form-pemeriksaan/page.tsx', code);
