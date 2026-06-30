// src/mcp/server.mjs
import { resolveConfig, loadFileConfig } from "../core/config.mjs";
import { makeLogger } from "../core/log.mjs";
import { createClient } from "../core/client.mjs";
import { readScope, writeScope } from "../core/scope.mjs";
import { ensureMemoryStore } from "../core/store.mjs";
import { searchMemories, formatResults } from "../core/search.mjs";
import { addMemories } from "../core/add.mjs";
import { runDream } from "../core/dream.mjs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const text = (t) => ({ content: [{ type: "text", text: t }] });
const RUN_ID = () => `mcp-${process.pid}-${Math.floor(Date.now() / 1000)}`;

// 纯逻辑工具处理器，便于单测；MCP 传输层在 main() 中接线。
export function createToolHandlers({ client, config }) {
  return {
    async search_memory(args) {
      await ensureMemoryStore(client, config);
      const scope = readScope(config, { uid: args.tenantId });
      if (args.agentId) scope.agentId = args.agentId;
      if (args.runId) scope.runId = args.runId;
      const { results } = await searchMemories(client, config, { query: args.query ?? "", scope, topK: args.topK });
      return text(results.length ? formatResults(results, { includeScores: config.includeScores }) : "No relevant memories found.");
    },
    async add_memory(args) {
      await ensureMemoryStore(client, config);
      const scope = writeScope(config, { sessionId: args.runId ?? RUN_ID(), uid: args.tenantId });
      if (args.agentId) scope.agentId = args.agentId;
      await addMemories(client, config, { text: args.text, messages: args.messages, scope, sync: !!args.sync });
      return text("ok: memory saved");
    },
    async consolidate_memory(args) {
      await ensureMemoryStore(client, config);
      // 整租户整理：通配 agentId/runId，服务端展开到该租户下所有具体 scope。
      const scope = readScope(config, { uid: args.tenantId });
      const res = await runDream(client, config, {
        scopes: [scope],
        applyMode: args.applyMode, wait: !!args.wait,
      });
      return text(`dream started: dreamId=${res?.dreamId} status=${res?.status ?? "queued"}`);
    },
  };
}

// 把纯逻辑 handler 包一层：捕获异常并转成 MCP 错误结果，避免抛出中断会话。
function guard(fn) {
  return async (args) => {
    try { return await fn(args ?? {}); }
    catch (e) { return { content: [{ type: "text", text: `error: ${e?.message || e}` }], isError: true }; }
  };
}

export async function main() {
  const logger = makeLogger("tablestore-memory-mcp");
  const { ok, config, error } = resolveConfig(process.env, loadFileConfig());
  if (!ok) { logger.error(`config error: ${error}`); process.exit(2); }

  const client = await createClient(config);
  const handlers = createToolHandlers({ client, config });
  const server = new McpServer({ name: "tablestore-memory", version: "0.1.0" });

  server.registerTool("search_memory", {
    description: "Search long-term memories by natural-language query.",
    inputSchema: {
      query: z.string().describe("natural-language query"),
      topK: z.number().optional(),
      tenantId: z.string().optional(),
      agentId: z.string().optional(),
      runId: z.string().optional(),
    },
  }, guard(handlers.search_memory));

  server.registerTool("add_memory", {
    description: "Save a memory (text or messages) for later recall.",
    inputSchema: {
      text: z.string().optional().describe("preprocessed memory text"),
      messages: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
      sync: z.boolean().optional(),
      tenantId: z.string().optional(),
      agentId: z.string().optional(),
      runId: z.string().optional(),
    },
  }, guard(handlers.add_memory));

  server.registerTool("consolidate_memory", {
    description: "Run offline Dream consolidation for the current tenant.",
    inputSchema: {
      applyMode: z.enum(["proposal", "safe_auto"]).optional(),
      wait: z.boolean().optional(),
      tenantId: z.string().optional(),
    },
  }, guard(handlers.consolidate_memory));

  await server.connect(new StdioServerTransport());
  logger.debug("mcp server connected");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
