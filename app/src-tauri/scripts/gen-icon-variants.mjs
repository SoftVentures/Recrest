#!/usr/bin/env node
// Regenerates every app-icon asset from the four canonical SVG sources.
// Run after editing any of `src/assets/recrest-icon-{light,dark,dev-light,dev-dark}.svg`.
//
// Outputs per set:
//   icons/              ← prod set; consumed by `tauri build` + release runtime
//   icons-dev/          ← dev  set; consumed by `tauri:dev` via build.rs override
//
// In each directory we keep:
//   - Light-tile primaries (`32x32.png`, `64x64.png`, `128x128.png`,
//     `128x128@2x.png`, `icon.png`, `icon.ico`, `icon.icns`, `Square*Logo.png`)
//     which Tauri picks up via `bundle.icon` for installer packaging.
//   - `icon-dark.png` — 128×128 dark-tile copy, used by `lib.rs` at runtime
//     to swap the Windows taskbar + tray icon when the OS switches to dark
//     mode (driven by `WindowEvent::ThemeChanged`).
//   - `icon-dark.icns` / `icon-light.icns` — appearance-aware slots for
//     macOS' equivalent runtime swap in `set_macos_app_icon`.
//
// `tauri icon` also writes `android/` + `ios/` trees that we don't ship,
// so those directories are skipped on copy.

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..", "..");

// `yarn` is a `.cmd` shim on Windows; `execFileSync` doesn't honour PATHEXT,
// so we hop through cmd.exe explicitly. Unix can run `yarn` directly.
const isWindows = process.platform === "win32";
const yarnCmd = isWindows ? "cmd.exe" : "yarn";
const yarnArgsPrefix = isWindows ? ["/d", "/s", "/c", "yarn"] : [];

function runTauriIcon(svg, outDir) {
  execFileSync(yarnCmd, [...yarnArgsPrefix, "tauri", "icon", svg, "-o", outDir], {
    cwd: appRoot,
    stdio: "inherit",
  });
}

function copyTopLevelFiles(from, to) {
  for (const name of readdirSync(from)) {
    const src = join(from, name);
    if (statSync(src).isDirectory()) continue; // skip android/, ios/
    copyFileSync(src, join(to, name));
  }
}

// Each entry generates from one SVG; `primary` (if set) takes the full PNG
// bundle; `icnsSwap` (if set) renames the .icns into an appearance-aware
// slot in the destination directory; `darkPngSwap` (if set) copies the
// 128×128 PNG into a `icon-dark.png` slot used by the Windows runtime swap.
const sets = [
  {
    label: "prod / light",
    svg: "src/assets/recrest-icon-light.svg",
    primary: "src-tauri/icons",
    icnsSwap: null, // already lands at icons/icon.icns
    darkPngSwap: null,
  },
  {
    label: "prod / dark",
    svg: "src/assets/recrest-icon-dark.svg",
    primary: null,
    icnsSwap: "src-tauri/icons/icon-dark.icns",
    darkPngSwap: "src-tauri/icons/icon-dark.png",
  },
  {
    label: "dev / light",
    svg: "src/assets/recrest-icon-dev-light.svg",
    primary: "src-tauri/icons-dev",
    icnsSwap: "src-tauri/icons-dev/icon-light.icns",
    darkPngSwap: null,
  },
  {
    label: "dev / dark",
    svg: "src/assets/recrest-icon-dev-dark.svg",
    primary: null,
    icnsSwap: "src-tauri/icons-dev/icon-dark.icns",
    darkPngSwap: "src-tauri/icons-dev/icon-dark.png",
  },
];

const tmp = mkdtempSync(resolve(tmpdir(), "recrest-icon-"));
try {
  for (const { label, svg, primary, icnsSwap, darkPngSwap } of sets) {
    const stage = resolve(tmp, svg.replaceAll(/[\\/]/g, "_"));
    console.log(`→ ${label}: ${svg}`);
    runTauriIcon(svg, stage);

    if (primary) {
      copyTopLevelFiles(stage, resolve(appRoot, primary));
    }
    if (icnsSwap) {
      copyFileSync(resolve(stage, "icon.icns"), resolve(appRoot, icnsSwap));
    }
    if (darkPngSwap) {
      copyFileSync(resolve(stage, "128x128.png"), resolve(appRoot, darkPngSwap));
    }
  }
  console.log("Done.");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
