import { access, constants, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "@apps-kes/database";
import Redis from "ioredis";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRedisInfo(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split("\r\n")) {
    if (!line || line.startsWith("#")) continue;
    const [k, v] = line.split(":");
    if (k && v !== undefined) out[k.trim()] = v.trim();
  }
  return out;
}

export const GET = withAdmin(async (_req: NextRequest) => {
  const started = Date.now();

  // ─── Database checks ────────────────────────────────────────────────────────
  const dbStart = Date.now();
  let dbOk = false;
  let dbLatencyMs = -1;
  let dbSize = 0;
  let activeConnections = 0;
  let counts = { users: 0, sasaran: 0, inspections: 0, auditLogs: 0, errors24h: 0 };

  try {
    const [pingRes, sizeRes, connRes, userCount, sasaranCount, inspectCount, auditCount, errCount] = await Promise.all([
      prisma.$queryRaw<{ val: number }[]>`SELECT 1 as val`,
      prisma.$queryRaw<{ size: string | bigint | number }[]>`SELECT pg_database_size(current_database()) as size`,
      prisma.$queryRaw<
        { count: number }[]
      >`SELECT count(*)::int as count FROM pg_stat_activity WHERE datname = current_database()`,
      prisma.user.count(),
      prisma.sasaran.count(),
      prisma.inspectionResult.count(),
      prisma.auditLog.count(),
      prisma.systemErrorLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
      }),
    ]);

    dbLatencyMs = Date.now() - dbStart;
    dbOk = Array.isArray(pingRes) && pingRes.length > 0;
    dbSize = Number(sizeRes[0]?.size || 0);
    activeConnections = connRes[0]?.count || 0;
    counts = {
      users: userCount,
      sasaran: sasaranCount,
      inspections: inspectCount,
      auditLogs: auditCount,
      errors24h: errCount,
    };
  } catch {
    dbOk = false;
  }

  // ─── Redis & Worker checks ──────────────────────────────────────────────────
  const redisStart = Date.now();
  let redisOk = false;
  let redisLatencyMs = -1;
  let queueLen = -1;
  let redisInfoMem: Record<string, string> = {};
  let redisInfoClients: Record<string, string> = {};

  const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
  });

  try {
    const [pong, qLen, rawMem, rawClients] = await Promise.all([
      redis.ping(),
      redis.llen("queue:inspection-import"),
      redis.info("memory"),
      redis.info("clients"),
    ]);
    redisLatencyMs = Date.now() - redisStart;
    redisOk = pong === "PONG";
    queueLen = qLen;
    redisInfoMem = parseRedisInfo(rawMem || "");
    redisInfoClients = parseRedisInfo(rawClients || "");
  } catch {
    redisOk = false;
  } finally {
    redis.disconnect();
  }

  // ─── Storage Volume checks ──────────────────────────────────────────────────
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  let volumeWritable = false;
  let uploadFiles = 0;
  let uploadBytes = 0;

  try {
    await access(uploadsDir, constants.R_OK | constants.W_OK);
    volumeWritable = true;

    const walk = async (dir: string, depth = 0): Promise<void> => {
      if (depth > 6 || uploadFiles > 10000) return;
      const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full, depth + 1);
        } else {
          uploadFiles++;
          const s = await stat(full).catch(() => null);
          if (s) uploadBytes += s.size;
        }
      }
    };
    await walk(uploadsDir);
  } catch {
    volumeWritable = false;
  }

  // ─── System / Host metrics ──────────────────────────────────────────────────
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const procMem = process.memoryUsage();
  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  return NextResponse.json({
    ok: dbOk && redisOk,
    status: dbOk && redisOk ? "healthy" : dbOk ? "degraded" : "down",
    timestamp: new Date().toISOString(),
    totalLatencyMs: Date.now() - started,

    database: {
      status: dbOk ? "up" : "down",
      latencyMs: dbLatencyMs,
      activeConnections,
      databaseSizeBytes: dbSize,
      counts,
    },

    redis: {
      status: redisOk ? "up" : "down",
      latencyMs: redisLatencyMs,
      usedMemoryBytes: Number(redisInfoMem.used_memory || 0),
      usedMemoryHuman: redisInfoMem.used_memory_human || "0B",
      connectedClients: Number(redisInfoClients.connected_clients || 0),
      importQueueLength: queueLen,
    },

    storage: {
      uploadsWritable: volumeWritable,
      totalFiles: uploadFiles,
      totalBytes: uploadBytes,
    },

    runtime: {
      nodeVersion: process.version,
      processUptimeSec: Math.round(process.uptime()),
      heapUsedMb: Math.round(procMem.heapUsed / 1048576),
      heapTotalMb: Math.round(procMem.heapTotal / 1048576),
      rssMb: Math.round(procMem.rss / 1048576),
      externalMb: Math.round(procMem.external / 1048576),
    },

    host: {
      platform: `${os.platform()} (${os.arch()})`,
      hostUptimeSec: Math.round(os.uptime()),
      cpuCores: cpus.length,
      cpuModel: cpus[0]?.model || "Unknown",
      loadAvg: {
        "1m": Number(loadAvg[0].toFixed(2)),
        "5m": Number(loadAvg[1].toFixed(2)),
        "15m": Number(loadAvg[2].toFixed(2)),
      },
      memory: {
        totalMb: Math.round(totalMem / 1048576),
        usedMb: Math.round(usedMem / 1048576),
        freeMb: Math.round(freeMem / 1048576),
        usedPercent: Math.round((usedMem / totalMem) * 100),
      },
    },
  });
});
