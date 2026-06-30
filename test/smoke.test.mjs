// test/smoke.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeFakeClient } from "./helpers/fake-client.mjs";

test("fake client records calls", async () => {
  const c = makeFakeClient({ searchMemories: { results: [] } });
  const r = await c.searchMemories({ query: "x" });
  assert.deepEqual(r, { results: [] });
  assert.equal(c.calls[0].name, "searchMemories");
});
