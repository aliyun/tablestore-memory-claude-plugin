// src/hooks/retrieve.mjs
import fs from "node:fs";
import { resolveConfig, loadFileConfig } from "../core/config.mjs";
import { makeLogger } from "../core/log.mjs";
import { createClient } from "../core/client.mjs";
import { readScope } from "../core/scope.mjs";
import { ensureMemoryStore } from "../core/store.mjs";
import { searchMemories, formatResults } from "../core/search.mjs";
import { latestUserPrompt } from "../core/transcript.mjs";

function queryOf(input) {
  let q = (input.prompt ?? input.user_prompt ?? "").trim();
  if (!q && input.transcript_path) {
    try { q = latestUserPrompt(fs.readFileSync(input.transcript_path, "utf8")); } catch { /* ignore */ }
  }
  return q;
}

// 纯逻辑：注入 client/config，返回钩子输出对象或 null。
export async function runRetrieve(input, { client, config, logger = makeLogger() }) {
  const query = queryOf(input);
  if (!query || query.length < config.minQueryLength) return null;
  await ensureMemoryStore(client, config);
  const scope = readScope(config, {});
  const { results } = await searchMemories(client, config, { query, scope });
  if (!results.length) return null;
  logger.debug(`retrieved ${results.length} memories`);
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: formatResults(results, { includeScores: config.includeScores }),
    },
  };
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
    const out = await runRetrieve(input, { client, config, logger });
    if (out) process.stdout.write(JSON.stringify(out));
  } catch (e) {
    logger.warn(`retrieval failed: ${e?.message || e}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
