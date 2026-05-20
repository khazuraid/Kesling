import { describe, expect, it } from "vitest";
import { laporanSaranaSchema, laporanTppSchema, validateBody } from "@/lib/validations";

const validTpp = {
  puskesmasId: 1,
  bulan: 6,
  tahun: 2025,
  items: [{ jenisTppId: 1, terdaftar: 10, diperiksa: 5, laikJumlah: 3 }],
};

describe("laporanTppSchema", () => {
  it("accepts valid data", () => {
    expect(laporanTppSchema.safeParse(validTpp).success).toBe(true);
  });

  it("rejects missing puskesmasId", () => {
    const { puskesmasId, ...rest } = validTpp;
    expect(laporanTppSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects bulan=13", () => {
    expect(laporanTppSchema.safeParse({ ...validTpp, bulan: 13 }).success).toBe(false);
  });

  it("rejects negative terdaftar", () => {
    const data = { ...validTpp, items: [{ ...validTpp.items[0], terdaftar: -1 }] };
    expect(laporanTppSchema.safeParse(data).success).toBe(false);
  });
});

describe("laporanSaranaSchema", () => {
  it("accepts valid data", () => {
    const valid = {
      puskesmasId: 1,
      bulan: 1,
      tahun: 2025,
      items: [
        {
          jenisSaranaId: 1,
          jumlah: 10,
          kk: 5,
          pddk: 20,
          diperiksaJumlah: 8,
          diperiksaMs: 6,
          diperiksaKk: 4,
          diperiksaPddk: 15,
        },
      ],
    };
    expect(laporanSaranaSchema.safeParse(valid).success).toBe(true);
  });
});

describe("validateBody", () => {
  it("returns error messages on invalid data", () => {
    const result = validateBody(laporanTppSchema, { bulan: 13 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("puskesmasId");
    }
  });
});
