// test/helpers/fake-client.mjs
// 记录调用并返回预设响应的假 AgentStorageClient。
export function makeFakeClient(responses = {}) {
  const calls = [];
  const handler = (name) => async (body = {}) => {
    calls.push({ name, body });
    const r = responses[name];
    if (typeof r === "function") return r(body);
    if (r instanceof Error) throw r;
    return r ?? {};
  };
  return {
    calls,
    getMemoryStore: handler("getMemoryStore"),
    createMemoryStore: handler("createMemoryStore"),
    addMemories: handler("addMemories"),
    searchMemories: handler("searchMemories"),
    listMemories: handler("listMemories"),
    createMemoryDreamTask: handler("createMemoryDreamTask"),
    getMemoryDreamTask: handler("getMemoryDreamTask"),
    listMemoryStoreScopes: handler("listMemoryStoreScopes"),
  };
}

// 返回一个 importModule，使 createClient 拿到指定的 Ctor。
export function fakeImport(Ctor) {
  return async () => ({ AgentStorageClient: Ctor });
}
