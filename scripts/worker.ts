import { requireDatabase } from "../src/lib/db.ts";
import { runWorkerBatch } from "../src/lib/worker.ts";

const pollMs = Math.max(1000, Math.min(Number(process.env.SHWAI_WORKER_POLL_MS ?? 5000), 60000));
let stopping = false;

function stop() {
  stopping = true;
}

process.once("SIGTERM", stop);
process.once("SIGINT", stop);

async function run() {
  const sql = requireDatabase();
  console.log(JSON.stringify({ event: "worker_started", pollMs }));
  try {
    while (!stopping) {
      const result = await runWorkerBatch(sql, 20);
      if (result.claimed > 0) {
        console.log(JSON.stringify({ event: "worker_batch", ...result }));
      }
      if (result.claimed === 0) await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  } finally {
    await sql.end({ timeout: 5 });
    console.log(JSON.stringify({ event: "worker_stopped" }));
  }
}

run().catch((error) => {
  console.error(
    JSON.stringify({
      event: "worker_failed",
      message: error instanceof Error ? error.message.slice(0, 500) : "Worker failed",
    }),
  );
  process.exitCode = 1;
});
