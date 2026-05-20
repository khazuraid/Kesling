"use server";

import { prisma } from "@apps-kes/database";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { authActionClient } from "@/lib/safe-action";

export const createMasterItem = authActionClient
  .schema(
    z.object({
      table: z.enum(["jenisTpp", "jenisSarana", "jenisTtu"]),
      nama: z.string().min(1),
      kategori: z.string().optional(),
    }),
  )
  .action(async ({ parsedInput: { table, nama, kategori }, ctx: { user } }) => {
    const data: any = { nama };
    if (kategori) data.kategori = kategori;

    const item = await (prisma as any)[table].create({ data });
    await createAuditLog({ userId: user.id, action: "CREATE", tableName: table, recordId: item.id });
    return item;
  });

export const deleteMasterItem = authActionClient
  .schema(
    z.object({
      table: z.enum(["jenisTpp", "jenisSarana", "jenisTtu"]),
      id: z.number(),
    }),
  )
  .action(async ({ parsedInput: { table, id }, ctx: { user } }) => {
    await (prisma as any)[table].delete({ where: { id } });
    await createAuditLog({ userId: user.id, action: "DELETE", tableName: table, recordId: id });
    return { success: true };
  });
