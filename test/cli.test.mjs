// test/cli.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { cmdSearch, cmdAdd, cmdDoctor, cmdDream } from "../bin/cli.mjs";
import { makeFakeClient } from "./helpers/fake-client.mjs";

const config = { storeName: "s", appId: "a", tenantId: "t", agentId: "g",
  searchTopK: 5, enableRerank: true, includeScores: true, autoCreateStore: true,
  dream: { applyMode: "safe_auto", confidence: 0.9 } };

test("cmdSearch returns results with read scope", async () => {
  const client = makeFakeClient({ getMemoryStore: {}, searchMemories: { results: [{ unit: { text: "x" }, score: 1 }] } });
  const out = await cmdSearch({ _: ["hello world"], "top-k": 3 }, { client, config });
  assert.equal(out.results.length, 1);
  const b = client.calls.find(c => c.name === "searchMemories").body;
  assert.equal(b.topK, 3);
  assert.equal(b.scope.agentId, "*");
});

test("cmdAdd writes text with concrete scope and uid override", async () => {
  const client = makeFakeClient({ getMemoryStore: {}, addMemories: {} });
  await cmdAdd({ _: ["alice likes tea"], uid: "alice", sync: true }, { client, config });
  const b = client.calls.find(c => c.name === "addMemories").body;
  assert.equal(b.text, "alice likes tea");
  assert.equal(b.sync, true);
  assert.equal(b.scope.tenantId, "alice");
  assert.ok(b.scope.runId && b.scope.runId !== "*");
});

test("cmdDoctor reports endpoint and store", async () => {
  const client = makeFakeClient({ getMemoryStore: { memoryStoreName: "s" }, listMemories: { memories: [] } });
  const out = await cmdDoctor({}, { client, config: { ...config, endpoint: "https://i", instanceName: "i" } });
  assert.equal(out.ok, true);
  assert.equal(out.store.memoryStoreName, "s");
});

test("cmdDream creates task for tenant scope", async () => {
  const client = makeFakeClient({ getMemoryStore: {}, createMemoryDreamTask: { dreamId: "d1", status: "queued" } });
  const out = await cmdDream({ uid: "alice" }, { client, config });
  assert.equal(out.dreamId, "d1");
  assert.deepEqual(client.calls.find(c => c.name === "createMemoryDreamTask").body.scopes, [{ appId: "a", tenantId: "alice", agentId: "*", runId: "*" }]);
});
