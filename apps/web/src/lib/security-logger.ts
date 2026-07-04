import { prisma } from "@apps-kes/database";

interface SecurityEvent {
  eventType: "LOGIN_FAILED" | "RATE_LIMIT" | "BRUTE_FORCE" | "SUSPICIOUS";
  ip: string;
  path?: string;
  userAgent?: string;
  detail?: string;
}

export async function logSecurityEvent(event: SecurityEvent) {
  try {
    await prisma.securityLog.create({
      data: {
        eventType: event.eventType,
        ip: event.ip,
        path: event.path || null,
        userAgent: event.userAgent || null,
        detail: event.detail || null,
      },
    });
  } catch (e) {
    // Fail silently — don't break the app if logging fails
    console.error("[SecurityLog] Failed to log event:", e);
  }
}

export async function getSecurityEvents(params: {
  page?: number;
  limit?: number;
  eventType?: string;
  ip?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const { page = 1, limit = 25, eventType, ip, dateFrom, dateTo } = params;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (eventType && eventType !== "all") where.eventType = eventType;
  if (ip) where.ip = { contains: ip };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  const [data, total] = await Promise.all([
    prisma.securityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.securityLog.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}
