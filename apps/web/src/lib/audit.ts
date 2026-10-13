import { prisma } from "@apps-kes/database";

export async function createAuditLog(params: {
  userId: number;
  action: "CREATE" | "UPDATE" | "DELETE";
  tableName: string;
  recordId: number;
  oldData?: unknown;
  newData?: unknown;
}) {
  try {
    // Skip jika user sudah tidak ada (session basi / user terhapus) —
    // audit tidak boleh menggagalkan request utama.
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true },
    });
    if (!user) {
      console.warn(
        `[audit] skip: userId ${params.userId} tidak ditemukan (${params.action} ${params.tableName}#${params.recordId})`,
      );
      return;
    }
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        tableName: params.tableName,
        recordId: params.recordId,
        oldData: params.oldData ? JSON.parse(JSON.stringify(params.oldData)) : undefined,
        newData: params.newData ? JSON.parse(JSON.stringify(params.newData)) : undefined,
      },
    });
  } catch (err) {
    console.error("[audit] gagal menulis audit log:", err);
  }
}
