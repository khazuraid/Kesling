const fs = require('fs');
const filePath = '/Users/fikri/aplikasi/apps-kes/apps/web/src/app/(app)/laporan/[categoryCode]/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Remove the broken Data Dasar Modal block
const brokenStart = code.indexOf('{/* Data Dasar Modal */}');
const nextModalStart = code.indexOf('{/* 4. Sleek Form Builder Modal */}', brokenStart + 10);
if (brokenStart !== -1 && nextModalStart !== -1) {
  code = code.substring(0, brokenStart) + code.substring(nextModalStart);
}

// 2. Extract the full showForm block
const showFormStart = code.indexOf('{showForm && category && (');
// We need to find the matching ')}' that closes this.
let openParen = 0;
let showFormEnd = -1;
for (let i = showFormStart + '{showForm && category && '.length; i < code.length; i++) {
  if (code[i] === '(') openParen++;
  if (code[i] === ')') {
    openParen--;
    if (openParen === 0 && code.substring(i, i+2) === ')}') {
      showFormEnd = i + 2;
      break;
    }
  }
}

const showFormBlock = code.substring(showFormStart, showFormEnd);

let dataDasarBlock = showFormBlock
  .replace(/showForm/g, 'showDataDasarForm')
  .replace(/setShowForm/g, 'setShowDataDasarForm')
  .replace(/Input Data \{category\.nama\}/, 'Atur Data Dasar - {category.nama}')
  .replace(/onSubmit=\{\(e\) => handleSubmit\(e, false\)\}/, 'onSubmit={(e) => handleSubmit(e, true)}');

dataDasarBlock = dataDasarBlock.replace(/category\.parameters/g, 'category.parameters.filter(p => p.isBaseline)');

code = code.replace('{/* 4. Sleek Form Builder Modal */}', `{/* Data Dasar Modal */}
      ${dataDasarBlock}

      {/* 4. Sleek Form Builder Modal */}`);

fs.writeFileSync(filePath, code);
console.log("Fixed modal");
