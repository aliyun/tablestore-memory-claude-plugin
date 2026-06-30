// src/core/log.mjs
// 所有日志必须走 stderr，避免污染钩子 stdout 的协议 JSON。
export function makeLogger(prefix = "tablestore-memory") {
  const emit = (msg) => process.stderr.write(`${prefix}: ${msg}\n`);
  return {
    debug: (m) => { if (process.env.TABLESTORE_MEMORY_DEBUG) emit(m); },
    warn: (m) => emit(m),
    error: (m) => emit(m),
  };
}
