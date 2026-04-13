/**
 * Выставляет переменные для next build (output: export) и запускает сборку.
 * Пример: node scripts/run-gh-pages-build.mjs /360-feedback-app
 * Или задайте NEXT_PUBLIC_BASE_PATH в окружении (GitHub Actions).
 */
import { spawnSync } from "node:child_process";

process.env.GITHUB_PAGES = "true";
process.env.NEXT_PUBLIC_GH_PAGES = "true";
if (!process.env.NEXT_PUBLIC_BASE_PATH) {
  process.env.NEXT_PUBLIC_BASE_PATH = process.argv[2] || "/360-feedback-app";
}

const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
const r = spawnSync(cmd, ["next", "build"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});
process.exit(r.status ?? 1);
