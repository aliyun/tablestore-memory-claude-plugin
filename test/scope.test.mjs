// test/scope.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeScope, readScope, scopeKey } from "../src/core/scope.mjs";

const cfg = { appId: "claude-code", tenantId: "alice", agentId: "claude-code" };

test("write scope is concrete with sessionId as runId", () => {
  assert.deepEqual(writeScope(cfg, { sessionId: "s1" }),
    { appId: "claude-code", tenantId: "alice", agentId: "claude-code", runId: "s1" });
});

test("write scope defaults missing runId", () => {
  assert.equal(writeScope(cfg, {}).runId, "__default__");
});

test("read scope wildcards agent and run", () => {
  assert.deepEqual(readScope(cfg, {}),
    { appId: "claude-code", tenantId: "alice", agentId: "*", runId: "*" });
});

test("tenant falls back to os user then default", () => {
  assert.equal(writeScope({ appId: "a", agentId: "x" }, { sessionId: "s", osUser: "bob" }).tenantId, "bob");
  assert.equal(writeScope({ appId: "a", agentId: "x" }, { sessionId: "s", osUser: "" }).tenantId, "__default__");
});

test("read scope honors uid override for tenant", () => {
  assert.equal(readScope(cfg, { uid: "carol" }).tenantId, "carol");
});

test("scopeKey is appId tab tenantId", () => {
  assert.equal(scopeKey({ appId: "a", tenantId: "t" }), "a\tt");
});
