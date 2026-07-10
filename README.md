# tablestore-memory

为 **Claude Code** 提供长期记忆能力的插件，后端基于阿里云表格存储（Tablestore）记忆服务，通过 `@tablestore/agent-storage` 接入。能力对齐 OpenClaw 的 `tablestore-mem` 插件，并额外提供 MCP 工具。

## 能力

- **每轮自动检索**（`UserPromptSubmit` 钩子）：在你提交 prompt 前检索相关长期记忆，以隐藏上下文注入模型，不打印到可见对话。
- **每轮自动回写**（`Stop` 钩子）：对话结束后，将本轮新增的 user/assistant 消息增量写入记忆库（按服务限制分块：≤20 条 / ≤32000 字节）。
- **离线记忆整理 Dream**（`SessionEnd` 钩子 + CLI/cron）：去重、改写、合并、淘汰过时记忆。
- **MCP 工具**（模型可显式调用）：`search_memory`、`add_memory`、`consolidate_memory`。
- **斜杠命令**：`/search`、`/add`、`/doctor`、`/dream`。
- **CLI**：`search` / `add` / `doctor` / `dream`。
- 同时支持 **API Key** 与 **AccessKey（AK/SK）** 认证。

## 要求

- Node.js ≥ 18
- 一个**已创建好的** Tablestore 实例（仅华北 2 / 北京地域提供记忆服务），拿到 **https endpoint** 与 **实例名**；以及 API Key 或 AK/SK。
- 本插件不自动创建实例，需显式提供 endpoint + 实例名。

## 安装

仓库：`https://github.com/aliyun/tablestore-memory-claude-plugin`
依赖已用 esbuild 打包进 `dist/`（随仓库发布），**终端用户无需 `npm install`**。

```bash
# 方式一（推荐）：从 GitHub marketplace 安装
claude plugin marketplace add aliyun/tablestore-memory-claude-plugin
claude plugin install tablestore-memory@tablestore-memory-marketplace

# 方式二：克隆后从本地目录安装
git clone https://github.com/aliyun/tablestore-memory-claude-plugin.git
claude plugin marketplace add ./tablestore-memory-claude-plugin
claude plugin install tablestore-memory@tablestore-memory-marketplace

# 方式三：快速加载（调试用，无需注册 marketplace）
claude --plugin-dir ./tablestore-memory-claude-plugin
```

> 注意：**仓库名** `tablestore-memory-claude-plugin` ≠ **插件名** `tablestore-memory` ≠ **marketplace 名** `tablestore-memory-marketplace`。`install` 用的是 `<插件名>@<marketplace名>`。

> 仅需 Node.js ≥ 18 在 PATH 上（运行打包后的钩子/MCP），无需安装任何 npm 依赖。
> 钩子在会话启动时加载；修改钩子/配置后需重启 Claude Code 才生效。

### 面向贡献者（修改源码后）

源码在 `src/`，发布产物在 `dist/`。改完源码需重新构建并提交 `dist/`：

```bash
npm install        # 安装开发依赖（含 esbuild）
npm test           # 单元测试
npm run build      # 重新打包到 dist/
```

## 配置

在 `~/.claude/settings.json` 的 `env` 中设置（会同时注入钩子与 MCP server）：

```json
{
  "env": {
    "TABLESTORE_MEMORY_ENDPOINT": "https://<instance>.cn-beijing.ots.aliyuncs.com",
    "TABLESTORE_MEMORY_INSTANCE": "<instance>",
    "TABLESTORE_MEMORY_API_KEY": "<api-key>"
  }
}
```

AK/SK 方式：用 `TABLESTORE_ACCESS_KEY_ID` + `TABLESTORE_ACCESS_KEY_SECRET` 替代 `TABLESTORE_MEMORY_API_KEY`。
认证优先级：`TABLESTORE_MEMORY_API_KEY` 存在则用 API Key（要求 https endpoint），否则用 AK/SK；都没有则插件静默禁用。

