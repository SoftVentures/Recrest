#!/usr/bin/env node
// Regenerates every app-icon asset from the canonical SVG sources under
// `src/assets/logos/`. Run after editing any of:
//   recrest-icon-mac-{light,dark,dev-light,dev-dark}.svg  (Apple-grid masters
//     used for macOS .icns + Windows .ico/MSIX tiles)
//   recrest-icon-{light,dark,dev-light,dev-dark}.svg      (full-bleed masters
//     used for Linux hicolor PNGs)
//   recrest-icon-tray-{light,dark}.svg                    (monochrome chevrons
//     used for the tray icon — one set, shared by prod and dev. macOS treats
//     it as a template image and tints to menubar color; Windows swaps
//     light/dark on `WindowEvent::ThemeChanged`. The dev tooltip
//     (`identity::current_tray_tooltip()`) differentiates dev from prod.)
//
// Output layout (mirrored under `icons/` for prod and `icons-dev/` for dev):
//
//   icons/mac/
//     icon.icns          ← from mac-light (primary)
//     icon-light.icns    ← copy of icon.icns (symmetry with dark)
//     icon-dark.icns     ← from mac-dark   (runtime swap in set_macos_app_icon)
//   icons/windows/
//     icon.ico           ← from mac-light
//     icon-light.png     ← 128×128 from mac-light
//     icon-dark.png      ← 128×128 from mac-dark (runtime swap on ThemeChanged)
//     Square{30,44,71,89,107,142,150,284,310}x*Logo.png, StoreLogo.png
//                         ← MSIX tile assets from mac-light
//   icons/linux/
//     {32,64,128,256,512}.png  ← hicolor PNGs from full-bleed light
//                                  (256 is the 128@2x rename)
//   icons/tray/
//     tray-template.png       ← 44×44 from tray-light    (macOS template)
//     tray-template@2x.png    ← 88×88 from tray-light    (retina @2x)
//     tray-light.png          ← 32×32 from tray-light    (Windows light)
//     tray-dark.png           ← 32×32 from tray-dark     (Windows dark)
//
// Tray is generated once into `icons/tray/` and shared between prod and dev
// builds. macOS tray icons are conventionally monochrome (template images
// auto-tinted by the menu bar) and Windows/Linux trays follow the same
// minimal aesthetic — dev/prod distinction would just clutter the slot.
//
// `tauri icon` also writes `android/` + `ios/` trees that we don't ship, so
// those directories are skipped on copy.

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
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

