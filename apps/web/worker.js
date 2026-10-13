const { execFile } = require("node:child_process");
const { readFile, rm, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { promisify } = require("node:util");
const Redis = require("ioredis");

const execFileAsync = promisify(execFile);
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});
const QUEUE_KEY = "queue:inspection-import";
const JOB_TTL_SECONDS = 86400;
const MAX_ATTEMPTS = Number(process.env.IMPORT_MAX_ATTEMPTS || 3);
// Hybrid mode ≈ 31x slower than Java-only per benchmark; give it headroom.
const SECONDS_PER_PAGE = Number(process.env.HYBRID_SECONDS_PER_PAGE || 20);
const MAX_TIMEOUT_MS = Number(process.env.HYBRID_MAX_TIMEOUT_MS || 1800000);

async function update(id, values) {
  const key = `inspection-import:${id}`;
  await redis.hset(key, values);
  await redis.expire(key, JOB_TTL_SECONDS);
}

// Rough page count from PDF trailer (fast heuristic; DOCX falls back to file size).
function estimatePages(buffer, fileName) {
  if (!/\.pdf$/i.test(fileName)) return Math.max(1, Math.ceil(buffer.length / 200000));
  const matches = buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : Math.max(1, Math.ceil(buffer.length / 200000));
}

async function extract(job, dir) {
  // opendataloader-pdf CLI needs a real file; write base64 payload to disk.
  const inputPath = join(dir, job.fileName.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const mdPath = `${inputPath}.md`;
  await writeFile(inputPath, Buffer.from(job.fileBase64, "base64"));
  // CLI writes <input>.md next to input; --hybrid-fallback opts in to Java fallback if backend fails.
  const args = ["--format", "markdown", "--output-dir", dir];
  if (process.env.HYBRID_URL) {
    const mode = process.env.HYBRID_MODE || "auto";
    args.push(
      "--hybrid",
      "docling-fast",
      "--hybrid-url",
      process.env.HYBRID_URL,
      "--hybrid-mode",
      mode,
      "--hybrid-fallback",
    );
  }
  const pages = estimatePages(Buffer.from(job.fileBase64, "base64"), job.fileName);
  const timeout =
    Math.min(
      MAX_TIMEOUT_MS,
      Math.max(Number(process.env.HYBRID_MIN_TIMEOUT_MS || 120000), pages * SECONDS_PER_PAGE * 1000),
    ) + 60000;
  const { execPath, nodeArgs } = getRunnerArgs();
  await execFileAsync(execPath, [...nodeArgs, ...args, inputPath], {
    timeout,
    maxBuffer: 20 * 1024 * 1024,
    cwd: dir,
    env: process.env,
  });
  return readFile(mdPath, "utf8");
}

// @opendataloader/pdf is optional at runtime: resolve its CLI once, fall back to npx.
function getRunnerArgs() {
  try {
    const pkg = require.resolve("@opendataloader/pdf/package.json", { paths: [__dirname] });
    const bin = require("node:path").join(
      require("node:path").dirname(pkg),
      require(pkg).bin["opendataloader-pdf"] || "cli.js",
    );
    return { execPath: process.execPath, nodeArgs: [bin] };
  } catch {
    return { execPath: "npx", nodeArgs: ["-y", "@opendataloader/pdf"] };
  }
}

async function extractWithOpendataloader(job) {
  const dir = await require("node:fs/promises").mkdtemp(join(tmpdir(), "apps-kes-odl-"));
  try {
    const text = await extract(job, dir);
    if (!text.trim()) throw new Error("opendataloader-pdf tidak menghasilkan teks dari dokumen");
    return text;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    await rm(job.tempPath, { force: true }).catch(() => {});
  }
}

async function handleJob(job) {
  if (job.type !== "inspection-template-import") throw new Error(`unknown job type: ${job.type}`);
  const attempt = Number(job.attempt || 1);
  await update(job.id, {
    status: "processing",
    progress: "15",
    message: `Menyiapkan ekstraksi (percobaan ${attempt}/${MAX_ATTEMPTS})`,
  });
  try {
    await update(job.id, { progress: "30", message: "Membaca dokumen dan struktur tabel (hybrid)" });
    const text = await extractWithOpendataloader(job);
    await update(job.id, { progress: "80", message: "Menyusun butir pemeriksaan" });
    const result = normalizeInspectionTemplate(text, job.fileName);
    result.deskripsi = `${result.deskripsi} (${result.fields.length} butir, ekstraksi opendataloader-pdf hybrid)`;
    await update(job.id, {
      status: "complete",
      progress: "100",
      message: "Draft siap ditinjau",
      result: JSON.stringify(result),
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    const retryable = attempt < MAX_ATTEMPTS;
    if (retryable) {
      const delayMs = Math.min(30000, 2000 * 2 ** attempt);
      await update(job.id, {
        message: `Gagal, ulangi dalam ${Math.round(delayMs / 1000)}s`,
        error: error instanceof Error ? error.message : String(error),
      });
      await new Promise((r) => setTimeout(r, delayMs));
      await redis.rpush(QUEUE_KEY, JSON.stringify({ ...job, attempt: attempt + 1 }));
      return;
    }
    await update(job.id, {
      status: "failed",
      progress: "100",
      message: "Import gagal",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function main() {
  console.log(`[worker] listening ${QUEUE_KEY} (opendataloader-pdf hybrid=${process.env.HYBRID_URL || "off"})`);
  while (true) {
    const item = await redis.blpop(QUEUE_KEY, 5);
    if (!item) continue;
    try {
      await handleJob(JSON.parse(item[1]));
    } catch (error) {
      console.error("[worker] job failed", error);
    }
  }
}
process.on("SIGTERM", async () => {
  await redis.quit();
  process.exit(0);
});
main().catch((error) => {
  console.error("[worker] fatal", error);
  process.exit(1);
});
