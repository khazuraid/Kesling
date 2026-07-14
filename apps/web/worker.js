"use strict";
const Redis = require("ioredis");
const { execFile } = require("node:child_process");
const { mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { promisify } = require("node:util");
const { normalizeInspectionTemplate } = require("./inspection-import-parser.js");

const execFileAsync = promisify(execFile);
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null, retryStrategy: (times) => Math.min(times * 200, 2000) });
const QUEUE_KEY = "queue:inspection-import";
const JOB_TTL_SECONDS = 86400;
async function update(id, values) { const key = `inspection-import:${id}`; await redis.hset(key, values); await redis.expire(key, JOB_TTL_SECONDS); }

async function extractWithDocling(job) {
  const dir = await mkdtemp(join(tmpdir(), "apps-kes-docling-"));
  const inputPath = join(dir, job.fileName.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const scriptPath = join(dir, "convert.py");
  try {
    await writeFile(inputPath, Buffer.from(job.fileBase64, "base64"));
    await writeFile(scriptPath, `from docling.document_converter import DocumentConverter\nfrom docling.datamodel.settings import settings\nfrom pathlib import Path\nimport os,sys\nartifacts=os.environ.get("DOCLING_ARTIFACTS_PATH")\nif artifacts: settings.artifacts_path=Path(artifacts)\nprint(DocumentConverter().convert(sys.argv[1]).document.export_to_markdown())\n`);
    const { stdout } = await execFileAsync(process.env.DOCLING_PYTHON || "/opt/docling/bin/python", [scriptPath, inputPath], { timeout: Number(process.env.DOCLING_TIMEOUT_MS || 600000), maxBuffer: 20 * 1024 * 1024, env: { ...process.env, PYTHONUNBUFFERED: "1" } });
    return stdout || "";
  } finally { await rm(dir, { recursive: true, force: true }).catch(() => {}); await rm(job.tempPath, { force: true }).catch(() => {}); }
}

async function handleJob(job) {
  if (job.type !== "inspection-template-import") throw new Error(`unknown job type: ${job.type}`);
  try {
    await update(job.id, { status: "processing", progress: "15", message: "Menyiapkan ekstraksi Docling" });
    await update(job.id, { progress: "30", message: "Membaca dokumen dan struktur tabel dengan Docling" });
    const text = await extractWithDocling(job);
    if (!text.trim()) throw new Error("Docling tidak menghasilkan teks dari dokumen");
    await update(job.id, { progress: "80", message: "Menyusun butir pemeriksaan" });
    const result = normalizeInspectionTemplate(text, job.fileName);
    result.deskripsi = `${result.deskripsi} (${result.fields.length} butir, parser lokal, ekstraksi Docling)`;
    await update(job.id, { status: "complete", progress: "100", message: "Draft siap ditinjau", result: JSON.stringify(result), completedAt: new Date().toISOString() });
  } catch (error) {
    await update(job.id, { status: "failed", progress: "100", message: "Import gagal", error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
async function main() {
  console.log(`[worker] listening ${QUEUE_KEY}`);
  while (true) { const item = await redis.blpop(QUEUE_KEY, 5); if (!item) continue; try { await handleJob(JSON.parse(item[1])); } catch (error) { console.error("[worker] job failed", error); } }
}
process.on("SIGTERM", async () => { await redis.quit(); process.exit(0); });
main().catch((error) => { console.error("[worker] fatal", error); process.exit(1); });
