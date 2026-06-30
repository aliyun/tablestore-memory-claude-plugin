// src/hooks/writeback.mjs
import fs from "node:fs";
import { resolveConfig, loadFileConfig } from "../core/config.mjs";
import { makeLogger } from "../core/log.mjs";
import { createClient } from "../core/client.mjs";
import { writeScope } from "../core/scope.mjs";
import { ensureMemoryStore } from "../core/store.mjs";
import { addMemories } from "../core/add.mjs";
import { readNewMessages } from "../core/transcript.mjs";
import { stateDir as defaultStateDir, getCursor, setCursor } from "../core/state.mjs";

export async function runWriteback(input, { client, config, logger = makeLogger(), stateDir }) {
  if (!config.writebackEnabled) return;
  const dir = stateDir ?? defaultStateDir();
  const sessionId = String(input.session_id ?? "").trim() || "__default__";
  let jsonl = "";
  try { jsonl = fs.readFileSync(input.transcript_path, "utf8"); }
  catch (e) { logger.warn(`cannot read transcript: ${e?.message || e}`); return; }

  const cursor = getCursor(dir, sessionId);
  const { messages, newCursor, reset } = readNewMessages(jsonl, cursor);
  if (reset) { setCursor(dir, sessionId, newCursor); return; }
  if (!messages.length) { setCursor(dir, sessionId, newCursor); return; }

  await ensureMemoryStore(client, config);
  const scope = writeScope(config, { sessionId });
  await addMemories(client, config, { messages, scope, sync: false });
  setCursor(dir, sessionId, newCursor);
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
    await runWriteback(input, { client, config, logger });
  } catch (e) {
    logger.warn(`writeback failed: ${e?.message || e}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
