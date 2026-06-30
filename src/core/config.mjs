// src/core/config.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const bool = (v, d) => v == null ? d : ["1", "true", "yes", "on"].includes(String(v).toLowerCase());
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const str = (v) => { const s = v == null ? "" : String(v).trim(); return s || undefined; };

export function loadFileConfig(home = os.homedir()) {
  try {
    const p = path.join(home, ".tablestore-memory", "config.json");
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch { return {}; }
}

// env 优先于 file。file 的键为去前缀的小驼峰（apiKey/endpoint/instance/...），可选。
export function resolveConfig(env = process.env, file = {}) {
  const pick = (envKey, fileKey) => str(env[envKey]) ?? str(file[fileKey]);
  const endpoint = pick("TABLESTORE_MEMORY_ENDPOINT", "endpoint");
  const instanceName = pick("TABLESTORE_MEMORY_INSTANCE", "instance");
  const apiKey = pick("TABLESTORE_MEMORY_API_KEY", "apiKey");
  const accessKeyId = pick("TABLESTORE_ACCESS_KEY_ID", "accessKeyId");
  const accessKeySecret = pick("TABLESTORE_ACCESS_KEY_SECRET", "accessKeySecret");

  if (!endpoint) return { ok: false, error: "missing endpoint (TABLESTORE_MEMORY_ENDPOINT)" };
  if (!instanceName) return { ok: false, error: "missing instance (TABLESTORE_MEMORY_INSTANCE)" };

  let auth;
  if (apiKey) {
    if (!/^https:\/\//i.test(endpoint)) return { ok: false, error: "apiKey mode requires an https endpoint" };
    auth = { apiKey };
  } else if (accessKeyId && accessKeySecret) {
    auth = { accessKeyId, accessKeySecret };
  } else {
    return { ok: false, error: "missing auth: set TABLESTORE_MEMORY_API_KEY or TABLESTORE_ACCESS_KEY_ID+SECRET" };
  }

  const config = {
    endpoint, instanceName, auth,
    storeName: pick("TABLESTORE_MEMORY_STORE_NAME", "storeName") ?? "claude_code_mem",
    storeDescription: pick("TABLESTORE_MEMORY_STORE_DESCRIPTION", "storeDescription") ?? "Claude Code long-term memory",
    appId: pick("TABLESTORE_MEMORY_APP_ID", "appId") ?? "claude-code",
    tenantId: pick("TABLESTORE_MEMORY_TENANT_ID", "tenantId"),
    agentId: pick("TABLESTORE_MEMORY_AGENT_ID", "agentId") ?? "claude-code",
    searchTopK: Math.max(1, Math.min(50, num(env.TABLESTORE_MEMORY_SEARCH_TOP_K ?? file.searchTopK, 5))),
    enableRerank: bool(env.TABLESTORE_MEMORY_ENABLE_RERANK ?? file.enableRerank, true),
    writebackEnabled: bool(env.TABLESTORE_MEMORY_WRITEBACK_ENABLED ?? file.writebackEnabled, true),
    includeScores: bool(env.TABLESTORE_MEMORY_INCLUDE_SCORES ?? file.includeScores, true),
    minQueryLength: Math.max(0, num(env.TABLESTORE_MEMORY_MIN_QUERY_LENGTH ?? file.minQueryLength, 6)),
    autoCreateStore: bool(env.TABLESTORE_MEMORY_AUTO_CREATE_STORE ?? file.autoCreateStore, true),
    dream: {
      enabled: bool(env.TABLESTORE_MEMORY_DREAM_ENABLED ?? file.dreamEnabled, true),
      applyMode: (pick("TABLESTORE_MEMORY_DREAM_APPLY_MODE", "dreamApplyMode") ?? "safe_auto") === "proposal" ? "proposal" : "safe_auto",
      confidence: Math.max(0, Math.min(1, num(env.TABLESTORE_MEMORY_DREAM_CONFIDENCE ?? file.dreamConfidence, 0.9))),
      maxScopes: Math.max(1, Math.min(20, num(env.TABLESTORE_MEMORY_DREAM_MAX_SCOPES ?? file.dreamMaxScopes, 20))),
      minIntervalHours: Math.max(0, num(env.TABLESTORE_MEMORY_DREAM_MIN_INTERVAL_HOURS ?? file.dreamMinIntervalHours, 24)),
    },
  };
  return { ok: true, config };
}
