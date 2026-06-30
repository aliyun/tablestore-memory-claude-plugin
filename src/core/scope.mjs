// src/core/scope.mjs
import os from "node:os";

const DEFAULT = "__default__";
const clean = (v, fb = DEFAULT) => {
  const s = v == null ? "" : String(v).trim();
  return s || fb;
};

function safeUser() { try { return os.userInfo().username; } catch { return ""; } }

function tenant(cfg, { uid, osUser } = {}) {
  if (uid) return clean(uid);
  if (cfg.tenantId) return clean(cfg.tenantId);
  const u = osUser != null ? osUser : safeUser();
  return clean(u);
}

export function writeScope(cfg, { sessionId, uid, osUser } = {}) {
  return {
    appId: clean(cfg.appId, "claude-code"),
    tenantId: tenant(cfg, { uid, osUser }),
    agentId: clean(cfg.agentId, "claude-code"),
    runId: clean(sessionId),
  };
}

export function readScope(cfg, { uid, osUser } = {}) {
  return {
    appId: clean(cfg.appId, "claude-code"),
    tenantId: tenant(cfg, { uid, osUser }),
    agentId: "*",
    runId: "*",
  };
}

export function scopeKey({ appId, tenantId }) {
  return `${appId}\t${tenantId}`;
}