function runTauriIcon(svg, outDir, extraArgs = []) {
  execFileSync(
    yarnCmd,
    [...yarnArgsPrefix, "tauri", "icon", svg, "-o", outDir, ...extraArgs],
    { cwd: appRoot, stdio: "inherit" },
  );
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function copyOne(fromDir, fromName, toDir, toName = fromName) {
  copyFileSync(join(fromDir, fromName), join(toDir, toName));
}

// MSIX tile asset filenames that `tauri icon` emits alongside icon.ico.
const MSIX_TILES = [
  "Square30x30Logo.png",
  "Square44x44Logo.png",
  "Square71x71Logo.png",
  "Square89x89Logo.png",
  "Square107x107Logo.png",
  "Square142x142Logo.png",
  "Square150x150Logo.png",
  "Square284x284Logo.png",
  "Square310x310Logo.png",
  "StoreLogo.png",
];

// One variant = one set of output directories (icons/ or icons-dev/) plus
// the SVG sources that feed it. Tray is intentionally NOT per-variant —
// see the trailing block after the variants loop.
const variants = [
  {
    label: "prod",
    outRoot: "src-tauri/icons",
    macLight: "src/assets/logos/recrest-icon-mac-light.svg",
    macDark: "src/assets/logos/recrest-icon-mac-dark.svg",
    linuxLight: "src/assets/logos/recrest-icon-light.svg",
  },
  {
    label: "dev",
    outRoot: "src-tauri/icons-dev",
    macLight: "src/assets/logos/recrest-icon-mac-dev-light.svg",
    macDark: "src/assets/logos/recrest-icon-mac-dev-dark.svg",
    linuxLight: "src/assets/logos/recrest-icon-dev-light.svg",
  },
];

// Tray sources — shared by both builds (monochrome, single set).
const TRAY_LIGHT_SVG = "src/assets/logos/recrest-icon-tray-light.svg";
const TRAY_DARK_SVG = "src/assets/logos/recrest-icon-tray-dark.svg";

// CLI filter: `--dev` or `--prod` to regen only that set. No flag = both.
// Used by `gen:dev-icons` / `gen:prod-icons` in package.json for quick
// iteration when you're only editing one variant's SVGs.
const args = new Set(process.argv.slice(2));
const wantDev = args.has("--dev");
const wantProd = args.has("--prod");
const selected = wantDev === wantProd
  ? variants
  : variants.filter((v) => (wantDev ? v.label === "dev" : v.label === "prod"));

const tmp = mkdtempSync(resolve(tmpdir(), "recrest-icon-"));
try {
  for (const variant of selected) {
    console.log(`\n=== ${variant.label} ===`);
    const outRoot = resolve(appRoot, variant.outRoot);
    const macDir = join(outRoot, "mac");
    const winDir = join(outRoot, "windows");
    const linuxDir = join(outRoot, "linux");
    ensureDir(macDir);
    ensureDir(winDir);
    ensureDir(linuxDir);

    // --- mac + windows from mac-light (primary) ---
    const stageMacLight = resolve(tmp, `${variant.label}-mac-light`);
    console.log(`→ ${variant.label}/mac-light: ${variant.macLight}`);
    runTauriIcon(variant.macLight, stageMacLight);

    // mac
    copyOne(stageMacLight, "icon.icns", macDir, "icon.icns");
    copyOne(stageMacLight, "icon.icns", macDir, "icon-light.icns");

    // windows
    copyOne(stageMacLight, "icon.ico", winDir, "icon.ico");
    copyOne(stageMacLight, "128x128.png", winDir, "icon-light.png");
    for (const tile of MSIX_TILES) {
      copyOne(stageMacLight, tile, winDir);
    }

    // --- mac-dark + windows dark PNG from mac-dark ---
    const stageMacDark = resolve(tmp, `${variant.label}-mac-dark`);
    console.log(`→ ${variant.label}/mac-dark: ${variant.macDark}`);
    runTauriIcon(variant.macDark, stageMacDark);
    copyOne(stageMacDark, "icon.icns", macDir, "icon-dark.icns");
    copyOne(stageMacDark, "128x128.png", winDir, "icon-dark.png");

    // --- linux hicolor PNGs from the full-bleed light SVG ---
    const stageLinux = resolve(tmp, `${variant.label}-linux`);
    console.log(`→ ${variant.label}/linux: ${variant.linuxLight}`);
    runTauriIcon(variant.linuxLight, stageLinux);
    copyOne(stageLinux, "32x32.png", linuxDir, "32x32.png");
    copyOne(stageLinux, "64x64.png", linuxDir, "64x64.png");
    copyOne(stageLinux, "128x128.png", linuxDir, "128x128.png");
    // 256x256 isn't emitted by default — reuse the 128@2x file under its
    // hicolor-friendly name. tauri icon's 128@2x is a true 256px PNG.
    copyOne(stageLinux, "128x128@2x.png", linuxDir, "256x256.png");
    // 512x512 isn't in the default bundle either; render explicitly.
    const stageLinux512 = resolve(tmp, `${variant.label}-linux-512`);
    runTauriIcon(variant.linuxLight, stageLinux512, ["--png", "512"]);
    copyOne(stageLinux512, "512x512.png", linuxDir, "512x512.png");
  }

  // --- tray (shared, single set under icons/tray/) ---
  // Skip when only --dev was requested (tray doesn't live under icons-dev/).
  if (!wantDev || wantProd) {
    console.log("\n=== tray (shared) ===");
    const trayDir = resolve(appRoot, "src-tauri/icons/tray");
    ensureDir(trayDir);

    const stageTrayLight = resolve(tmp, "tray-light");
    console.log(`→ tray/light: ${TRAY_LIGHT_SVG}`);
    // `--png 44,88,32` yields exactly those three sizes (`tauri icon` skips
    // the default bundle when custom PNG sizes are set).
    runTauriIcon(TRAY_LIGHT_SVG, stageTrayLight, ["--png", "44,88,32"]);
    copyOne(stageTrayLight, "44x44.png", trayDir, "tray-template.png");
    copyOne(stageTrayLight, "88x88.png", trayDir, "tray-template@2x.png");
    copyOne(stageTrayLight, "32x32.png", trayDir, "tray-light.png");

    const stageTrayDark = resolve(tmp, "tray-dark");
    console.log(`→ tray/dark: ${TRAY_DARK_SVG}`);
    runTauriIcon(TRAY_DARK_SVG, stageTrayDark, ["--png", "32"]);
    copyOne(stageTrayDark, "32x32.png", trayDir, "tray-dark.png");
  }

  console.log("\nDone.");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
