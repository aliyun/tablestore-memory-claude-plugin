// test/search.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { searchMemories, formatResults } from "../src/core/search.mjs";
import { makeFakeClient } from "./helpers/fake-client.mjs";

const cfg = { storeName: "s", enableRerank: true, includeScores: true };
const scope = { appId: "a", tenantId: "t", agentId: "*", runId: "*" };

test("searchMemories passes query/scope/topK/rerank", async () => {
  const c = makeFakeClient({ searchMemories: { results: [{ unit: { text: "x" }, score: 0.9 }] } });
  const r = await searchMemories(c, cfg, { query: "q", scope, topK: 7 });
  const body = c.calls[0].body;
  assert.equal(body.memoryStoreName, "s");
  assert.equal(body.query, "q");
  assert.equal(body.topK, 7);
  assert.equal(body.enableRerank, true);
  assert.deepEqual(body.scope, scope);
  assert.equal(r.results.length, 1);
});

test("formatResults with scores", () => {
  const out = formatResults([{ unit: { text: "likes tea" }, score: 0.87 }], { includeScores: true });
  assert.match(out, /likes tea/);
  assert.match(out, /0\.87/);
});

test("formatResults without scores", () => {
  const out = formatResults([{ unit: { text: "likes tea" }, score: 0.87 }], { includeScores: false });
  assert.match(out, /likes tea/);
  assert.ok(!/0\.87/.test(out));
});

test("formatResults empty -> empty string", () => {
  assert.equal(formatResults([], {}), "");
});
