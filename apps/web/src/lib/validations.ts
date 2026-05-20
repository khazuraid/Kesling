import { z } from "zod";

const baseSchema = z.object({
  puskesmasId: z.number().int().positive(),
  bulan: z.number().int().min(1).max(12),
  tahun: z.number().int().min(2020).max(2100),
});

export const laporanTppSchema = baseSchema.extend({
  items: z
    .array(
      z.object({
        jenisTppId: z.number().int().positive(),
        terdaftar: z.number().int().min(0),
        diperiksa: z.number().int().min(0),
        laikJumlah: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const laporanSaranaSchema = baseSchema.extend({
  items: z
    .array(
      z.object({
        jenisSaranaId: z.number().int().positive(),
        jumlah: z.number().int().min(0),
        kk: z.number().int().min(0),
        pddk: z.number().int().min(0),
        diperiksaJumlah: z.number().int().min(0),
        diperiksaMs: z.number().int().min(0),
        diperiksaKk: z.number().int().min(0),
        diperiksaPddk: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const laporanSabSchema = baseSchema.extend({
  items: z
    .array(
      z.object({
        jenisSaranaId: z.number().int().positive(),
        jumlah: z.number().int().min(0),
        kk: z.number().int().min(0),
        pddk: z.number().int().min(0),
        diperiksaJumlah: z.number().int().min(0),
        diperiksaMs: z.number().int().min(0),
        diperiksaKk: z.number().int().min(0),
        diperiksaPddk: z.number().int().min(0),
        inspeksiR: z.number().int().min(0).default(0),
        inspeksiS: z.number().int().min(0).default(0),
        inspeksiT: z.number().int().min(0).default(0),
        inspeksiAt: z.number().int().min(0).default(0),
      }),
    )
    .min(1),
});

export const laporanRumahSchema = baseSchema.extend({
  jumlahRumahAda: z.number().int().min(0),
  jumlahDiperiksa: z.number().int().min(0),
  ventilasiMs: z.number().int().min(0).default(0),
  ventilasiTms: z.number().int().min(0).default(0),
  peneranganMs: z.number().int().min(0).default(0),
  peneranganTms: z.number().int().min(0).default(0),
  lantaiMs: z.number().int().min(0).default(0),
  lantaiTms: z.number().int().min(0).default(0),
  kepadatanHuniMs: z.number().int().min(0).default(0),
  kepadatanHuniTms: z.number().int().min(0).default(0),
  lubangAsapMs: z.number().int().min(0).default(0),
  lubangAsapTms: z.number().int().min(0).default(0),
  jambanMs: z.number().int().min(0).default(0),
  jambanTms: z.number().int().min(0).default(0),
  airBersihMs: z.number().int().min(0).default(0),
  airBersihTms: z.number().int().min(0).default(0),
  airLimbahMs: z.number().int().min(0).default(0),
  airLimbahTms: z.number().int().min(0).default(0),
  sampahMs: z.number().int().min(0).default(0),
  sampahTms: z.number().int().min(0).default(0),
  kandangMs: z.number().int().min(0).default(0),
  kandangTms: z.number().int().min(0).default(0),
  kandangTidakAda: z.number().int().min(0).default(0),
  hasilMs: z.number().int().min(0).default(0),
  hasilTms: z.number().int().min(0).default(0),
});

export const laporanTtuSchema = baseSchema.extend({
  items: z
    .array(
      z.object({
        jenisTtuId: z.number().int().positive(),
        jumlahTotal: z.number().int().min(0),
        ms: z.number().int().min(0),
        tms: z.number().int().min(0),
      }),
    )
    .min(1),
});

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") };
  }
  return { success: true, data: result.data };
}
