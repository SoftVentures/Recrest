# Installer branding assets

SVG-Master-Dateien und generierte Bitmaps für die plattformspezifischen
Tauri-Installer (Windows NSIS, macOS DMG).

## Struktur

- `sources/` — SVG-Master, **Quelle der Wahrheit**. Committed.
- `build/`   — Generierte BMP/PNG-Dateien. **Ebenfalls committed**, damit der
  Release-Build keinen Node-Toolchain-Schritt auf allen drei Runnern braucht.
  Bei Design-Änderungen: SVG anpassen, neu generieren, beide zusammen committen.
- `generate.mjs` — Renderer (resvg + jimp, pure JS, plattformunabhängig).

## Regenerieren

```bash
yarn workspace @recrest/app gen:installer-assets
```

Nach dem Lauf zeigt `git status` sowohl das SVG-Delta als auch die
neu-erzeugten Bitmaps — alles im selben Commit mitnehmen.

## Warum BMP für NSIS

Die MUI2-Makros im NSIS-Installer (Welcome/Finish-Page-Branding) akzeptieren
historisch nur 24-bit BMP ohne Alpha. PNG-Fallback gibt es nicht.

## Warum zwei DMG-PNGs

macOS Finder rendert den DMG-Background auf Retina-Displays in 2×-Auflösung.
Tauri bundled beide Varianten, wenn sie mit der `@2x`-Konvention nebeneinander
liegen.
