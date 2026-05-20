import { prisma } from "@apps-kes/database";

export async function createAuditLog(params: {
  userId: number;
  action: "CREATE" | "UPDATE" | "DELETE";
  tableName: string;
  recordId: number;
  oldData?: unknown;
  newData?: unknown;
}) {
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
}
