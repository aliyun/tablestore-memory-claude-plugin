// src/hooks/consolidate.mjs
import { resolveConfig, loadFileConfig } from "../core/config.mjs";
import { makeLogger } from "../core/log.mjs";
import { createClient } from "../core/client.mjs";
import { ensureMemoryStore } from "../core/store.mjs";
import { readScope, scopeKey } from "../core/scope.mjs";
import { shouldRunDream, runDream } from "../core/dream.mjs";
import { stateDir as defaultStateDir, getDreamWatermark, setDreamWatermark } from "../core/state.mjs";

export async function runConsolidate(_input, { client, config, logger = makeLogger(), stateDir, nowMs = Date.now() }) {
  if (!config.dream.enabled) return;
  const dir = stateDir ?? defaultStateDir();
  // 整租户整理：用通配 agentId/runId，让服务展开到该租户下所有具体 scope（写入是写窄的）。
  const tenantScope = readScope(config, {});
  const key = scopeKey(tenantScope);

  if (!shouldRunDream(getDreamWatermark(dir, key), nowMs, config.dream.minIntervalHours)) {
    logger.debug(`dream throttled for ${key}`);
    return;
  }
  await ensureMemoryStore(client, config);
  const res = await runDream(client, config, { scopes: [tenantScope], wait: false });
  setDreamWatermark(dir, key, { lastRunAt: nowMs, dreamId: res?.dreamId });
  logger.debug(`dream queued dreamId=${res?.dreamId} scope=${key}`);
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data || "{}"));
  });
}

export async function main() {
  const logger = makeLogger();
  try {
    const input = JSON.parse(await readStdin());
    const { ok, config, error } = resolveConfig(process.env, loadFileConfig());
    if (!ok) { logger.debug(`disabled: ${error}`); return; }
    const client = await createClient(config);
    await runConsolidate(input, { client, config, logger });
  } catch (e) {
    logger.warn(`consolidate failed: ${e?.message || e}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
