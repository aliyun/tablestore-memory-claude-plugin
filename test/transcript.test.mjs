// test/transcript.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractText, readNewMessages, latestUserPrompt } from "../src/core/transcript.mjs";

const L = (role, content) => JSON.stringify({ type: role, message: { role, content } });

test("extractText handles string and block array", () => {
  assert.equal(extractText("hello"), "hello");
  assert.equal(extractText([{ type: "text", text: "a" }, { type: "tool_use", name: "x" }, { type: "text", text: "b" }]), "a\nb");
});

test("readNewMessages filters user/assistant text, skips tools/thinking", () => {
  const jsonl = [
    L("user", "hi"),
    L("assistant", [{ type: "thinking", text: "..." }, { type: "text", text: "hello there" }]),
    L("assistant", [{ type: "tool_use", name: "Bash", input: {} }]),
  ].join("\n");
  const r = readNewMessages(jsonl, 0);
  assert.deepEqual(r.messages, [
    { role: "user", content: "hi" },
    { role: "assistant", content: "hello there" },
  ]);
  assert.equal(r.newCursor, 3);
  assert.equal(r.reset, false);
});

test("readNewMessages from cursor returns only new lines", () => {
  const jsonl = [L("user", "a"), L("assistant", "b"), L("user", "c")].join("\n");
  const r = readNewMessages(jsonl, 2);
  assert.deepEqual(r.messages, [{ role: "user", content: "c" }]);
  assert.equal(r.newCursor, 3);
});

test("readNewMessages resets when transcript shrank", () => {
  const jsonl = [L("user", "a")].join("\n");
  const r = readNewMessages(jsonl, 5);
  assert.equal(r.reset, true);
  assert.equal(r.newCursor, 1);
  assert.deepEqual(r.messages, []);
});

test("latestUserPrompt returns last user text", () => {
  const jsonl = [L("user", "first"), L("assistant", "x"), L("user", "second")].join("\n");
  assert.equal(latestUserPrompt(jsonl), "second");
});
