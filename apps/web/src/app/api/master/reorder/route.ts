import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/api-auth";
import { validateBody } from "@/lib/validations";

const reorderSchema = z.object({
  table: z.enum(["puskesmas", "jenisTpp", "jenisSarana", "jenisTtu"]),
  items: z.array(z.object({ id: z.number().int().positive(), urutan: z.number().int().min(0) })).min(1),
});

export const PATCH = withAdmin(async (req: NextRequest) => {
  const raw = await req.json();
  const parsed = validateBody(reorderSchema, raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { table, items } = parsed.data;

  const model = {
    puskesmas: prisma.puskesmas,
    jenisTpp: prisma.jenisTpp,
    jenisSarana: prisma.jenisSarana,
    jenisTtu: prisma.jenisTtu,
  }[table];

  await prisma.$transaction(
    items.map((item) => (model as any).update({ where: { id: item.id }, data: { urutan: item.urutan } })),
  );

  return NextResponse.json({ ok: true });
});
