import { describe, expect, it } from "vitest";
import { sasaranMetaValue } from "@/lib/sasaran-meta";

const field = (pertanyaan: string, config: Record<string, unknown> = {}) => ({ pertanyaan, config });

describe("sasaranMetaValue", () => {
  const sasaran = {
    nama: "Warteg Barokah",
    alamat: null,
    pemilik: null,
    kontak: null,
    dataDinamis: {
      nama: "Warteg Barokah",
      alamat: "Jl. Kesambi No. 5",
      pemilik: "H. Ahmad",
      no_hp: "0812345678",
    },
  };

  it("mengambil alamat dari dataDinamis", () => {
    expect(sasaranMetaValue(sasaran, field("Alamat Lokasi Usaha"))).toBe("Jl. Kesambi No. 5");
  });

  it("mengambil pengelola dari dataDinamis", () => {
    expect(sasaranMetaValue(sasaran, field("Nama Pengelola / Penanggung Jawab"))).toBe("H. Ahmad");
  });

  it("membedakan pengelola dari nama sarana walau labelnya sama-sama memuat 'nama'", () => {
    expect(sasaranMetaValue(sasaran, field("Nama Sarana / Unit SPPG"))).toBe("Warteg Barokah");
    expect(sasaranMetaValue(sasaran, field("Nama Pengelola / Penanggung Jawab"))).toBe("H. Ahmad");
  });

  it("memakai kode yang ditunjuk template lebih dulu", () => {
    expect(sasaranMetaValue(sasaran, field("Alamat Lokasi Usaha", { dataDasarCode: "no_hp" }))).toBe("0812345678");
  });

  it("memahami penanda autoFill bawaan template lama", () => {
    expect(sasaranMetaValue(sasaran, { pertanyaan: "Alamat Lokasi Usaha", autoFill: "SASARAN_ALAMAT" })).toBe(
      "Jl. Kesambi No. 5",
    );
    expect(
      sasaranMetaValue(sasaran, { pertanyaan: "Nama Pengelola", autoFill: "SASARAN_PEMILIK" }),
    ).toBe("H. Ahmad");
  });

  it("jatuh ke kolom Sasaran bila dataDinamis tidak memuatnya", () => {
    const kolom = { nama: "Depot Air", alamat: "Jl. Siliwangi 1", pemilik: "Budi", kontak: "0899" };
    expect(sasaranMetaValue(kolom, field("Alamat"))).toBe("Jl. Siliwangi 1");
    expect(sasaranMetaValue(kolom, field("Kontak / Telepon"))).toBe("0899");
  });

  it("menggabungkan koordinat dari kolom Sasaran", () => {
    const gps = { ...sasaran, lat: -6.7, lng: 108.5 };
    expect(sasaranMetaValue(gps, field("Koordinat GPS"))).toBe("-6.7,108.5");
  });

  it("mengembalikan string kosong untuk sasaran null dan label tak dikenal", () => {
    expect(sasaranMetaValue(null, field("Alamat"))).toBe("");
    expect(sasaranMetaValue(undefined, field("Alamat"))).toBe("");
    expect(sasaranMetaValue(sasaran, field("Jumlah karyawan"))).toBe("");
  });

  it("menerima dynamicValues sebagai alias dataDinamis", () => {
    expect(sasaranMetaValue({ dynamicValues: { alamat: "Jl. Alias" } }, field("Alamat"))).toBe("Jl. Alias");
  });
});
