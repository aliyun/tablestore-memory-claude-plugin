// test/add.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkMessages, addMemories } from "../src/core/add.mjs";
import { makeFakeClient } from "./helpers/fake-client.mjs";

test("chunk by count (<=20)", () => {
  const msgs = Array.from({ length: 45 }, (_, i) => ({ role: "user", content: "x" + i }));
  const batches = chunkMessages(msgs, 20, 32000);
  assert.deepEqual(batches.map(b => b.length), [20, 20, 5]);
});

test("chunk by bytes", () => {
  const big = "a".repeat(20000);
  const msgs = [{ role: "user", content: big }, { role: "user", content: big }, { role: "user", content: big }];
  const batches = chunkMessages(msgs, 20, 32000);
  assert.equal(batches.length, 3);
});

test("addMemories text writes with concrete scope and sync flag", async () => {
  const c = makeFakeClient({ addMemories: {} });
  const scope = { appId: "a", tenantId: "t", agentId: "g", runId: "r" };
  await addMemories(c, { storeName: "s" }, { text: "hi", scope, sync: true });
  const b = c.calls[0].body;
  assert.equal(b.memoryStoreName, "s");
  assert.equal(b.text, "hi");
  assert.equal(b.sync, true);
  assert.deepEqual(b.scope, scope);
});

test("addMemories messages chunked into multiple calls", async () => {
  const c = makeFakeClient({ addMemories: {} });
  const messages = Array.from({ length: 25 }, (_, i) => ({ role: "user", content: "m" + i }));
  const scope = { appId: "a", tenantId: "t", agentId: "g", runId: "r" };
  await addMemories(c, { storeName: "s" }, { messages, scope });
  assert.equal(c.calls.length, 2);
  assert.equal(c.calls[0].body.sync, false);
});
