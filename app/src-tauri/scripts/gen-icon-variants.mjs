#!/usr/bin/env node
// Regenerates the appearance-aware .icns variants embedded by lib.rs at
// runtime (set_macos_app_icon). Output files:
//   icons/icon.icns           ← prod light  (kept; also bundle icon)
//   icons/icon-dark.icns      ← prod dark
//   icons-dev/icon-light.icns ← dev  light
//   icons-dev/icon-dark.icns  ← dev  dark
//
// Run after editing any of the four SVG sources in app/src/assets/.

import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..", "..");

const variants = [
  { svg: "src/assets/recrest-icon-light.svg", out: "src-tauri/icons/icon.icns" },
  { svg: "src/assets/recrest-icon-dark.svg", out: "src-tauri/icons/icon-dark.icns" },
  { svg: "src/assets/recrest-icon-dev-light.svg", out: "src-tauri/icons-dev/icon-light.icns" },
  { svg: "src/assets/recrest-icon-dev-dark.svg", out: "src-tauri/icons-dev/icon-dark.icns" },
];

const tmp = mkdtempSync(resolve(tmpdir(), "recrest-icon-"));
try {
  for (const { svg, out } of variants) {
    const stage = resolve(tmp, out.replaceAll("/", "_"));
    console.log(`→ ${svg}`);
    execFileSync("yarn", ["tauri", "icon", svg, "-o", stage], {
      cwd: appRoot,
      stdio: "inherit",
    });
    cpSync(resolve(stage, "icon.icns"), resolve(appRoot, out));
  }
  console.log("Done.");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
