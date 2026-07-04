const fs = require('fs');

// 1. laporan-builder/page.tsx
let f1 = 'apps/web/src/app/(app)/laporan-builder/page.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace('deleteParamMutation.mutate(selectedItemId!)', 'deleteParamMutation.mutate(selectedItemId as number)');
c1 = c1.replace('deleteEntityMutation.mutate(selectedItemId!)', 'deleteEntityMutation.mutate(selectedItemId as number)');
c1 = c1.replace('const { data: categories = [], isLoading } = useQuery', 'const { data: categories = [] } = useQuery');
fs.writeFileSync(f1, c1, 'utf8');

// 2. laporan/[categoryCode]/page.tsx
let f2 = 'apps/web/src/app/(app)/laporan/[categoryCode]/page.tsx';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace('<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">', '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><title>Icon</title>');
fs.writeFileSync(f2, c2, 'utf8');

// 3. components/laporan-filter.tsx
let f3 = 'apps/web/src/components/laporan-filter.tsx';
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace('<svg', '<svg aria-label="Filter Icon"');
fs.writeFileSync(f3, c3, 'utf8');

console.log('Fixed biome errors');
