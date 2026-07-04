import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

export const DELETE = withAuth(async (req: NextRequest, ctx: any) => {
  try {
    const { params } = ctx;
    const resolvedParams = typeof params.then === "function" ? await params : params;
    const id = parseInt(resolvedParams.id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const userId = (req as any).user?.id;
    const old = await prisma.inspectionTemplate.findUnique({ where: { id } });

    await prisma.inspectionField.deleteMany({ where: { templateId: id } });
    await prisma.inspectionTemplate.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "DELETE",
        tableName: "inspection_template",
        recordId: id,
        oldData: { nama: old?.nama },
        newData: undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});
