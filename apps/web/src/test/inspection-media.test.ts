import { describe, expect, it } from "vitest";
import { extractInspectionPhotos, extractInspectionSignatures, signatureSrc } from "@/lib/inspection-media";

describe("extractInspectionPhotos", () => {
  it("mengambil foto dari field bertipe PHOTO", () => {
    const photos = extractInspectionPhotos({
      values: [
        {
          fieldId: 1,
          valueString: "/uploads/inspections/a.jpg",
          field: { id: 1, tipe: "PHOTO", pertanyaan: "Foto Depan" },
        },
      ],
    });
    expect(photos).toHaveLength(1);
    expect(photos[0].url).toBe("/uploads/inspections/a.jpg");
    expect(photos[0].label).toBe("Foto Depan");
  });

  it("mengenali foto dari ekstensi walau tipenya bukan PHOTO", () => {
    const photos = extractInspectionPhotos({
      values: [
        {
          fieldId: 1,
          valueString: "https://kesling.biz.id/uploads/x.png",
          field: { id: 1, tipe: "TEXT", pertanyaan: "Lampiran" },
        },
      ],
    });
    expect(photos).toHaveLength(1);
  });

  it("menggabungkan foto dari result.fotoPaths", () => {
    const photos = extractInspectionPhotos({ values: [], fotoPaths: ["/uploads/kegiatan.jpg"] });
    expect(photos.map((p) => p.url)).toEqual(["/uploads/kegiatan.jpg"]);
  });

  it("membuang TTD dari galeri foto, walau nilainya data-url di kolom yang sama", () => {
    const signature = "data:image/png;base64,SIG";
    const photos = extractInspectionPhotos({
      signatureData: { petugas: signature },
      values: [
        { fieldId: 1, valueString: signature, field: { id: 1, tipe: "TEXT", pertanyaan: "Lampiran" } },
        { fieldId: 2, valueString: "/uploads/foto.jpg", field: { id: 2, tipe: "PHOTO", pertanyaan: "Foto" } },
      ],
    });
    expect(photos.map((p) => p.url)).toEqual(["/uploads/foto.jpg"]);
  });

  it("membuang field bertanda tangan meski tersimpan sebagai data-url gambar", () => {
    const photos = extractInspectionPhotos({
      values: [
        {
          fieldId: 1,
          valueString: "data:image/png;base64,SIG",
          field: { id: 1, tipe: "TEXT", pertanyaan: "Paraf Pengelola" },
        },
      ],
    });
    expect(photos).toHaveLength(0);
  });

  it("membuang duplikat dan memakai label yang lebih spesifik", () => {
    const photos = extractInspectionPhotos({
      values: [
        { fieldId: 1, valueString: "/uploads/sama.jpg?x=1", field: { id: 1, tipe: "PHOTO", pertanyaan: "Foto Depan" } },
        { fieldId: 2, valueString: "/uploads/sama.jpg", field: { id: 2, tipe: "PHOTO", pertanyaan: "Foto Samping" } },
      ],
    });
    expect(photos).toHaveLength(1);
    expect(photos[0].label).toBe("Foto Depan");
  });

  it("membaca daftar foto yang tersimpan sebagai JSON string", () => {
    const photos = extractInspectionPhotos({
      values: [
        {
          fieldId: 1,
          valueString: '["/uploads/a.jpg","/uploads/b.jpg"]',
          field: { id: 1, tipe: "PHOTO", pertanyaan: "Dokumentasi" },
        },
      ],
    });
    expect(photos.map((p) => p.url)).toEqual(["/uploads/a.jpg", "/uploads/b.jpg"]);
    expect(photos[1].label).toBe("Dokumentasi #2");
  });

  it("mengembalikan array kosong untuk hasil null", () => {
    expect(extractInspectionPhotos(null)).toEqual([]);
  });
});

describe("extractInspectionSignatures", () => {
  it("memisahkan tanda tangan petugas dan pemilik dari kunci map", () => {
    const sig = extractInspectionSignatures({
      signatureData: JSON.stringify({ petugas: "AAA", pemilik: "BBB" }),
    });
    expect(sig).toEqual({ petugas: "AAA", pemilik: "BBB" });
  });

  it("menerima objek langsung, bukan hanya JSON string", () => {
    const sig = extractInspectionSignatures({ signatureData: { ttd_pemeriksa: "AAA", pengelola: "BBB" } });
    expect(sig.petugas).toBe("AAA");
    expect(sig.pemilik).toBe("BBB");
  });

  it("memakai nilai field SIGNATURE bila map kosong", () => {
    const sig = extractInspectionSignatures({
      signatureData: {},
      values: [
        { fieldId: 1, valueString: "SIG1", field: { id: 1, tipe: "SIGNATURE", pertanyaan: "Tanda Tangan Pemeriksa" } },
      ],
    });
    expect(sig.petugas).toBe("SIG1");
  });

  it("tidak melempar untuk signatureData yang bukan JSON", () => {
    expect(extractInspectionSignatures({ signatureData: "bukan json" })).toEqual({ petugas: null, pemilik: null });
  });
});

describe("signatureSrc", () => {
  it("membiarkan data-url, path absolut, dan URL apa adanya", () => {
    expect(signatureSrc("data:image/png;base64,AA")).toBe("data:image/png;base64,AA");
    expect(signatureSrc("/uploads/ttd.png")).toBe("/uploads/ttd.png");
    expect(signatureSrc("https://x.test/ttd.png")).toBe("https://x.test/ttd.png");
  });

  it("membungkus basis64 telanjang menjadi data-url", () => {
    expect(signatureSrc("iVBORw0KGgo=")).toBe("data:image/png;base64,iVBORw0KGgo=");
  });
});
