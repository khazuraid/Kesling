const fs = require('fs');
const path = require('path');

const filePath = '/Users/fikri/aplikasi/apps-kes/apps/web/src/app/(app)/laporan/[categoryCode]/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// The code is currently broken. I'll restore it manually.
const openFormRegex = /const openForm = useCallback\(.*?const openDataDasarForm = useCallback/s;
const newOpenForm = `const openForm = useCallback(
    (pkmId?: number) => {
      const id = pkmId || (session?.user as any)?.puskesmasId || puskesmasList[0]?.id || 0;
      
      const baselineParams = category?.parameters.filter((p) => p.isBaseline) || [];
      if (baselineParams.length > 0) {
        const hasDataDasar = dataDasarList.some((l) => l.puskesmasId === id);
        if (!hasDataDasar) {
          alert("Anda harus mengisi 'Atur Data Dasar' terlebih dahulu untuk instansi ini sebelum dapat menginput laporan bulanan.");
          return;
        }
      }

      setFormPuskesmasId(id);

      const existing = laporanList.find((l) => l.puskesmasId === id);
      if (existing) {
        setFormValues(buildValueMap(existing.values));
      } else {
        if (baselineParams.length > 0 && dataDasarList.length > 0) {
          const baselineData = dataDasarList.find((l) => l.puskesmasId === id);
          if (baselineData) {
            const prefilled = {};
            for (const v of baselineData.values) {
              if (baselineParams.some((bp) => bp.id === v.parameterId)) {
                prefilled[buildKey(v.parameterId, v.subCategoryId)] = v.value;
              }
            }
            setFormValues(prefilled);
          } else {
            setFormValues({});
          }
        } else {
          setFormValues({});
        }
      }
      setShowForm(true);
    },
    [laporanList, dataDasarList, puskesmasList, session, category],
  );

  const openDataDasarForm = useCallback`;

code = code.replace(openFormRegex, newOpenForm);

fs.writeFileSync(filePath, code);
console.log("Patched fixed");
