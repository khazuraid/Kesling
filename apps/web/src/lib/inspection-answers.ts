/**
 * Pengelompokan butir kuesioner, rekap jawaban, dan daftar temuan.
 *
 * Dahulu logika ini menyatu dengan render modal detail. Dipisah agar butir
 * "Tidak Sesuai" yang dilaporkan ke pengguna dapat diuji tanpa merender apa pun.
 */

export type AnswerState = "sesuai" | "tidak" | "na" | "kosong";

export interface InspectionGroup {
  grup: string;
  items: any[];
}

export interface InspectionTally {
  sesuai: number;
  tidak: number;
  na: number;
  kosong: number;
}

/** Satu jawaban boolean menjadi satu dari empat keadaan. */
export function answerState(valueString: unknown): AnswerState {
  const v = String(valueString ?? "")
    .trim()
    .toUpperCase();
  if (v === "TRUE") return "sesuai";
  if (v === "FALSE") return "tidak";
  if (v === "NA") return "na";
  return "kosong";
}

/** Butir yang bukan metadata, bukan tanda tangan, dan bukan foto. */
function isChecklistField(field: any): boolean {
  return (
    field?.grup !== "__META__" &&
    String(field?.tipe ?? "").toUpperCase() !== "SIGNATURE" &&
    String(field?.tipe ?? "").toUpperCase() !== "PHOTO"
  );
}

export function groupInspectionFields(
  template: any,
  result: any,
): { fields: any[]; groups: InspectionGroup[]; tally: InspectionTally; temuan: any[] } {
  const values: any[] = result?.values || [];

  const fromTemplate = ((template?.fields || []) as any[]).filter(isChecklistField);
  // Sebagian hasil lama dibuka tanpa template (mis. tautan langsung ke id yang
  // template-nya sudah dihapus); daftar butirnya dibangun ulang dari jawaban.
  const fields =
    fromTemplate.length > 0 ? fromTemplate : values.filter((v) => isChecklistField(v?.field)).map((v) => v.field);

  const byFieldId = new Map<number, any>();
  for (const v of values) byFieldId.set(v.fieldId, v);

  const groups: InspectionGroup[] = [];
  const tally: InspectionTally = { sesuai: 0, tidak: 0, na: 0, kosong: 0 };
  const temuan: any[] = [];

  for (const f of fields) {
    const state = answerState(byFieldId.get(f.id)?.valueString);
    tally[state]++;

    const grup = f.grup || "Komponen Pemeriksaan";
    let group = groups.find((g) => g.grup === grup);
    if (!group) {
      group = { grup, items: [] };
      groups.push(group);
    }
    group.items.push(f);

    if (state === "tidak") temuan.push(f);
  }

  return { fields, groups, tally, temuan };
}
