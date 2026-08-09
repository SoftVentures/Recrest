#!/usr/bin/env node
/**
 * Guards the demo/dev-stub gate in `app/src/main.tsx`.
 *
 * The stub that fakes `__TAURI_INTERNALS__` (plus its seed fixtures) must never
 * reach a desktop user. It is kept out by two literal expressions —
 * `import.meta.env.DEV` and `import.meta.env.MODE === "demo"` — which the
 * bundler statically replaces so the dynamic `import("@/lib/tauri/devStub")`
 * becomes unreachable and gets eliminated. Hoisting either expression into a
 * `const` (or a helper) hides the replaced value behind a runtime binding, the
 * elimination silently stops happening, and the stub ships.
 *
 * This script builds `@recrest/app` in production mode and asserts the output
 * contains neither a `devStub` chunk nor any seed fixture literal.
 *
 * Usage:
 *   node scripts/check-no-devstub.mjs               build, then assert
 *   node scripts/check-no-devstub.mjs --no-build    assert an existing app/dist
 *   node scripts/check-no-devstub.mjs --dist=<path> assert another output dir
 *                                                   (implies --no-build)
 */
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distArg = process.argv.find((a) => a.startsWith("--dist="))?.slice("--dist=".length);
const DIST = distArg ? path.resolve(ROOT, distArg) : path.join(ROOT, "app", "dist");
const SKIP_BUILD = Boolean(distArg) || process.argv.includes("--no-build");

/** Chunk filenames are derived from the source module id, so a surviving
 *  dynamic import of `devStub.ts` shows up as a `devStub-<hash>.js` asset. */
const FORBIDDEN_CHUNK_PATTERN = /devstub/i;

/** String literals survive minification, so these catch a stub that got folded
 *  into an existing chunk instead of emitted as its own. Each is unique to the
 *  dev seed fixtures (`app/src/lib/dev/seed/`). */
const FORBIDDEN_LITERALS = ["repo-recrest", "acme-labs", "renovate-bot"];

function fail(message, { leak = true } = {}) {
  console.error(`\n[check-no-devstub] FAIL: ${message}\n`);
  if (leak) {
    console.error(
      "The dev IPC stub leaked into the production bundle. Check that\n" +
        "`app/src/main.tsx` still spells the gate as literal\n" +
        '`import.meta.env.DEV` / `import.meta.env.MODE === "demo"` expressions\n' +
        "instead of hoisting them into variables or helpers.",
    );
  }
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

if (!SKIP_BUILD) {
  console.log("[check-no-devstub] building @recrest/app (production mode)…");
  // `shell: true` — on Windows `yarn` is a `.cmd` shim that `spawnSync` cannot
  // execute directly.
  const build = spawnSync("yarn", ["workspace", "@recrest/app", "build"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });
  if (build.status !== 0) fail("production build did not succeed", { leak: false });
}

let files;
try {
  files = walk(DIST);
} catch {
  fail(`no build output at ${DIST} — run without --no-build`, { leak: false });
}

const jsFiles = files.filter((f) => f.endsWith(".js"));
if (jsFiles.length === 0) fail(`no JS assets found under ${DIST}`);

const badChunks = files.filter((f) => FORBIDDEN_CHUNK_PATTERN.test(path.basename(f)));
if (badChunks.length > 0) {
  fail(`devStub chunk emitted: ${badChunks.map((f) => path.relative(ROOT, f)).join(", ")}`);
}

const hits = [];
for (const file of jsFiles) {
  const source = readFileSync(file, "utf8");
  for (const literal of FORBIDDEN_LITERALS) {
    if (source.includes(literal)) hits.push(`${path.relative(ROOT, file)} contains "${literal}"`);
  }
}
if (hits.length > 0) fail(`dev seed fixtures found in the bundle:\n  - ${hits.join("\n  - ")}`);

console.log(
  `[check-no-devstub] OK — ${jsFiles.length} JS assets, no devStub chunk, no seed fixtures.`,
);
