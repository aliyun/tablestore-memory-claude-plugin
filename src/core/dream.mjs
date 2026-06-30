// src/core/dream.mjs
const TERMINAL = new Set(["completed", "completed_with_failures", "failed", "cancelled"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function shouldRunDream(watermark, nowMs, minIntervalHours) {
  if (!watermark || typeof watermark.lastRunAt !== "number") return true;
  return nowMs - watermark.lastRunAt >= minIntervalHours * 3600 * 1000;
}

export async function runDream(client, config, {
  scopes, applyMode, wait = false, pollIntervalMs = 3000, pollTimeoutMs = 60000,
}) {
  const mode = applyMode ?? config.dream.applyMode;
  const conf = config.dream.confidence;
  const created = await client.createMemoryDreamTask({
    memoryStoreName: config.storeName,
    scopes,
    taskType: "memory",
    applyMode: mode,
    incremental: true,
    ...(mode === "safe_auto" ? { confidenceThresholds: { add: conf, update: conf, merge: conf } } : {}),
  });
  const dreamId = created?.dreamId;
  if (!wait || !dreamId) return created;

  const deadline = Date.now() + pollTimeoutMs;
  let last = created;
  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);
    try {
      last = await client.getMemoryDreamTask({ memoryStoreName: config.storeName, dreamId });
      if (TERMINAL.has(last?.status)) break;
    } catch { /* 409 index building 等：忽略后重试 */ }
  }
  return last;
}
