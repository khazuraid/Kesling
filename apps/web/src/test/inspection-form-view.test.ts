import { describe, expect, it } from "vitest";
import { collectMissingRequired } from "@/app/(app)/pemeriksaan/FormView";

describe("collectMissingRequired", () => {
  const mockForm = {
    fields: [
      { id: 1, pertanyaan: "Nama Tempat", grup: "__META__", isRequired: true, tipe: "TEXT" },
      { id: 2, pertanyaan: "Alamat", grup: "__META__", isRequired: false, tipe: "TEXT" },
      { id: 10, pertanyaan: "Lantai bersih?", grup: "Bangunan", isRequired: true, tipe: "BOOLEAN" },
      { id: 11, pertanyaan: "Ventilasi cukup?", grup: "Bangunan", isRequired: false, tipe: "BOOLEAN" },
      { id: 12, pertanyaan: "Atap kokoh?", grup: "Bangunan", isRequired: true, tipe: "BOOLEAN" },
    ],
  };

  it("mendeteksi seluruh butir wajib yang belum diisi", () => {
    const missing = collectMissingRequired(mockForm, {}, {});
    const ids = missing.map((m) => m.id);
    expect(ids).toContain(1);
    expect(ids).toContain(10);
    expect(ids).toContain(12);
    expect(ids).not.toContain(2); // opsional
    expect(ids).not.toContain(11); // opsional
    expect(missing).toHaveLength(3);
  });

  it("mengosongkan daftar bila seluruh butir wajib telah terisi", () => {
    const meta = { 1: "Depot Air Segar" };
    const form = { 10: "TRUE", 12: "FALSE" };
    const missing = collectMissingRequired(mockForm, form, meta);
    expect(missing).toHaveLength(0);
  });

  it("tidak menagih butir yang dinonaktifkan oleh golongan", () => {
    const formWithGolongan = {
      fields: [
        {
          id: 20,
          pertanyaan: "Khusus Golongan A2",
          grup: "Dapur",
          isRequired: true,
          tipe: "BOOLEAN",
          config: { targetGolongan: "A2" },
        },
      ],
    };

    // Saat golongan A1 dipilih, butir untuk A2 berstatus disabled → tidak wajib
    const missingA1 = collectMissingRequired(formWithGolongan, {}, {}, "A1");
    expect(missingA1).toHaveLength(0);

    // Saat golongan A2 dipilih, butir wajib berlaku
    const missingA2 = collectMissingRequired(formWithGolongan, {}, {}, "A2");
    expect(missingA2).toHaveLength(1);
    expect(missingA2[0].id).toBe(20);
  });

  it("memperlakukan opsi T/A (NA) sebagai terisi untuk butir yang mengizinkan", () => {
    const form = { 10: "NA", 12: "TRUE" };
    const meta = { 1: "Depot Air Segar" };
    const missing = collectMissingRequired(mockForm, form, meta);
    expect(missing).toHaveLength(0);
  });

  it("menangani form null atau tanpa fields dengan anggun", () => {
    expect(collectMissingRequired(null, {}, {})).toEqual([]);
    expect(collectMissingRequired({}, {}, {})).toEqual([]);
  });
});
