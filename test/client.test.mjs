// test/client.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "../src/core/client.mjs";

test("apiKey client built with apiKey opts", async () => {
  let opts;
  class Fake { constructor(o) { opts = o; } }
  const c = await createClient(
    { endpoint: "https://i", instanceName: "i", auth: { apiKey: "k" } },
    { importModule: async () => ({ AgentStorageClient: Fake }) });
  assert.ok(c instanceof Fake);
  assert.equal(opts.apiKey, "k");
  assert.equal(opts.endpoint, "https://i");
  assert.equal(opts.instanceName, "i");
  assert.equal(opts.accessKeyId, undefined);
});

test("ak/sk client built with ak/sk opts", async () => {
  let opts;
  class Fake { constructor(o) { opts = o; } }
  await createClient(
    { endpoint: "https://i", instanceName: "i", auth: { accessKeyId: "a", accessKeySecret: "b" } },
    { importModule: async () => ({ AgentStorageClient: Fake }) });
  assert.equal(opts.accessKeyId, "a");
  assert.equal(opts.accessKeySecret, "b");
  assert.equal(opts.apiKey, undefined);
});

test("resolves Ctor from default export shapes", async () => {
  class Fake {}
  const c = await createClient(
    { endpoint: "https://i", instanceName: "i", auth: { apiKey: "k" } },
    { importModule: async () => ({ default: { AgentStorageClient: Fake } }) });
  assert.ok(c instanceof Fake);
});
