const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'apps/web/src/app/(app)/laporan-builder/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add new state for modals
const stateAnchor = 'const [entityForm, setEntityForm] = useState<any>({});';
const statesToAdd = `
  const [showAddParamModal, setShowAddParamModal] = useState(false);
  const [newParamForm, setNewParamForm] = useState({ nama: "", type: "NUMBER" });

  const [showAddEntityModal, setShowAddEntityModal] = useState(false);
  const [newEntityForm, setNewEntityForm] = useState({ nama: "", grup: "" });
`;
content = content.replace(stateAnchor, stateAnchor + '\n' + statesToAdd);

// 2. Change the button clicks to open modal
content = content.replace(
  /onClick=\{\(\) => \{\n\s+const num = selectedModule\.parameters\.length \+ 1;\n\s+addParamMutation\.mutate\(\{\n\s+categoryId: selectedModule\.id,\n\s+nama: `Field \$\{num\}`,\n\s+code: `field_\$\{num\}`,\n\s+type: "NUMBER",\n\s+\}\);\n\s+\}\}/,
  `onClick={() => setShowAddParamModal(true)}`
);

content = content.replace(
  /onClick=\{\(\) => \{\n\s+addEntityMutation\.mutate\(\{\n\s+categoryId: selectedModule\.id,\n\s+nama: "New Row Entity",\n\s+\}\);\n\s+\}\}/,
  `onClick={() => setShowAddEntityModal(true)}`
);

// 3. Add modal UI at the end
const modalUI = `
      {showAddParamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Add New Field</h3>
              <button onClick={() => setShowAddParamModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Field Name</label>
                <Input value={newParamForm.nama} onChange={(e) => setNewParamForm({...newParamForm, nama: e.target.value})} placeholder="e.g. Jumlah Jendela" className="h-10 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Field Type</label>
                <select value={newParamForm.type} onChange={(e) => setNewParamForm({...newParamForm, type: e.target.value})} className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
                  <option value="NUMBER">Integer Number</option>
                  <option value="DECIMAL">Decimal Value</option>
                  <option value="TEXT">Free Text</option>
                  <option value="SELECT">Single Select (Dropdown)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddParamModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
                  if(!newParamForm.nama) return;
                  addParamMutation.mutate({
                    categoryId: selectedModule!.id,
                    nama: newParamForm.nama,
                    code: newParamForm.nama.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                    type: newParamForm.type
                  });
                  setShowAddParamModal(false);
                  setNewParamForm({ nama: "", type: "NUMBER" });
                }}>Add Field</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddEntityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Add New Row Entity</h3>
              <button onClick={() => setShowAddEntityModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Entity Name</label>
                <Input value={newEntityForm.nama} onChange={(e) => setNewEntityForm({...newEntityForm, nama: e.target.value})} placeholder="e.g. Ruang Kelas 1" className="h-10 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Group Classification</label>
                <select value={newEntityForm.grup} onChange={(e) => setNewEntityForm({...newEntityForm, grup: e.target.value})} className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
                  <option value="">No Group</option>
                  <option value="PRIORITAS">Prioritas</option>
                  <option value="NON_PRIORITAS">Non-Prioritas</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddEntityModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
                  if(!newEntityForm.nama) return;
                  addEntityMutation.mutate({
                    categoryId: selectedModule!.id,
                    nama: newEntityForm.nama,
                    grup: newEntityForm.grup || undefined
                  });
                  setShowAddEntityModal(false);
                  setNewEntityForm({ nama: "", grup: "" });
                }}>Add Entity</Button>
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
console.log('Modals added successfully!');
