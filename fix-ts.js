const fs = require('fs');
const filePath = '/Users/fikri/aplikasi/apps-kes/apps/web/src/app/(app)/laporan/[categoryCode]/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Fix onSuccess variables
code = code.replace(
  /onSuccess: \(_, data\) => \{\n      toast\.success\("Data berhasil disimpan"\);\n      queryClient\.invalidateQueries\(\{ queryKey: \["laporan", categoryCode\] \}\);\n      if \(data\.isDataDasar\)/s,
  'onSuccess: (_, variables) => {\n      toast.success("Data berhasil disimpan");\n      queryClient.invalidateQueries({ queryKey: ["laporan", categoryCode] });\n      if (variables.isDataDasar)'
);

// 2. Fix prefilled type
code = code.replace(
  'const prefilled = {};',
  'const prefilled: ValueMap = {};'
);

// 3. Fix mutationFn type
code = code.replace(
  /mutationFn: async \(body: \{\n\s*puskesmasId: number;\n\s*values: \{ parameterId: number; subCategoryId: number \| null; value: string \}\[\];\n\s*\}\) => \{/s,
  `mutationFn: async (body: {
      puskesmasId: number;
      values: { parameterId: number; subCategoryId: number | null; value: string }[];
      isDataDasar?: boolean;
    }) => {`
);

fs.writeFileSync(filePath, code);
console.log("TS fixed");
