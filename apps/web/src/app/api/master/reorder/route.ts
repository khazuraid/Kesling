import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withRoles } from "@/lib/api-auth";
import { validateBody } from "@/lib/validations";

const reorderSchema = z.object({
  table: z.enum(["puskesmas", "jenisTpp", "jenisSarana", "jenisTtu", "dynamicParameter", "dynamicSubCategory"]),
  items: z.array(z.object({ id: z.number().int().positive(), urutan: z.number().int().min(0) })).min(1),
});

export const PATCH = withRoles(["ADMIN", "DINKES"], async (req: NextRequest) => {
  const userId = (req as any).user?.id;
  const raw = await req.json();
  const parsed = validateBody(reorderSchema, raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { table, items } = parsed.data;

  const model = {
    puskesmas: prisma.puskesmas,
    jenisTpp: prisma.jenisTpp,
    jenisSarana: prisma.jenisSarana,
    jenisTtu: prisma.jenisTtu,
    dynamicParameter: prisma.dynamicParameter,
    dynamicSubCategory: prisma.dynamicSubCategory,
  }[table];

  await prisma.$transaction(
    items.map((item) => (model as any).update({ where: { id: item.id }, data: { urutan: item.urutan } })),
  );

  await prisma.auditLog.create({
    data: {
      userId,
      action: "UPDATE",
      tableName: table,
      recordId: 0,
      newData: { action: "reorder", count: items.length },
    },
  });

  return NextResponse.json({ ok: true });
});
