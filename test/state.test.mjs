// test/state.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getCursor, setCursor, getDreamWatermark, setDreamWatermark } from "../src/core/state.mjs";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "tsm-")); }

test("cursor round-trips and defaults to 0", () => {
  const dir = tmp();
  assert.equal(getCursor(dir, "s1"), 0);
  setCursor(dir, "s1", 7);
  assert.equal(getCursor(dir, "s1"), 7);
});

test("dream watermark round-trips", () => {
  const dir = tmp();
  assert.equal(getDreamWatermark(dir, "a\tt"), null);
  setDreamWatermark(dir, "a\tt", { lastRunAt: 123, dreamId: "d1" });
  assert.deepEqual(getDreamWatermark(dir, "a\tt"), { lastRunAt: 123, dreamId: "d1" });
});

test("separate keys do not collide", () => {
  const dir = tmp();
  setCursor(dir, "s1", 1);
  setCursor(dir, "s2", 2);
  assert.equal(getCursor(dir, "s1"), 1);
  assert.equal(getCursor(dir, "s2"), 2);
});
