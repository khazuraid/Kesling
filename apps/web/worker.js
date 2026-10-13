const { spawn } = require("node:child_process");
const { readdir, readFile, rm, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const Redis = require("ioredis");
const { normalizeInspectionTemplate } = require("./inspection-import-parser");

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});
const QUEUE_KEY = "queue:inspection-import";
const ACTIVE_KEY = "inspection-import:active";
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

async function addLog(id, message, level = "info") {
  const timestamp = new Date().toLocaleTimeString("id-ID", { hour12: false });
  const entry = JSON.stringify({ timestamp, level, message });
  await redis.rpush(`inspection-import:${id}:logs`, entry);
  await redis.expire(`inspection-import:${id}:logs`, JOB_TTL_SECONDS);
  await redis.hset(`inspection-import:${id}`, { message, lastUpdated: new Date().toISOString() });
}

// Rough page count from PDF trailer (fast heuristic; DOCX falls back to file size).
function estimatePages(buffer, fileName) {
  if (!/\.pdf$/i.test(fileName)) return Math.max(1, Math.ceil(buffer.length / 200000));
  const matches = buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : Math.max(1, Math.ceil(buffer.length / 200000));
}

function runStreamingCommand(execPath, args, options, onLog) {
  return new Promise((resolve, reject) => {
    const child = spawn(execPath, args, options);
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      const lines = data.toString().split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) onLog(trimmed, "info");
      }
    });

    child.stderr.on("data", (data) => {
      const text = data.toString();
      errorOutput += text;
      const lines = text.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) onLog(trimmed, "warn");
      }
    });

    const timeoutMs = options.timeout || 120000;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Process exited with code ${code}: ${errorOutput.slice(-500)}`));
    });
  });
}

async function extract(job, dir) {
  // opendataloader-pdf CLI needs a real file; write base64 payload to disk.
  const inputPath = join(dir, job.fileName.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const mdPath = `${inputPath}.md`;
  const fileBuffer = Buffer.from(job.fileBase64, "base64");
  await writeFile(inputPath, fileBuffer);
  await addLog(job.id, `File berhasil ditulis ke temp: ${job.fileName} (${(fileBuffer.length / 1024).toFixed(1)} KB)`);

  const pages = estimatePages(fileBuffer, job.fileName);
  await addLog(job.id, `Estimasi dokumen: ${pages} halaman`);

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
    await addLog(job.id, `Engine hybrid aktif: mode=${mode}, url=${process.env.HYBRID_URL}`);
  } else {
    await addLog(job.id, "Engine hybrid tidak aktif, menggunakan parser PDF Java bawaan");
  }

  const timeout =
    Math.min(
      MAX_TIMEOUT_MS,
      Math.max(Number(process.env.HYBRID_MIN_TIMEOUT_MS || 120000), pages * SECONDS_PER_PAGE * 1000),
    ) + 60000;

  const { execPath, nodeArgs } = getRunnerArgs();
  await addLog(job.id, "Menjalankan ekstraktor opendataloader-pdf...");

  await runStreamingCommand(
    execPath,
    [...nodeArgs, ...args, inputPath],
    {
      timeout,
      cwd: dir,
      env: {
        ...process.env,
        OMP_NUM_THREADS: "1",
        MKL_NUM_THREADS: "1",
        TORCH_NUM_THREADS: "1",
      },
    },
    (line, level) => {
      // Filter out overly noisy progress bars, keep informative logs
      if (line.includes("%") && line.length < 30) return;
      addLog(job.id, `[cli] ${line}`, level);
    },
  );

  await addLog(job.id, "Ekstraksi dokumen ke Markdown selesai");
  const dirFiles = await readdir(dir);
  const foundMd = dirFiles.find((f) => f.endsWith(".md"));
  const targetMdPath = foundMd ? join(dir, foundMd) : mdPath;
  return readFile(targetMdPath, "utf8");
}

// @opendataloader/pdf is optional at runtime: resolve its CLI once, fall back to npx.
function getRunnerArgs() {
  try {
    const pkg = require.resolve("@opendataloader/pdf/package.json", { paths: [__dirname, "/app", process.cwd()] });
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
  await redis.set(ACTIVE_KEY, job.id);

  await update(job.id, {
    status: "processing",
    progress: "15",
    message: `Menyiapkan ekstraksi (percobaan ${attempt}/${MAX_ATTEMPTS})`,
  });
  await addLog(job.id, `Mulai memproses job ${job.id} (percobaan ${attempt}/${MAX_ATTEMPTS})`);

  try {
    await update(job.id, { progress: "30", message: "Membaca dokumen dan struktur tabel (hybrid)" });
    await addLog(job.id, "Menganalisis tata letak tabel dan sel OCR...");
    const text = await extractWithOpendataloader(job);

    await update(job.id, { progress: "80", message: "Menyusun butir pemeriksaan" });
    await addLog(job.id, "Mem-parsing tabel Markdown ke butir pemeriksaan...");

    const result = normalizeInspectionTemplate(text, job.fileName);
    result.deskripsi = `${result.deskripsi} (${result.fields.length} butir, ekstraksi opendataloader-pdf hybrid)`;

    const grupCount = new Set((result.fields || []).map((f) => f.grup || "Umum")).size;
    await addLog(
      job.id,
      `Berhasil mengekstrak ${result.fields.length} butir pemeriksaan dalam ${grupCount} grup`,
      "success",
    );

    await update(job.id, {
      status: "complete",
      progress: "100",
      message: "Draft siap ditinjau",
      result: JSON.stringify(result),
      completedAt: new Date().toISOString(),
    });
    await addLog(job.id, "Pemrosesan selesai. Draft template siap ditinjau.", "success");
  } catch (error) {
    const retryable = attempt < MAX_ATTEMPTS;
    const errMsg = error instanceof Error ? error.message : String(error);
    await addLog(job.id, `Terjadi kesalahan: ${errMsg}`, "error");

    if (retryable) {
      const delayMs = Math.min(30000, 2000 * 2 ** attempt);
      await update(job.id, {
        message: `Gagal, ulangi dalam ${Math.round(delayMs / 1000)}s`,
        error: errMsg,
      });
      await addLog(job.id, `Menjadwalkan retry dalam ${Math.round(delayMs / 1000)} detik...`, "warn");
      await new Promise((r) => setTimeout(r, delayMs));
      await redis.rpush(QUEUE_KEY, JSON.stringify({ ...job, attempt: attempt + 1 }));
      return;
    }
    await update(job.id, {
      status: "failed",
      progress: "100",
      message: "Import gagal",
      error: errMsg,
    });
    await addLog(job.id, `Import gagal permanen setelah ${MAX_ATTEMPTS} percobaan`, "error");
    throw error;
  } finally {
    await redis.del(ACTIVE_KEY);
  }
}

async function main() {
  await redis.del(ACTIVE_KEY).catch(() => {});
  console.log(`[worker] listening ${QUEUE_KEY} (opendataloader-pdf hybrid=${process.env.HYBRID_URL || "off"})`);
  while (true) {
    const item = await redis.blpop(QUEUE_KEY, 5);
    if (!item) continue;
    try {
      console.log(`[worker] picked up item from queue`);
      await handleJob(JSON.parse(item[1]));
    } catch (error) {
      console.error("[worker] job failed", error);
    }
  }
}
process.on("SIGTERM", async () => {
  await redis.del(ACTIVE_KEY).catch(() => {});
  await redis.quit();
  process.exit(0);
});
main().catch((error) => {
  console.error("[worker] fatal", error);
  process.exit(1);
});
