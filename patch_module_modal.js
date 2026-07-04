const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'apps/web/src/app/(app)/laporan-builder/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the isCreatingModule from center canvas
const canvasRegex = /\{\/\* CENTER COLUMN: Canvas \*\/\}\n\s+<main className="flex-1 bg-slate-50\/50 overflow-y-auto relative p-8 md:p-12">\n\s+\{isCreatingModule \? \([\s\S]*?\) : selectedModule \? \(/;

content = content.replace(canvasRegex, `{/* CENTER COLUMN: Canvas */}
        <main className="flex-1 bg-slate-50/50 overflow-y-auto relative p-8 md:p-12">
          {selectedModule ? (`);

// 2. Add the Module Modal at the end of the file (before the last two closing tags)
const modalUI = `
      {isCreatingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Create New Module</h3>
              <button onClick={() => setIsCreatingModule(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Module Name</label>
                <Input id="new-mod-name-modal" placeholder="e.g. Inspeksi Air" className="h-10 text-sm" />
              </div>
              <div className="pt-4 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setIsCreatingModule(false)}>Cancel</Button>
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
                  const val = (document.getElementById("new-mod-name-modal") as HTMLInputElement).value;
                  if (!val) return;
                  createModuleMutation.mutate({
                    nama: val,
                    code: val.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                    isRowBased: true,
                  });
                }}>Create Module</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

content = content.replace(/    <\/div>\n  \);\n\}\n?$/, modalUI);

fs.writeFileSync(file, content, 'utf8');
console.log('Module Modal added successfully!');
