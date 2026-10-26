import { describe, expect, it } from "vitest";
import { photoSrc } from "@/lib/photo-url";

describe("photoSrc", () => {
  it("keeps a proper same-origin path", () => {
    expect(photoSrc("/uploads/inspections/a.jpg")).toBe("/uploads/inspections/a.jpg");
  });

  it("adds the missing leading slash", () => {
    expect(photoSrc("uploads/inspections/a.jpg")).toBe("/uploads/inspections/a.jpg");
  });

  it("strips a public/ prefix", () => {
    expect(photoSrc("public/uploads/inspections/a.jpg")).toBe("/uploads/inspections/a.jpg");
    expect(photoSrc("/public/uploads/inspections/a.jpg")).toBe("/uploads/inspections/a.jpg");
  });

  it("reduces an own-domain absolute URL to a path", () => {
    expect(photoSrc("https://kesling.biz.id/uploads/inspections/a.jpg")).toBe("/uploads/inspections/a.jpg");
  });

  it("keeps an external absolute URL untouched", () => {
    expect(photoSrc("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
  });

  it("keeps a data URL intact, comma included", () => {
    const dataUrl = "data:image/jpeg;base64,AAAA/BBBB+CCCC=";
    expect(photoSrc(dataUrl)).toBe(dataUrl);
  });

  it("takes the first entry out of a JSON array or comma list", () => {
    expect(photoSrc('["/uploads/a.jpg","/uploads/b.jpg"]')).toBe("/uploads/a.jpg");
    expect(photoSrc("/uploads/a.jpg, /uploads/b.jpg")).toBe("/uploads/a.jpg");
  });

  it("reads a nested value object", () => {
    expect(photoSrc({ valueString: "uploads/a.jpg" })).toBe("/uploads/a.jpg");
  });

  it("returns null for empty placeholders", () => {
    for (const raw of ["", "-", "null", "undefined", "[]", "{}", null, undefined, 0]) {
      expect(photoSrc(raw)).toBeNull();
    }
  });

  it("returns null for plain non-image text", () => {
    expect(photoSrc("Baik")).toBeNull();
    expect(photoSrc("TRUE")).toBeNull();
  });
});
