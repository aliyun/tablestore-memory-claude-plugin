// src/core/add.mjs
const bytes = (s) => Buffer.byteLength(String(s ?? ""), "utf8");

export function chunkMessages(messages, maxCount = 20, maxBytes = 32000) {
  const batches = [];
  let cur = [];
  let curBytes = 0;
  for (const m of messages) {
    const b = bytes(m.content);
    if (cur.length > 0 && (cur.length >= maxCount || curBytes + b > maxBytes)) {
      batches.push(cur);
      cur = [];
      curBytes = 0;
    }
    cur.push(m);
    curBytes += b;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

export async function addMemories(client, config, { messages, text, scope, sync = false }) {
  if (text != null) {
    await client.addMemories({ memoryStoreName: config.storeName, scope, text, sync });
    return;
  }
  const batches = chunkMessages(messages ?? []);
  for (const batch of batches) {
    await client.addMemories({ memoryStoreName: config.storeName, scope, messages: batch, sync });
  }
}
