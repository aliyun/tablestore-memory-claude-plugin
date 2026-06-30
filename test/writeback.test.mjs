// test/writeback.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runWriteback } from "../src/hooks/writeback.mjs";
import { makeFakeClient } from "./helpers/fake-client.mjs";
import { getCursor } from "../src/core/state.mjs";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "tsm-wb-")); }
const L = (role, content) => JSON.stringify({ type: role, message: { role, content } });
const config = { storeName: "s", appId: "a", tenantId: "t", agentId: "g", writebackEnabled: true, autoCreateStore: true };

test("writes new messages and advances cursor", async () => {
  const dir = tmp();
  const tp = path.join(dir, "t.jsonl");
  fs.writeFileSync(tp, [L("user", "hello"), L("assistant", "hi there")].join("\n"));
  const client = makeFakeClient({ getMemoryStore: {}, addMemories: {} });
  await runWriteback({ session_id: "s1", transcript_path: tp }, { client, config, stateDir: dir });
  const add = client.calls.find(c => c.name === "addMemories");
  assert.equal(add.body.messages.length, 2);
  assert.equal(add.body.scope.runId, "s1");
  assert.equal(add.body.scope.agentId, "g");
  assert.equal(getCursor(dir, "s1"), 2);
});

test("second run with no new messages does not write", async () => {
  const dir = tmp();
  const tp = path.join(dir, "t.jsonl");
  fs.writeFileSync(tp, [L("user", "hello"), L("assistant", "hi")].join("\n"));
  const client = makeFakeClient({ getMemoryStore: {}, addMemories: {} });
  await runWriteback({ session_id: "s1", transcript_path: tp }, { client, config, stateDir: dir });
  client.calls.length = 0;
  await runWriteback({ session_id: "s1", transcript_path: tp }, { client, config, stateDir: dir });
  assert.ok(!client.calls.some(c => c.name === "addMemories"));
});

test("disabled writeback is a no-op", async () => {
  const dir = tmp();
  const client = makeFakeClient({});
  await runWriteback({ session_id: "s1", transcript_path: "/nope" },
    { client, config: { ...config, writebackEnabled: false }, stateDir: dir });
  assert.equal(client.calls.length, 0);
});
