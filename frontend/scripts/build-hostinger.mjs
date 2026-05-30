import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

rmSync("dist", { recursive: true, force: true });
rmSync(".output", { recursive: true, force: true });

const build = spawnSync("vite", ["build"], {
  env: { ...process.env, DEPLOY_TARGET: "node" },
  shell: true,
  stdio: "inherit",
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const prepare = spawnSync("node", ["scripts/prepare-node-output.mjs"], {
  shell: true,
  stdio: "inherit",
});

process.exit(prepare.status ?? 1);
