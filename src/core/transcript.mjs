// src/core/transcript.mjs
export function extractText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n");
}

function parseLines(jsonl) {
  return String(jsonl ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function entryMessage(line) {
  try {
    const obj = JSON.parse(line);
    const msg = obj.message ?? obj;
    const role = msg.role;
    if (role !== "user" && role !== "assistant") return null;
    const text = extractText(msg.content).trim();
    if (!text) return null;
    return { role, content: text };
  } catch {
    return null;
  }
}

// cursor 是已处理的原始行数。返回新增的 user/assistant 文本消息与新游标。
export function readNewMessages(jsonl, cursor = 0) {
  const lines = parseLines(jsonl);
  if (lines.length < cursor) {
    return { messages: [], newCursor: lines.length, reset: true };
  }
  const messages = [];
  for (let i = cursor; i < lines.length; i++) {
    const m = entryMessage(lines[i]);
    if (m) messages.push(m);
  }
  return { messages, newCursor: lines.length, reset: false };
}

export function latestUserPrompt(jsonl) {
  const lines = parseLines(jsonl);
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = entryMessage(lines[i]);
    if (m && m.role === "user") return m.content;
  }
  return "";
}
