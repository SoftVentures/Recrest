#!/usr/bin/env node
/**
 * Rasterisiert die SVG-Master-Dateien unter `sources/` in die vom Tauri-Bundler
 * erwarteten Installer-Branding-Assets:
 *   - NSIS-Header          150×57  BMP (24-bit, kein Alpha)
 *   - NSIS-Sidebar         164×314 BMP
 *   - DMG-Background       660×400 PNG  + 1320×800 @2x
 *
 * SVG → PNG-Buffer via `@resvg/resvg-js` (pure Rust WASM, keine System-Deps);
 * PNG → BMP via `jimp` (pure JS). Beide sind plattformunabhängig.
 *
 * Läuft idempotent: Output wird bei jedem Lauf überschrieben. Outputs sind
 * gitignored, damit nur die SVG-Sources den Audit-Trail bilden.
 */
import { Resvg } from "@resvg/resvg-js";
import { Jimp } from "jimp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcesDir = join(__dirname, "sources");
const buildDir = join(__dirname, "build");

const targets = [
  { src: "nsis-header.svg", out: "nsis-header.bmp", width: 150, height: 57, fmt: "bmp" },
  { src: "nsis-sidebar.svg", out: "nsis-sidebar.bmp", width: 164, height: 314, fmt: "bmp" },
  { src: "dmg-background.svg", out: "dmg-background.png", width: 660, height: 400, fmt: "png" },
  { src: "dmg-background.svg", out: "dmg-background@2x.png", width: 1320, height: 800, fmt: "png" },
];

async function rasterize(svgBuf, width, height) {
  const resvg = new Resvg(svgBuf, { fitTo: { mode: "width", value: width } });
  const pngData = resvg.render().asPng();
  // resvg liefert width-skalierte Ausgabe; für die exakte Zielhöhe in jimp
  // nachpassen (bei SVGs mit korrektem Aspect Ratio ist das No-op).
  const img = await Jimp.fromBuffer(pngData);
  if (img.bitmap.width !== width || img.bitmap.height !== height) {
    img.resize({ w: width, h: height });
  }
  return img;
}

async function main() {
  await mkdir(buildDir, { recursive: true });

  for (const t of targets) {
    const svgPath = resolve(sourcesDir, t.src);
    const outPath = resolve(buildDir, t.out);
    const svgBuf = await readFile(svgPath);
    const img = await rasterize(svgBuf, t.width, t.height);

    if (t.fmt === "bmp") {
      const buf = await img.getBuffer("image/bmp");
      await writeFile(outPath, buf);
    } else {
      const buf = await img.getBuffer("image/png");
      await writeFile(outPath, buf);
    }

    console.log(`  ✓ ${t.out}  (${t.width}×${t.height}, ${t.fmt})`);
  }
}

main().catch((err) => {
  console.error("installer-asset generation failed:", err);
  process.exit(1);
});
