import { describe, expect, it } from "vitest";
import { pageRange, pageWindow } from "@/lib/pagination";

describe("pageWindow", () => {
  it("menampilkan semua halaman bila jumlahnya sedikit", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("mengembalikan satu halaman walau totalPages nol", () => {
    expect(pageWindow(1, 0)).toEqual([1]);
  });

  it("menyisipkan elipsis di kanan saat halaman aktif di awal", () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, null, 20]);
  });

  it("menyisipkan elipsis di kiri saat halaman aktif di ujung", () => {
    expect(pageWindow(20, 20)).toEqual([1, null, 19, 20]);
  });

  it("menyisipkan elipsis di kedua sisi saat halaman aktif di tengah", () => {
    expect(pageWindow(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
  });

  it("tidak menyisipkan elipsis yang hanya menyembunyikan satu halaman", () => {
    // Halaman 3 dari 8: celah kirinya tepat berbatasan, jadi elipsis kiri
    // tidak berguna dan tidak boleh muncul.
    expect(pageWindow(3, 8)).toEqual([1, 2, 3, 4, null, 8]);
  });

  it("menjepit halaman aktif ke rentang yang sah", () => {
    expect(pageWindow(99, 20)).toEqual([1, null, 19, 20]);
    expect(pageWindow(0, 20)).toEqual([1, 2, null, 20]);
  });

  it("tidak pernah kehilangan halaman pertama dan terakhir", () => {
    for (let p = 1; p <= 30; p += 1) {
      const pages = pageWindow(p, 30);
      expect(pages[0]).toBe(1);
      expect(pages.at(-1)).toBe(30);
      expect(pages).toContain(p);
    }
  });
});

describe("pageRange", () => {
  it("menghitung rentang pada halaman pertama", () => {
    expect(pageRange(1, 10, 248)).toEqual({ from: 1, to: 10 });
  });

  it("menghitung rentang pada halaman tengah", () => {
    expect(pageRange(3, 10, 248)).toEqual({ from: 21, to: 30 });
  });

  it("memotong ujung rentang di halaman terakhir", () => {
    expect(pageRange(25, 10, 248)).toEqual({ from: 241, to: 248 });
  });

  it("mengembalikan nol saat tidak ada data", () => {
    expect(pageRange(1, 10, 0)).toEqual({ from: 0, to: 0 });
  });
});
