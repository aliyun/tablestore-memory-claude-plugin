// test/retrieve.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { runRetrieve } from "../src/hooks/retrieve.mjs";
import { makeFakeClient } from "./helpers/fake-client.mjs";

const config = { storeName: "s", appId: "a", tenantId: "t", agentId: "g",
  searchTopK: 5, enableRerank: true, includeScores: true, minQueryLength: 6, autoCreateStore: true };

test("returns additionalContext on hits", async () => {
  const client = makeFakeClient({
    getMemoryStore: { memoryStoreName: "s" },
    searchMemories: { results: [{ unit: { text: "likes tea" }, score: 0.9 }] },
  });
  const out = await runRetrieve({ prompt: "what do I like to drink" }, { client, config });
  assert.equal(out.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.match(out.hookSpecificOutput.additionalContext, /likes tea/);
  const body = client.calls.find(c => c.name === "searchMemories").body;
  assert.equal(body.scope.agentId, "*");
  assert.equal(body.scope.runId, "*");
});

test("returns null for short prompt", async () => {
  const client = makeFakeClient({});
  const out = await runRetrieve({ prompt: "hi" }, { client, config });
  assert.equal(out, null);
});

test("returns null when no results", async () => {
  const client = makeFakeClient({ getMemoryStore: { memoryStoreName: "s" }, searchMemories: { results: [] } });
  const out = await runRetrieve({ prompt: "longer query here" }, { client, config });
  assert.equal(out, null);
});

test("reads user_prompt fallback field", async () => {
  const client = makeFakeClient({ getMemoryStore: {}, searchMemories: { results: [{ unit: { text: "x" }, score: 1 }] } });
  const out = await runRetrieve({ user_prompt: "longer query here" }, { client, config });
  assert.ok(out.hookSpecificOutput.additionalContext);
});
