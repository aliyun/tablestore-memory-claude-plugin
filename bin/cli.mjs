// bin/cli.mjs
// 注：发布产物 dist/cli.mjs 由 esbuild 统一加 shebang；源文件不带，避免打包后重复。
import { parseArgs } from "node:util";
import { resolveConfig, loadFileConfig } from "../src/core/config.mjs";
import { makeLogger } from "../src/core/log.mjs";
import { createClient } from "../src/core/client.mjs";
import { readScope, writeScope } from "../src/core/scope.mjs";
import { ensureMemoryStore } from "../src/core/store.mjs";
import { searchMemories, formatResults } from "../src/core/search.mjs";
import { addMemories } from "../src/core/add.mjs";
import { runDream } from "../src/core/dream.mjs";

const RUN_ID = () => `cli-${process.pid}-${Math.floor(Date.now() / 1000)}`;

export async function cmdSearch(args, { client, config }) {
  await ensureMemoryStore(client, config);
  const scope = readScope(config, { uid: args.uid });
  const topK = args["top-k"] != null ? Number(args["top-k"]) : config.searchTopK;
  const cfg = { ...config, enableRerank: args["no-rerank"] ? false : config.enableRerank };
  const { results } = await searchMemories(client, cfg, { query: args._[0] ?? "", scope, topK });
  return { results, text: formatResults(results, { includeScores: config.includeScores }) };
}

export async function cmdAdd(args, { client, config }) {
  await ensureMemoryStore(client, config);
  const scope = writeScope(config, { sessionId: RUN_ID(), uid: args.uid });
  await addMemories(client, config, { text: args._[0] ?? "", scope, sync: !!args.sync });
  return { ok: true, scope };
}

export async function cmdDoctor(args, { client, config }) {
  const result = { ok: false, endpoint: config.endpoint, instanceName: config.instanceName, store: null, sample: [] };
  await ensureMemoryStore(client, config);
  result.store = await client.getMemoryStore({ memoryStoreName: config.storeName });
  const scope = readScope(config, { uid: args.uid });
  const list = await client.listMemories({ memoryStoreName: config.storeName, scope, limit: 3 });
  result.sample = list?.memories ?? list?.results ?? [];
  result.ok = true;
  return result;
}

export async function cmdDream(args, { client, config }) {
  await ensureMemoryStore(client, config);
  // 整租户整理：通配 agentId/runId，服务端展开到该租户下所有具体 scope。
  const tenantScope = readScope(config, { uid: args.uid });
  return runDream(client, config, {
    scopes: [tenantScope],
    applyMode: args["apply-mode"],
    wait: !!args.wait,
  });
}

const COMMANDS = { search: cmdSearch, add: cmdAdd, doctor: cmdDoctor, dream: cmdDream };

export async function main(argv = process.argv.slice(2)) {
  const logger = makeLogger("tablestore-memory-cli");
  const [cmd, ...rest] = argv;
  if (!cmd || !COMMANDS[cmd]) {
    process.stderr.write("usage: tablestore-memory <search|add|doctor|dream> [args]\n");
    process.exit(cmd ? 1 : 0);
  }
  const { values, positionals } = parseArgs({
    args: rest, allowPositionals: true,
    options: {
      uid: { type: "string" }, "top-k": { type: "string" }, "no-rerank": { type: "boolean" },
      sync: { type: "boolean" }, "apply-mode": { type: "string" }, wait: { type: "boolean" },
      quiet: { type: "boolean", short: "q" },
    },
  });
  const { ok, config, error } = resolveConfig(process.env, loadFileConfig());
  if (!ok) { process.stderr.write(`config error: ${error}\n`); process.exit(2); }
  try {
    const client = await createClient(config);
    const out = await COMMANDS[cmd]({ ...values, _: positionals }, { client, config });
    process.stdout.write(JSON.stringify(values.quiet ? (out.results ?? out) : out, null, 2) + "\n");
  } catch (e) {
    logger.error(`${cmd} failed: ${e?.message || e}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
