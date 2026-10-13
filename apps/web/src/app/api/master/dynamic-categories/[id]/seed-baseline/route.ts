import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withRoles } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";

const DEFAULT_FIELDS = [
  { nama: "Nama", code: "nama", type: "TEXT", urutan: 90, required: true, config: { syncToEntityField: "nama" } },
  {
    nama: "Alamat",
    code: "alamat",
    type: "TEXT",
    urutan: 91,
    required: false,
    config: { syncToEntityField: "alamat" },
  },
  { nama: "No HP", code: "kontak", type: "TEXT", urutan: 92, required: false, config: { syncToEntityField: "kontak" } },
];

// POST /api/master/dynamic-categories/[id]/seed-baseline
// Seed default Data Dasar fields (Nama, Alamat, No HP) — skip codes yang sudah ada
export const POST = withRoles(
  ["ADMIN", "DINKES", "OPERATOR"],
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const userId = (req as any).user?.id;
    try {
      const { id } = await params;
      const categoryId = Number(id);
      if (!categoryId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

      const existing = await prisma.dynamicParameter.findMany({
        where: { categoryId },
        select: { code: true },
      });
      const existingCodes = new Set(existing.map((p: { code: string }) => p.code));

      const toCreate = DEFAULT_FIELDS.filter((f) => !existingCodes.has(f.code)).map((f) => ({
        ...f,
        categoryId,
        isBaseline: true,
      }));

      if (toCreate.length === 0) {
        return NextResponse.json({ created: 0, message: "Semua field default sudah ada" });
      }

      await prisma.dynamicParameter.createMany({ data: toCreate });

      await createAuditLog({
        userId,
        action: "UPDATE",
        tableName: "dynamic_parameter",
        recordId: categoryId,
        newData: { seeded: toCreate.map((f) => f.code) },
      });

      return NextResponse.json({ created: toCreate.length, codes: toCreate.map((f) => f.code) });
    } catch (error) {
      console.error("seed-baseline error:", error);
      return NextResponse.json({ error: "Gagal membuat field default" }, { status: 500 });
    }
  },
);
