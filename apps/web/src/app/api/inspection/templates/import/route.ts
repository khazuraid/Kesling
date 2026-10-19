import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import Redis from "ioredis";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const QUEUE_KEY = "queue:inspection-import";
const ACTIVE_KEY = "inspection-import:active";
const JOB_TTL_SECONDS = 60 * 60 * 24;
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: 2 });

type AuthenticatedRequest = NextRequest & { user: { id: number | string } };

const MAX_QUEUE = Number(process.env.INSPECTION_IMPORT_MAX_QUEUE || 10);

export const POST = withAuth(async (request: NextRequest) => {
  const req = request as AuthenticatedRequest;
  const queued = await redis.llen(QUEUE_KEY);
  if (queued > MAX_QUEUE)
    return NextResponse.json({ error: `Antrian import penuh (${queued}). Coba lagi beberapa saat.` }, { status: 429 });
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  if (!/\.(pdf|docx)$/i.test(file.name))
    return NextResponse.json({ error: "Format file harus .pdf atau .docx" }, { status: 400 });

  const maxBytes = Number(process.env.INSPECTION_IMPORT_MAX_BYTES || 30 * 1024 * 1024);
  if (file.size > maxBytes) return NextResponse.json({ error: "Ukuran file terlalu besar" }, { status: 413 });

  const jobId = randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadDir = join("/tmp", "apps-kes-inspection-import");
  await mkdir(uploadDir, { recursive: true });
  const tempPath = join(uploadDir, `${jobId}-${basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  await writeFile(tempPath, buffer);

  const jobKey = `inspection-import:${jobId}`;
  const now = new Date().toISOString();
  await redis.hset(jobKey, {
    status: "queued",
    progress: "5",
    message: "File diterima; menunggu giliran worker",
    fileName: file.name,
    ownerId: String(req.user.id),
    createdAt: now,
  });
  await redis.expire(jobKey, JOB_TTL_SECONDS);

  // Initial log entry
  const initialLog = JSON.stringify({
    timestamp: new Date().toLocaleTimeString("id-ID", { hour12: false }),
    level: "info",
    message: `File ${file.name} diterima (${(file.size / 1024).toFixed(1)} KB), masuk ke antrean`,
  });
  await redis.rpush(`inspection-import:${jobId}:logs`, initialLog);
  await redis.expire(`inspection-import:${jobId}:logs`, JOB_TTL_SECONDS);

  // Track in user job history list (keep up to 20 jobs)
  const userJobsKey = `inspection-import:user:${req.user.id}:jobs`;
  await redis.lpush(userJobsKey, jobId);
  await redis.ltrim(userJobsKey, 0, 19);
  await redis.expire(userJobsKey, JOB_TTL_SECONDS * 7);

  // Push to FIFO Redis queue
  await redis.rpush(
    QUEUE_KEY,
    JSON.stringify({
      id: jobId,
      type: "inspection-template-import",
      fileName: file.name,
      tempPath,
      fileBase64: buffer.toString("base64"),
    }),
  );

  return NextResponse.json({ jobId }, { status: 202 });
});

export const GET = withAuth(async (request: NextRequest) => {
  const req = request as AuthenticatedRequest;

  // Endpoint to check queue overview
  if (req.nextUrl.searchParams.get("action") === "queue") {
    const totalQueued = await redis.llen(QUEUE_KEY);
    const activeJobId = await redis.get(ACTIVE_KEY);
    let activeJob = null;
    if (activeJobId) {
      const activeData = await redis.hgetall(`inspection-import:${activeJobId}`);
      if (activeData?.fileName) {
        activeJob = {
          id: activeJobId,
          fileName: activeData.fileName,
          progress: Number(activeData.progress || 0),
          message: activeData.message || "",
        };
      }
    }
    return NextResponse.json({ totalQueued, activeJob });
  }

  // Endpoint to get user import job history and current queue
  if (req.nextUrl.searchParams.get("action") === "history") {
    const totalQueued = await redis.llen(QUEUE_KEY);
    const activeJobId = await redis.get(ACTIVE_KEY);
    const queueItems = await redis.lrange(QUEUE_KEY, 0, -1);
    const userJobsKey = `inspection-import:user:${req.user.id}:jobs`;
    const userJobIds = await redis.lrange(userJobsKey, 0, 19);

    // Collect all job IDs: active first, then all waiting queue items, then user past jobs
    const allJobIds = new Set<string>();
    if (activeJobId) allJobIds.add(activeJobId);
    for (const item of queueItems) {
      try {
        const parsed = JSON.parse(item);
        if (parsed.id) allJobIds.add(parsed.id);
      } catch {}
    }
    for (const jId of userJobIds) {
      allJobIds.add(jId);
    }

    const jobs = [];
    for (const jId of allJobIds) {
      const data = await redis.hgetall(`inspection-import:${jId}`);
      if (data?.fileName) {
        let fieldCount = 0;
        try {
          if (data.result) {
            const parsed = JSON.parse(data.result);
            fieldCount = (parsed.fields || []).length;
          }
        } catch {
          // ignore json parse error
        }

        let queuePosition = 0;
        if (data.status === "queued") {
          const idx = queueItems.findIndex((item) => {
            try {
              return JSON.parse(item).id === jId;
            } catch {
              return false;
            }
          });
          queuePosition = idx >= 0 ? idx + 1 : 1;
        }

        jobs.push({
          jobId: jId,
          status: data.status,
          progress: Number(data.progress || 0),
          message: data.message || "",
          fileName: data.fileName,
          queuePosition,
          createdAt: data.createdAt,
          completedAt: data.completedAt,
          error: data.error || null,
          fieldCount,
        });
      }
    }
    return NextResponse.json({
      jobs,
      queue: {
        totalQueued,
        isWorkerActive: Boolean(activeJobId),
      },
    });
  }

  // Cancel single job from queue
  if (req.nextUrl.searchParams.get("action") === "cancel") {
    const cancelJobId = req.nextUrl.searchParams.get("jobId");
    if (cancelJobId) {
      const queueItems = await redis.lrange(QUEUE_KEY, 0, -1);
      for (const item of queueItems) {
        try {
          const parsed = JSON.parse(item);
          if (parsed.id === cancelJobId) {
            await redis.lrem(QUEUE_KEY, 0, item);
          }
        } catch {}
      }
      await redis.hset(`inspection-import:${cancelJobId}`, {
        status: "failed",
        error: "Dibatalkan",
        progress: "100",
      });
      return NextResponse.json({ success: true });
    }
  }

  // Clear all pending queue
  if (req.nextUrl.searchParams.get("action") === "clear-queue") {
    await redis.del(QUEUE_KEY);
    await redis.del(ACTIVE_KEY);
    return NextResponse.json({ success: true });
  }

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId || !/^[0-9a-f-]{36}$/i.test(jobId))
    return NextResponse.json({ error: "jobId tidak valid" }, { status: 400 });

  const data = await redis.hgetall(`inspection-import:${jobId}`);
  if (!data.status || data.ownerId !== String(req.user.id))
    return NextResponse.json({ error: "Job tidak ditemukan" }, { status: 404 });

  // Read logs array
  const logsRaw = await redis.lrange(`inspection-import:${jobId}:logs`, 0, -1);
  const logs = logsRaw.map((entry) => {
    try {
      return JSON.parse(entry);
    } catch {
      return { timestamp: "", level: "info", message: entry };
    }
  });

  // Calculate queue position if still queued
  let queuePosition = 0;
  const queueItems = await redis.lrange(QUEUE_KEY, 0, -1);
  const totalQueued = queueItems.length;

  if (data.status === "queued") {
    const idx = queueItems.findIndex((item) => {
      try {
        return JSON.parse(item).id === jobId;
      } catch {
        return false;
      }
    });
    queuePosition = idx >= 0 ? idx + 1 : 1;
  }

  return NextResponse.json({
    jobId,
    status: data.status,
    progress: Number(data.progress || 0),
    message: data.message || "",
    fileName: data.fileName || "",
    queuePosition,
    totalQueued,
    logs,
    result: data.result ? JSON.parse(data.result) : undefined,
    error: data.error || undefined,
    createdAt: data.createdAt,
    completedAt: data.completedAt,
  });
});
