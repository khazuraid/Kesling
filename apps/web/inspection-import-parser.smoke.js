"use strict";

const assert = require("node:assert/strict");
const { normalizeInspectionTemplate } = require("./inspection-import-parser");

const markdown = `
# FORMULIR INSPEKSI
| No | Gol | Variabel | 1 | 2 |
|---|---|---|---|---|
| Inspeksi Area Dalam | Inspeksi Area Dalam | Inspeksi Area Dalam | | |
| Fasilitas Higiene Sanitasi Personil | Fasilitas Higiene Sanitasi Personil | Fasilitas Higiene Sanitasi Personil | | |
| 1 | a. | Tersedia tempat cuci tangan | 2 | NA |
| 2 | b. | Tersedia sabun | 1 | NA |
`;

const result = normalizeInspectionTemplate(markdown, "contoh.pdf");
assert.equal(result.fields.length, 2);
assert.deepEqual([...new Set(result.fields.map((field) => field.grup))], [
  "Inspeksi Area Dalam — Fasilitas Higiene Sanitasi Personil",
]);
assert.equal(result.fields[0].pertanyaan, "Tersedia tempat cuci tangan");
console.log("inspection import parser smoke: OK");
