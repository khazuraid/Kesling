const fs = require('fs');
const path = require('path');

const filePath = '/Users/fikri/aplikasi/apps-kes/apps/web/src/app/(app)/laporan/[categoryCode]/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Fix onSuccess
code = code.replace(
  /onSuccess: \(\) => \{\n      toast\.success\("Data berhasil disimpan"\);\n      queryClient\.invalidateQueries\(\{ queryKey: \["laporan", categoryCode\] \}\);\n      if \(data\.isDataDasar\)/s,
  'onSuccess: (_, data) => {\n      toast.success("Data berhasil disimpan");\n      queryClient.invalidateQueries({ queryKey: ["laporan", categoryCode] });\n      if (data.isDataDasar)'
);
// Remove trailing setShowForm
code = code.replace(
  /if \(data\.isDataDasar\) setShowDataDasarForm\(false\); else setShowForm\(false\);\n      setShowForm\(false\);/,
  'if (data.isDataDasar) setShowDataDasarForm(false); else setShowForm(false);'
);

// Remove the rogue trailing block from 250 to 261
const rogueBlock = `          }
        } else {
          setFormValues({});
        }
        } else {
          setFormValues({});
        }
      }
      setShowForm(true);
    },
    [laporanList, prevLaporanList, puskesmasList, session, category],
  );`;
code = code.replace(rogueBlock, '');

// The JSX syntax errors:
// src/app/(app)/laporan/[categoryCode]/page.tsx(578,10): error TS17008: JSX element 'div' has no corresponding closing tag.
// src/app/(app)/laporan/[categoryCode]/page.tsx(740,1): error TS1005: '</' expected.

// Because my dataDasarModalHtml replacement was bad. Let's find it.
// I replaced:
// dataDasarModalHtml = dataDasarModalHtml.replace(/category\.parameters/g, 'category.parameters.filter(p => p.isBaseline)');
// But wait, there was probably a problem with how it was inserted.
