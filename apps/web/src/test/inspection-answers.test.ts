import { describe, expect, it } from "vitest";
import { answerState, groupInspectionFields } from "@/lib/inspection-answers";

const template = {
  fields: [
    { id: 1, grup: "__META__", tipe: "TEXT", pertanyaan: "Nama Sarana" },
    { id: 2, grup: "Bagian A", tipe: "BOOLEAN", pertanyaan: "Lantai bersih?" },
    { id: 3, grup: "Bagian A", tipe: "BOOLEAN", pertanyaan: "Dinding kedap air?" },
    { id: 4, grup: "Bagian B", tipe: "SIGNATURE", pertanyaan: "Tanda Tangan" },
    { id: 5, grup: "Bagian B", tipe: "PHOTO", pertanyaan: "Foto depan" },
    { id: 6, grup: "Bagian B", tipe: "BOOLEAN", pertanyaan: "Tempat sampah tertutup?" },
  ],
};

describe("answerState", () => {
  it("menerjemahkan jawaban boolean menjadi empat keadaan", () => {
    expect(answerState("TRUE")).toBe("sesuai");
    expect(answerState("FALSE")).toBe("tidak");
    expect(answerState("NA")).toBe("na");
    expect(answerState("true")).toBe("sesuai");
    expect(answerState(null)).toBe("kosong");
    expect(answerState("")).toBe("kosong");
    expect(answerState(undefined)).toBe("kosong");
  });
});

describe("groupInspectionFields", () => {
  const result = {
    values: [
      { fieldId: 1, valueString: "Warteg Barokah" },
      { fieldId: 2, valueString: "TRUE" },
      { fieldId: 3, valueString: "FALSE" },
      { fieldId: 6, valueString: "NA" },
    ],
  };

  it("membuang field __META__ dan tanda tangan dari daftar butir", () => {
    const { fields } = groupInspectionFields(template, result);
    const ids = fields.map((f) => f.id);
    expect(ids).not.toContain(1);
    expect(ids).not.toContain(4);
  });

  it("membuang field PHOTO dari daftar butir — fotonya tampil di tab Foto", () => {
    const { fields } = groupInspectionFields(template, result);
    expect(fields.map((f) => f.id)).not.toContain(5);
  });

  it("mengelompokkan butir menurut grupnya, sesuai urutan template", () => {
    const { groups } = groupInspectionFields(template, result);
    expect(groups.map((g) => g.grup)).toEqual(["Bagian A", "Bagian B"]);
    expect(groups[0].items.map((f) => f.id)).toEqual([2, 3]);
  });

  it("menghitung rekap hanya dari butir yang dapat dinilai", () => {
    const { tally } = groupInspectionFields(template, result);
    expect(tally).toEqual({ sesuai: 1, tidak: 1, na: 1, kosong: 0 });
  });

  it("melaporkan hanya butir Tidak Sesuai sebagai temuan", () => {
    const { temuan } = groupInspectionFields(template, result);
    expect(temuan.map((f) => f.id)).toEqual([3]);
  });

  it("membangun ulang daftar butir dari jawaban bila template tidak tersedia", () => {
    const { fields, groups, tally } = groupInspectionFields(
      {},
      {
        values: [
          { fieldId: 2, valueString: "TRUE", field: { id: 2, grup: "Bagian A", tipe: "BOOLEAN", pertanyaan: "A" } },
          { fieldId: 3, valueString: "FALSE", field: { id: 3, grup: "Bagian A", tipe: "BOOLEAN", pertanyaan: "B" } },
        ],
      },
    );
    expect(fields.map((f) => f.id)).toEqual([2, 3]);
    expect(groups).toHaveLength(1);
    expect(tally.tidak).toBe(1);
  });

  it("memberi grup bawaan bila field tidak punya grup", () => {
    const { groups } = groupInspectionFields({ fields: [{ id: 9, tipe: "BOOLEAN", pertanyaan: "X" }] }, { values: [] });
    expect(groups[0].grup).toBe("Komponen Pemeriksaan");
  });

  it("menghitung butir yang belum dijawab sebagai kosong", () => {
    const { tally } = groupInspectionFields(template, { values: [] });
    expect(tally.kosong).toBe(3);
    expect(tally.sesuai).toBe(0);
  });

  it("tidak melempar untuk hasil tanpa values", () => {
    expect(groupInspectionFields(template, null).fields).toHaveLength(3);
    expect(groupInspectionFields(template, undefined).tally.kosong).toBe(3);
  });
});