也可用配置文件兜底：`~/.tablestore-memory/config.json`（键为小驼峰 `endpoint`/`instance`/`apiKey`/`accessKeyId`/`accessKeySecret`/`storeName`...）。**环境变量优先于配置文件。**

### 可选项与默认值

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `TABLESTORE_MEMORY_STORE_NAME` | `claude_code_mem` | 记忆库名 |
| `TABLESTORE_MEMORY_APP_ID` | `claude-code` | appId |
| `TABLESTORE_MEMORY_TENANT_ID` | 操作系统用户名 → `__default__` | 租户（全局单用户池） |
| `TABLESTORE_MEMORY_AGENT_ID` | `claude-code` | 写入时的 agentId |
| `TABLESTORE_MEMORY_SEARCH_TOP_K` | `5` | 检索条数（1~50） |
| `TABLESTORE_MEMORY_ENABLE_RERANK` | `true` | 是否 Rerank |
| `TABLESTORE_MEMORY_WRITEBACK_ENABLED` | `true` | 是否自动回写 |
| `TABLESTORE_MEMORY_INCLUDE_SCORES` | `true` | 注入上下文是否带分数 |
| `TABLESTORE_MEMORY_MIN_QUERY_LENGTH` | `6` | 过短 prompt 跳过检索 |
| `TABLESTORE_MEMORY_AUTO_CREATE_STORE` | `true` | 记忆库不存在时自动创建 |
| `TABLESTORE_MEMORY_DREAM_ENABLED` | `true` | 是否启用 Dream |
| `TABLESTORE_MEMORY_DREAM_APPLY_MODE` | `safe_auto` | `safe_auto` / `proposal` |
| `TABLESTORE_MEMORY_DREAM_CONFIDENCE` | `0.9` | safe_auto 自动应用阈值 |
| `TABLESTORE_MEMORY_DREAM_MAX_SCOPES` | `20` | 单次最多整理 scope 数 |
| `TABLESTORE_MEMORY_DREAM_MIN_INTERVAL_HOURS` | `24` | 同一 scope 两次整理最小间隔 |
| `TABLESTORE_MEMORY_DEBUG` | 空 | 设置后输出 debug 日志到 stderr |

## Scope 设计（全局单用户池）

- 写入锚定具体会话：`appId / tenantId / agentId / runId=<session_id>`。
- 检索在固定租户下放宽：`agentId=*`、`runId=*`，实现跨会话、跨项目召回。
- 通配符遵循服务层级规则：某层用 `*` 后更深层必须 `*`。

## Dream（记忆整理）

- 会话结束（`SessionEnd`）时按租户 scope 触发一次整理，受 `DREAM_MIN_INTERVAL_HOURS` 节流（状态记于 `~/.tablestore-memory/dream-state.json`）。
- 由于插件不能常驻后台，周期整理用 cron 调用 CLI：

```bash
# 例：每天 03:17 整理某租户记忆并等待结果
17 3 * * *  node /path/to/tablestore-memory/bin/cli.mjs dream --uid <tenant> --wait
```

## CLI

```bash
node bin/cli.mjs search "用户喜欢什么饮品" --top-k 5
node bin/cli.mjs add "用户喜欢美式咖啡" --sync
node bin/cli.mjs doctor
node bin/cli.mjs dream --uid <tenant> --apply-mode safe_auto --wait
```

`--uid` 覆盖租户（运维/cron 用）；`-q/--quiet` 仅输出数据字段。

## 行为与边界

- **Fail-open**：缺配置或任何 SDK 异常都不会阻断对话（钩子写 stderr 日志后退出 0）。
- 钩子 stdout 只输出协议 JSON，日志一律走 stderr。
- 异步写入（`sync=false`）后约 15 秒内长期记忆可被检索；`--sync` 立即抽取。

## 验证

```bash
npm test          # 单元测试（Fake client，不需真实实例）
npm run check     # 所有 .mjs 通过 node --check
node bin/cli.mjs doctor   # 连真实实例做连通性诊断
```
