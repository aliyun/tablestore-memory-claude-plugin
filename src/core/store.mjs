// src/core/store.mjs
const globalEnsured = new Set();

function isNotFound(e) {
  const s = `${e?.code || ""} ${e?.message || ""}`.toLowerCase();
  return s.includes("notexist") || s.includes("not found") || s.includes("not exist");
}
function isConflict(e) {
  const s = `${e?.code || ""} ${e?.message || ""}`.toLowerCase();
  return s.includes("already") || s.includes("conflict") || s.includes("exist");
}

export async function ensureMemoryStore(client, config, { ensured = globalEnsured } = {}) {
  const name = config.storeName;
  if (ensured.has(name)) return;
  try {
    await client.getMemoryStore({ memoryStoreName: name });
    ensured.add(name);
    return;
  } catch (e) {
    if (!isNotFound(e)) throw e;
  }
  if (!config.autoCreateStore) throw new Error(`memory store "${name}" not found and autoCreateStore is disabled`);
  try {
    await client.createMemoryStore({ memoryStoreName: name, description: config.storeDescription });
  } catch (e) {
    if (!isConflict(e)) throw e;
  }
  ensured.add(name);
}
