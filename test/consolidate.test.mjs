// test/consolidate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runConsolidate } from "../src/hooks/consolidate.mjs";
import { makeFakeClient } from "./helpers/fake-client.mjs";
import { getDreamWatermark } from "../src/core/state.mjs";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "tsm-dr-")); }
const config = { storeName: "s", appId: "a", tenantId: "t", agentId: "g",
  dream: { enabled: true, applyMode: "safe_auto", confidence: 0.9, minIntervalHours: 24 } };

test("creates dream task and records watermark", async () => {
  const dir = tmp();
  const client = makeFakeClient({ createMemoryDreamTask: { dreamId: "d1", status: "queued" } });
  await runConsolidate({ session_id: "s1" }, { client, config, stateDir: dir, nowMs: 1000 });
  const b = client.calls.find(c => c.name === "createMemoryDreamTask").body;
  assert.equal(b.taskType, "memory");
  assert.deepEqual(b.scopes, [{ appId: "a", tenantId: "t", agentId: "*", runId: "*" }]);
  assert.equal(getDreamWatermark(dir, "a\tt").dreamId, "d1");
});

test("throttled within min interval", async () => {
  const dir = tmp();
  const client = makeFakeClient({ createMemoryDreamTask: { dreamId: "d1" } });
  await runConsolidate({ session_id: "s1" }, { client, config, stateDir: dir, nowMs: 0 });
  client.calls.length = 0;
  await runConsolidate({ session_id: "s1" }, { client, config, stateDir: dir, nowMs: 3600 * 1000 });
  assert.equal(client.calls.length, 0);
});

test("dream disabled is a no-op", async () => {
  const dir = tmp();
  const client = makeFakeClient({});
  await runConsolidate({ session_id: "s1" },
    { client, config: { ...config, dream: { ...config.dream, enabled: false } }, stateDir: dir, nowMs: 0 });
  assert.equal(client.calls.length, 0);
});
