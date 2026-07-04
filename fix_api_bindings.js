const fs = require('fs');
const path = 'apps/web/src/app/(app)/laporan-builder/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// The original API endpoints are:
// Modules (categories): /api/master/dynamic-categories
// Parameters: /api/master/dynamic-parameters
// SubCategories (Entities): /api/master/sub-categories

// Fix the queries
code = code.replace(
  /const \{ data: categories = \[\] \} = useQuery<any\[\]>\(\{[\s\S]*?queryKey: \["master-categories"\],[\s\S]*?\}\);[\s\S]*?const \{ data: modules = \[\] \} = useQuery<any\[\]>\(\{[\s\S]*?queryKey: \["builder-modules"\],[\s\S]*?\}\);/m,
  'const { data: modules = [] } = useQuery<any[]>({ queryKey: ["master-categories"], queryFn: async () => { const res = await fetch("/api/master/dynamic-categories"); if (!res.ok) throw new Error("Failed"); return res.json(); } });'
);

// Fix the creation endpoint for module
code = code.replace(
  /fetch\("\/api\/builder\/modules", \{/g,
  'fetch("/api/master/dynamic-categories", {'
);

// Fix the update/delete endpoints for module
code = code.replace(
  /fetch\(\`\/api\/builder\/modules\/\$\{id\}\`/g,
  'fetch(`/api/master/dynamic-categories/${id}`'
);

// Fix the parameters endpoints
code = code.replace(
  /fetch\("\/api\/builder\/parameters"/g,
  'fetch("/api/master/dynamic-parameters"'
);
code = code.replace(
  /fetch\(\`\/api\/builder\/parameters\/\$\{id\}\`/g,
  'fetch(`/api/master/dynamic-parameters/${id}`'
);

// Fix the subcategories endpoints
code = code.replace(
  /fetch\("\/api\/builder\/subcategories"/g,
  'fetch("/api/master/sub-categories"'
);
code = code.replace(
  /fetch\(\`\/api\/builder\/subcategories\/\$\{id\}\`/g,
  'fetch(`/api/master/sub-categories/${id}`'
);

// Fix query invalidation
code = code.replace(/queryKey: \["builder-modules"\]/g, 'queryKey: ["master-categories"]');

// Remove categoryId UI since it was artificially added
code = code.replace(
  /categoryId: parseInt\(moduleForm\.categoryId\),/g,
  ''
);

fs.writeFileSync(path, code);
