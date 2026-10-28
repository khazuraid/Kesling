import { describe, expect, it } from "vitest";
import {
  buildRiwayatParams,
  matchesTemplateOwner,
  matchesTemplateSearch,
  templateCategoryName,
  templateCategoryOptions,
} from "@/lib/template-filter";

describe("matchesTemplateOwner", () => {
  const dinkes = { puskesmasId: null };
  const sendiri = { puskesmasId: 7 };
  const lain = { puskesmasId: 9 };

  it("meloloskan semua template saat filter 'all'", () => {
    expect(matchesTemplateOwner(dinkes, "all", 7)).toBe(true);
    expect(matchesTemplateOwner(sendiri, "all", 7)).toBe(true);
    expect(matchesTemplateOwner(lain, "all", 7)).toBe(true);
  });

  it("'dinkes' hanya template tanpa puskesmas", () => {
    expect(matchesTemplateOwner(dinkes, "dinkes", 7)).toBe(true);
    expect(matchesTemplateOwner(sendiri, "dinkes", 7)).toBe(false);
  });

  it("'own' hanya template puskesmas sendiri", () => {
    expect(matchesTemplateOwner(sendiri, "own", 7)).toBe(true);
    expect(matchesTemplateOwner(lain, "own", 7)).toBe(false);
    expect(matchesTemplateOwner(dinkes, "own", 7)).toBe(false);
  });

  it("'other' hanya template puskesmas lain, bukan Dinkes", () => {
    expect(matchesTemplateOwner(lain, "other", 7)).toBe(true);
    expect(matchesTemplateOwner(sendiri, "other", 7)).toBe(false);
    // Dinkes tidak boleh ikut terhitung sebagai "puskesmas lain".
    expect(matchesTemplateOwner(dinkes, "other", 7)).toBe(false);
  });

  it("tidak cocok saat pengguna tanpa puskesmas", () => {
    expect(matchesTemplateOwner(sendiri, "own", null)).toBe(false);
    expect(matchesTemplateOwner(sendiri, "other", null)).toBe(true);
  });
});

describe("templateCategoryName", () => {
  it("memakai subCategory.category.nama bila ada", () => {
    expect(templateCategoryName({ subCategory: { nama: "SPAL", category: { nama: "Sanitasi" } } })).toBe("Sanitasi");
  });

  it("jatuh ke subCategory.nama", () => {
    expect(templateCategoryName({ subCategory: { nama: "SPAL" } })).toBe("SPAL");
  });

  it("mengembalikan string kosong untuk template tanpa kategori", () => {
    expect(templateCategoryName({})).toBe("");
    expect(templateCategoryName(null)).toBe("");
  });
});

describe("templateCategoryOptions", () => {
  it("mengambil kategori unik dan mengurutkannya", () => {
    const list = [
      { subCategory: { category: { nama: "Sanitasi" } } },
      { subCategory: { category: { nama: "Air Bersih" } } },
      { subCategory: { category: { nama: "Sanitasi" } } },
    ];
    expect(templateCategoryOptions(list)).toEqual(["Air Bersih", "Sanitasi"]);
  });

  it("mengabaikan template tanpa kategori", () => {
    expect(templateCategoryOptions([{}, { subCategory: { nama: "TTU" } }])).toEqual(["TTU"]);
  });
});

describe("matchesTemplateSearch", () => {
  const tpl = { nama: "Inspeksi Depot Air", deskripsi: "Pemeriksaan sanitasi", subCategory: { nama: "DAM" } };

  it("cocok pada nama, deskripsi, dan sub-kategori", () => {
    expect(matchesTemplateSearch(tpl, "depot")).toBe(true);
    expect(matchesTemplateSearch(tpl, "sanitasi")).toBe(true);
    expect(matchesTemplateSearch(tpl, "dam")).toBe(true);
  });

  it("tidak cocok pada kata lain", () => {
    expect(matchesTemplateSearch(tpl, "jamban")).toBe(false);
  });

  it("kata kunci kosong meloloskan semua", () => {
    expect(matchesTemplateSearch(tpl, "")).toBe(true);
    expect(matchesTemplateSearch(tpl, "   ")).toBe(true);
  });
});

describe("buildRiwayatParams", () => {
  it("selalu menyertakan paginated, page, limit, dan search", () => {
    const sp = buildRiwayatParams({ page: 2, limit: 25 });
    expect(sp.get("paginated")).toBe("1");
    expect(sp.get("page")).toBe("2");
    expect(sp.get("limit")).toBe("25");
    expect(sp.get("search")).toBe("");
  });

  it("memangkas spasi kata kunci", () => {
    expect(buildRiwayatParams({ page: 1, limit: 10, search: "  soto  " }).get("search")).toBe("soto");
  });

  it("membuang filter yang bernilai 'all' atau kosong", () => {
    const sp = buildRiwayatParams({
      page: 1,
      limit: 10,
      status: "all",
      templateId: "all",
      userId: "all",
      dateFrom: "",
      dateTo: "",
    });
    expect(sp.has("status")).toBe(false);
    expect(sp.has("templateId")).toBe(false);
    expect(sp.has("userId")).toBe(false);
    expect(sp.has("dateFrom")).toBe(false);
    expect(sp.has("dateTo")).toBe(false);
  });

  it("meneruskan filter yang terpasang", () => {
    const sp = buildRiwayatParams({
      page: 3,
      limit: 50,
      status: "APPROVED",
      templateId: "12",
      userId: "5",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });
    expect(sp.get("status")).toBe("APPROVED");
    expect(sp.get("templateId")).toBe("12");
    expect(sp.get("userId")).toBe("5");
    expect(sp.get("dateFrom")).toBe("2026-01-01");
    expect(sp.get("dateTo")).toBe("2026-01-31");
  });
});
