// test/mcp.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createToolHandlers } from "../src/mcp/server.mjs";
import { makeFakeClient } from "./helpers/fake-client.mjs";

const config = { storeName: "s", appId: "a", tenantId: "t", agentId: "g",
  searchTopK: 5, enableRerank: true, includeScores: true, autoCreateStore: true,
  dream: { applyMode: "safe_auto", confidence: 0.9 } };

test("search_memory returns formatted text", async () => {
  const client = makeFakeClient({ getMemoryStore: {}, searchMemories: { results: [{ unit: { text: "tea" }, score: 1 }] } });
  const h = createToolHandlers({ client, config });
  const res = await h.search_memory({ query: "drink" });
  assert.match(res.content[0].text, /tea/);
  assert.equal(client.calls.find(c => c.name === "searchMemories").body.scope.agentId, "*");
});

test("add_memory writes text", async () => {
  const client = makeFakeClient({ getMemoryStore: {}, addMemories: {} });
  const h = createToolHandlers({ client, config });
  const res = await h.add_memory({ text: "I like tea" });
  assert.match(res.content[0].text, /ok|added|saved/i);
  assert.equal(client.calls.find(c => c.name === "addMemories").body.text, "I like tea");
});

test("consolidate_memory creates dream task", async () => {
  const client = makeFakeClient({ getMemoryStore: {}, createMemoryDreamTask: { dreamId: "d1", status: "queued" } });
  const h = createToolHandlers({ client, config });
  const res = await h.consolidate_memory({});
  assert.match(res.content[0].text, /d1/);
});
