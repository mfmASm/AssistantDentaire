import { spawnSync } from "node:child_process";

const result = spawnSync("vite", ["build"], {
  env: { ...process.env, DEPLOY_TARGET: "cloudflare" },
  shell: true,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
