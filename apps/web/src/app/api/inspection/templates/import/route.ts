import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import Redis from "ioredis";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const QUEUE_KEY = "queue:inspection-import";
const JOB_TTL_SECONDS = 60 * 60 * 24;
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: 2 });

type AuthenticatedRequest = NextRequest & { user: { id: number | string } };

export const POST = withAuth(async (request: NextRequest) => {
  const req = request as AuthenticatedRequest;
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
  await redis.hset(jobKey, {
    status: "queued",
    progress: "5",
    message: "File diterima; menunggu worker",
    fileName: file.name,
    ownerId: String(req.user.id),
    createdAt: new Date().toISOString(),
  });
  await redis.expire(jobKey, JOB_TTL_SECONDS);
  // Containers do not share /tmp. Payload guarantees worker access; tempPath remains useful for same-host deployments/debugging.
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
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId || !/^[0-9a-f-]{36}$/i.test(jobId))
    return NextResponse.json({ error: "jobId tidak valid" }, { status: 400 });
  const data = await redis.hgetall(`inspection-import:${jobId}`);
  if (!data.status || data.ownerId !== String(req.user.id))
    return NextResponse.json({ error: "Job tidak ditemukan" }, { status: 404 });
  return NextResponse.json({
    jobId,
    status: data.status,
    progress: Number(data.progress || 0),
    message: data.message || "",
    result: data.result ? JSON.parse(data.result) : undefined,
    error: data.error || undefined,
  });
});
