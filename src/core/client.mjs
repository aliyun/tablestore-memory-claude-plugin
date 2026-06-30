// src/core/client.mjs
function resolveCtor(mod) {
  return mod?.AgentStorageClient
    ?? mod?.default?.AgentStorageClient
    ?? (typeof mod?.default === "function" ? mod.default : null);
}

export function authOptions(config) {
  return config.auth.apiKey
    ? { apiKey: config.auth.apiKey }
    : { accessKeyId: config.auth.accessKeyId, accessKeySecret: config.auth.accessKeySecret };
}

// 默认用静态字面量 import，便于 esbuild 把 SDK 打进 bundle；测试可注入 importModule 替身。
export async function createClient(config, { importModule } = {}) {
  const mod = importModule ? await importModule() : await import("@tablestore/agent-storage");
  const Ctor = resolveCtor(mod);
  if (!Ctor) throw new Error("AgentStorageClient constructor not found in @tablestore/agent-storage");
  return new Ctor({
    endpoint: config.endpoint,
    instanceName: config.instanceName,
    ...authOptions(config),
  });
}
