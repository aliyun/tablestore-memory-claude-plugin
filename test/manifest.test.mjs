// test/manifest.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));

test("plugin.json has name", () => {
  assert.equal(read(".claude-plugin/plugin.json").name, "tablestore-memory");
});

test("hooks.json wires the three events to bundled dist scripts", () => {
  const h = read("hooks/hooks.json").hooks;
  for (const ev of ["UserPromptSubmit", "Stop", "SessionEnd"]) assert.ok(h[ev], `missing ${ev}`);
  const cmd = h.UserPromptSubmit[0].hooks[0].command;
  assert.match(cmd, /CLAUDE_PLUGIN_ROOT/);
  assert.match(cmd, /dist\/hooks\/retrieve\.mjs/);
});

test(".mcp.json declares stdio server via bundled dist", () => {
  const m = read(".mcp.json")["tablestore-memory"];
  assert.equal(m.command, "node");
  assert.match(m.args[0], /dist\/mcp\/server\.mjs/);
});

test("source scripts pass node --check", () => {
  for (const f of ["src/hooks/retrieve.mjs", "src/hooks/writeback.mjs", "src/hooks/consolidate.mjs", "src/mcp/server.mjs", "bin/cli.mjs"]) {
    execFileSync("node", ["--check", new URL(`../${f}`, import.meta.url).pathname]);
  }
});

test("bundled dist artifacts exist and are self-contained (no bare node_modules imports)", () => {
  for (const f of ["dist/hooks/retrieve.mjs", "dist/hooks/writeback.mjs", "dist/hooks/consolidate.mjs", "dist/mcp/server.mjs", "dist/cli.mjs"]) {
    const p = new URL(`../${f}`, import.meta.url).pathname;
    assert.ok(fs.existsSync(p), `missing built artifact ${f} (run npm run build)`);
    execFileSync("node", ["--check", p]);
    const src = fs.readFileSync(p, "utf8");
    // 不应残留对外部包的裸 import（应已被 esbuild 内联）。
    assert.ok(!/from"@tablestore\/agent-storage"|from"@modelcontextprotocol|from"zod"/.test(src.replace(/\s/g, "")),
      `${f} still imports an external package — bundling incomplete`);
  }
});
