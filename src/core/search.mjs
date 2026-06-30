// src/core/search.mjs
export async function searchMemories(client, config, { query, scope, topK }) {
  const res = await client.searchMemories({
    memoryStoreName: config.storeName,
    scope,
    query,
    topK: topK ?? config.searchTopK,
    enableRerank: config.enableRerank,
  });
  return { results: Array.isArray(res?.results) ? res.results : [], scope };
}

function unitText(item) {
  return item?.unit?.text ?? item?.unit?.content ?? item?.text ?? "";
}

export function formatResults(results, { includeScores = true } = {}) {
  if (!Array.isArray(results) || results.length === 0) return "";
  const lines = results.map((it, i) => {
    const t = String(unitText(it)).trim();
    const s = includeScores && typeof it?.score === "number" ? ` (score: ${it.score.toFixed(2)})` : "";
    return `${i + 1}. ${t}${s}`;
  });
  return `Relevant long-term memories (from Tablestore memory):\n${lines.join("\n")}`;
}
