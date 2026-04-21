import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const eslintBin = path.join(repoRoot, "node_modules", "eslint", "bin", "eslint.js");

const [, , workspace, ...files] = process.argv;

if (!workspace || files.length === 0) {
  process.exit(0);
}

const cwd = path.resolve(workspace);
const rel = files.map((f) => path.relative(cwd, f).split(path.sep).join("/"));

const result = spawnSync(process.execPath, [eslintBin, "--fix", "--max-warnings=0", ...rel], {
  cwd,
  stdio: "inherit",
});

process.exit(result.status ?? 0);
