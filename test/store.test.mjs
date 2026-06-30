// test/store.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureMemoryStore } from "../src/core/store.mjs";
import { makeFakeClient } from "./helpers/fake-client.mjs";

const cfg = { storeName: "s", storeDescription: "d", autoCreateStore: true };

test("existing store: no create", async () => {
  const c = makeFakeClient({ getMemoryStore: { memoryStoreName: "s" } });
  await ensureMemoryStore(c, cfg, { ensured: new Set() });
  assert.ok(!c.calls.some(x => x.name === "createMemoryStore"));
});

test("missing store: creates when autoCreate", async () => {
  const notFound = Object.assign(new Error("not found"), { code: "OTSObjectNotExist" });
  const c = makeFakeClient({ getMemoryStore: notFound, createMemoryStore: {} });
  await ensureMemoryStore(c, cfg, { ensured: new Set() });
  const create = c.calls.find(x => x.name === "createMemoryStore");
  assert.ok(create);
  assert.equal(create.body.memoryStoreName, "s");
});

test("ensured cache skips repeat work", async () => {
  const c = makeFakeClient({ getMemoryStore: { memoryStoreName: "s" } });
  const ensured = new Set();
  await ensureMemoryStore(c, cfg, { ensured });
  await ensureMemoryStore(c, cfg, { ensured });
  assert.equal(c.calls.filter(x => x.name === "getMemoryStore").length, 1);
});

test("autoCreate=false: missing store throws", async () => {
  const notFound = Object.assign(new Error("not found"), { code: "OTSObjectNotExist" });
  const c = makeFakeClient({ getMemoryStore: notFound });
  await assert.rejects(() => ensureMemoryStore(c, { ...cfg, autoCreateStore: false }, { ensured: new Set() }));
});
