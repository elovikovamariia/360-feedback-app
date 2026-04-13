/**
 * App Router не включает в маршруты папки с префиксом «_».
 * Переименовываем src/app/api → src/app/_api_stash перед next build (output: export).
 *
 * node scripts/stash-api.mjs stash
 * node scripts/stash-api.mjs restore
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const from = path.join(root, "src", "app", "api");
const to = path.join(root, "src", "app", "_api_stash");

/** Копирование + удаление: на Windows/OneDrive rename часто даёт EPERM. */
function moveDirRecursive(src, dest) {
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  fs.rmSync(src, { recursive: true, force: true });
}

const cmd = process.argv[2];
if (cmd === "stash") {
  if (fs.existsSync(from)) {
    moveDirRecursive(from, to);
    console.log("Stashed src/app/api → src/app/_api_stash");
  } else {
    console.log("No src/app/api to stash (already stashed?)");
  }
} else if (cmd === "restore") {
  if (fs.existsSync(to)) {
    if (fs.existsSync(from)) fs.rmSync(from, { recursive: true, force: true });
    moveDirRecursive(to, from);
    console.log("Restored src/app/_api_stash → src/app/api");
  } else {
    console.log("Nothing to restore");
  }
} else {
  console.error("Usage: node scripts/stash-api.mjs stash|restore");
  process.exit(1);
}
