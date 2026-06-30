// test/dream.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldRunDream, runDream } from "../src/core/dream.mjs";
import { makeFakeClient } from "./helpers/fake-client.mjs";

const HOUR = 3600 * 1000;

test("shouldRunDream true when no watermark", () => {
  assert.equal(shouldRunDream(null, 1000, 24), true);
});
test("shouldRunDream false within min interval", () => {
  assert.equal(shouldRunDream({ lastRunAt: 0 }, 1 * HOUR, 24), false);
});
test("shouldRunDream true after min interval", () => {
  assert.equal(shouldRunDream({ lastRunAt: 0 }, 25 * HOUR, 24), true);
});

test("runDream builds memory task with safe_auto thresholds", async () => {
  const c = makeFakeClient({ createMemoryDreamTask: { dreamId: "d1", status: "queued" } });
  const scope = { appId: "a", tenantId: "t" };
  const r = await runDream(c, { storeName: "s", dream: { applyMode: "safe_auto", confidence: 0.9 } },
    { scopes: [scope], wait: false });
  const b = c.calls[0].body;
  assert.equal(b.memoryStoreName, "s");
  assert.deepEqual(b.scopes, [scope]);
  assert.equal(b.taskType, "memory");
  assert.equal(b.applyMode, "safe_auto");
  assert.equal(b.incremental, true);
  assert.deepEqual(b.confidenceThresholds, { add: 0.9, update: 0.9, merge: 0.9 });
  assert.equal(r.dreamId, "d1");
});

test("runDream wait polls until terminal", async () => {
  let n = 0;
  const c = makeFakeClient({
    createMemoryDreamTask: { dreamId: "d2", status: "queued" },
    getMemoryDreamTask: () => (++n >= 2
      ? { dreamId: "d2", status: "completed", actions: { total: 1, applied: 1 } }
      : { dreamId: "d2", status: "running" }),
  });
  const r = await runDream(c, { storeName: "s", dream: { applyMode: "safe_auto", confidence: 0.9 } },
    { scopes: [{ appId: "a", tenantId: "t" }], wait: true, pollIntervalMs: 1, pollTimeoutMs: 1000 });
  assert.equal(r.status, "completed");
  assert.equal(r.actions.applied, 1);
});
