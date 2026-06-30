// src/core/state.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function stateDir(home = os.homedir()) {
  return path.join(home, ".tablestore-memory");
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return {}; }
}
function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file);
}

const cursorsFile = (dir) => path.join(dir, "writeback-state.json");
const dreamFile = (dir) => path.join(dir, "dream-state.json");

export function getCursor(dir, sessionId) {
  const n = readJson(cursorsFile(dir))[sessionId];
  return Number.isInteger(n) ? n : 0;
}
export function setCursor(dir, sessionId, n) {
  const all = readJson(cursorsFile(dir));
  all[sessionId] = n;
  writeJson(cursorsFile(dir), all);
}
export function getDreamWatermark(dir, key) {
  return readJson(dreamFile(dir))[key] ?? null;
}
export function setDreamWatermark(dir, key, value) {
  const all = readJson(dreamFile(dir));
  all[key] = value;
  writeJson(dreamFile(dir), all);
}
