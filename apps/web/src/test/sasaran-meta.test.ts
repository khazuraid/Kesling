import { describe, expect, it } from "vitest";
import { baselineParamKey, defaultDataDasarCode, defaultDataDasarNama, sasaranMetaValue } from "@/lib/sasaran-meta";

const field = (pertanyaan: string, config: Record<string, unknown> = {}) => ({ pertanyaan, config });

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

describe("sasaranMetaValue", () => {
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
    expect(sasaranMetaValue(sasaran, { pertanyaan: "Nama Pengelola", autoFill: "SASARAN_PEMILIK" })).toBe("H. Ahmad");
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

  it("mengambil nilai via prefix autoFill dinamis DD:<codeParam>", () => {
    const s = {
      dataDinamis: {
        kapasitas_air: "5000 Liter",
        izin_usaha: "Ada (No. 123)",
      },
    };
    expect(
      sasaranMetaValue(s, {
        pertanyaan: "Kapasitas Harian",
        autoFill: "DD:kapasitas_air",
      }),
    ).toBe("5000 Liter");
    expect(
      sasaranMetaValue(s, {
        pertanyaan: "Surat Izin Operasional",
        autoFill: "DD:izin_usaha",
      }),
    ).toBe("Ada (No. 123)");
  });
});

describe("sasaranMetaValue dengan parameter data dasar dari Laporan Builder", () => {
  // Bentuk nyata di produksi: kode dibuat otomatis sebagai data_dasar_<timestamp>,
  // jadi satu-satunya penghubung adalah nama fieldnya.
  const params: any[] = [
    { id: 1, code: "data_dasar_1787149015480", nama: "Nama Sarana/Unit SPPG" },
    { id: 2, code: "data_dasar_1787149015481", nama: "Alamat rumah Pedagang/dapur" },
    { id: 3, code: "data_dasar_1787149015482", nama: "Nama Pengelola/Pemilik/Penanggung jawab" },
  ];
  const data = {
    nama: "SPPG Kesambi",
    dataDinamis: {
      data_dasar_1787149015481: "Jl. Perjuangan No. 12",
      data_dasar_1787149015482: "Ibu Siti",
    },
  };

  it("mencocokkan field alamat dengan kode yang tak terbaca dari namanya", () => {
    expect(sasaranMetaValue(data, field("Alamat Lokasi Usaha"), params)).toBe("Jl. Perjuangan No. 12");
  });

  it("mencocokkan field pengelola lewat nama parameter", () => {
    expect(sasaranMetaValue(data, field("Nama Pengelola"), params)).toBe("Ibu Siti");
  });

  it("memakai parameter yang ditunjuk syncToEntityField bila operator memasangnya", () => {
    const mapped = [...params];
    mapped[1] = { ...mapped[1], config: { syncToEntityField: "alamat" } };
    expect(sasaranMetaValue(data, field("Tempat"), mapped)).toBe("Jl. Perjuangan No. 12");
  });

  it("mencoba semua kandidat ber-key sama, bukan hanya yang pertama", () => {
    const dupes = [
      { id: 1, code: "data_dasar_1", nama: "Nama Pengelola/Pemilik — Username Telegram" },
      { id: 2, code: "data_dasar_2", nama: "Nama Pengelola/Pemilik/Penanggung jawab" },
    ];
    const only = { dataDinamis: { data_dasar_2: "Pak Budi" } };
    expect(sasaranMetaValue(only, field("Nama Pengelola"), dupes)).toBe("Pak Budi");
  });
});

describe("baselineParamKey", () => {
  it("memetakan nama parameter data dasar ke field entitas", () => {
    expect(baselineParamKey({ code: "data_dasar_99", nama: "Alamat rumah Pedagang/dapur" })).toBe("alamat");
    expect(baselineParamKey({ code: "data_dasar_99", nama: "Nama Pengelola/Pemilik/Penanggung jawab" })).toBe(
      "pemilik",
    );
    expect(baselineParamKey({ code: "data_dasar_99", nama: "Kontak/No HP" })).toBe("kontak");
    expect(baselineParamKey({ code: "data_dasar_99", nama: "Nama Sarana/Unit SPPG" })).toBe("nama");
  });

  it("mengutamakan syncToEntityField dan kode yang dikenali", () => {
    expect(
      baselineParamKey({ code: "data_dasar_99", nama: "Jumlah karyawan", config: { syncToEntityField: "kontak" } }),
    ).toBe("kontak");
    expect(baselineParamKey({ code: "alamat", nama: "Sesuatu" })).toBe("alamat");
  });

  it("mengembalikan null untuk field laporan biasa", () => {
    expect(baselineParamKey({ code: "jumlah_sampel", nama: "Jumlah sampel diperiksa" })).toBeNull();
  });
});

describe("defaultDataDasarNama", () => {
  it("memberi nama yang bisa dikenali, bukan 'Field Data Dasar Baru'", () => {
    expect(baselineParamKey({ nama: defaultDataDasarNama([]), code: "x" })).toBe("nama");
    expect(defaultDataDasarNama([])).not.toBe("Field Data Dasar Baru");
  });

  it("tidak mengulang nama yang sudah dipakai", () => {
    const used = [{ nama: "Nama" }, { nama: "Alamat" }];
    expect(defaultDataDasarNama(used)).toBe("Pemilik / Penanggung Jawab");
  });

  it("tetap mengembalikan nama yang valid walau semuanya sudah terpakai", () => {
    const all = ["Nama", "Alamat", "Pemilik / Penanggung Jawab", "Kontak / Telepon", "Latitude", "Longitude"].map(
      (nama) => ({ nama }),
    );
    expect(defaultDataDasarNama(all)).toBe("Field Data Dasar");
  });
});

describe("defaultDataDasarCode", () => {
  it("tetap memakai pola data_dasar_<timestamp> agar cocok dengan data lama", () => {
    expect(defaultDataDasarCode([])).toMatch(/^data_dasar_\d+$/);
  });

  it("tidak menabrak kode yang sudah ada", () => {
    const first = defaultDataDasarCode([]);
    expect(defaultDataDasarCode([{ code: first }])).not.toBe(first);
  });
});
