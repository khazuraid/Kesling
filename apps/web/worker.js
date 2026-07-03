const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
});

const QUEUE_KEY = process.env.HEAVY_QUEUE_KEY || "queue:heavy";

async function handleJob(job) {
  switch (job.type) {
    case "noop":
      console.log(`[worker] noop ${job.id || ""}`);
      return;
    default:
      console.warn(`[worker] unknown job type: ${job.type}`);
  }
}

async function main() {
  console.log(`[worker] listening ${QUEUE_KEY}`);
  while (true) {
    const item = await redis.blpop(QUEUE_KEY, 5);
    if (!item) continue;
    const [, raw] = item;
    try {
      await handleJob(JSON.parse(raw));
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
