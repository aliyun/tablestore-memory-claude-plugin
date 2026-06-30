// scripts/build.mjs
// 用 esbuild 把每个入口连同依赖打包成自包含 ESM 文件，输出到 dist/。
// dist/ 会被提交进仓，使得 git clone / marketplace 安装后无需 npm install 即可运行。
import { build } from "esbuild";
import { rmSync } from "node:fs";

rmSync(new URL("../dist", import.meta.url), { recursive: true, force: true });

await build({
  entryPoints: {
    "hooks/retrieve": "src/hooks/retrieve.mjs",
    "hooks/writeback": "src/hooks/writeback.mjs",
    "hooks/consolidate": "src/hooks/consolidate.mjs",
    "mcp/server": "src/mcp/server.mjs",
    "cli": "bin/cli.mjs",
  },
  outdir: "dist",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  // node: 内置模块自动 external；其余依赖（agent-storage / mcp sdk / zod）全部打进 bundle。
  banner: { js: "#!/usr/bin/env node" },
  logLevel: "info",
});

console.log("build complete -> dist/");
