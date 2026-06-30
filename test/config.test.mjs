// test/config.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveConfig } from "../src/core/config.mjs";

const base = {
  TABLESTORE_MEMORY_ENDPOINT: "https://i.cn-beijing.ots.aliyuncs.com",
  TABLESTORE_MEMORY_INSTANCE: "i",
};

test("apiKey mode ok", () => {
  const r = resolveConfig({ ...base, TABLESTORE_MEMORY_API_KEY: "k" });
  assert.equal(r.ok, true);
  assert.equal(r.config.auth.apiKey, "k");
  assert.equal(r.config.storeName, "claude_code_mem");
  assert.equal(r.config.searchTopK, 5);
  assert.equal(r.config.dream.applyMode, "safe_auto");
});

test("ak/sk mode ok", () => {
  const r = resolveConfig({ ...base, TABLESTORE_ACCESS_KEY_ID: "a", TABLESTORE_ACCESS_KEY_SECRET: "b" });
  assert.equal(r.ok, true);
  assert.equal(r.config.auth.accessKeyId, "a");
});

test("missing endpoint fails", () => {
  const r = resolveConfig({ TABLESTORE_MEMORY_INSTANCE: "i", TABLESTORE_MEMORY_API_KEY: "k" });
  assert.equal(r.ok, false);
  assert.match(r.error, /endpoint/i);
});

test("missing auth fails", () => {
  const r = resolveConfig(base);
  assert.equal(r.ok, false);
  assert.match(r.error, /auth|api key|access key/i);
});

test("apiKey requires https", () => {
  const r = resolveConfig({ ...base, TABLESTORE_MEMORY_ENDPOINT: "http://i.ots.aliyuncs.com", TABLESTORE_MEMORY_API_KEY: "k" });
  assert.equal(r.ok, false);
  assert.match(r.error, /https/i);
});

test("overrides parse numbers and booleans", () => {
  const r = resolveConfig({ ...base, TABLESTORE_MEMORY_API_KEY: "k",
    TABLESTORE_MEMORY_SEARCH_TOP_K: "8", TABLESTORE_MEMORY_ENABLE_RERANK: "false",
    TABLESTORE_MEMORY_DREAM_CONFIDENCE: "0.7" });
  assert.equal(r.config.searchTopK, 8);
  assert.equal(r.config.enableRerank, false);
  assert.equal(r.config.dream.confidence, 0.7);
});
