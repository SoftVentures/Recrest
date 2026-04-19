# Installer-Assets

SVG-Quellen für das NSIS- (Windows) und DMG- (macOS) Bundle-Chrome. Tauri
akzeptiert keine SVGs direkt — vor dem ersten `tauri build` einmal zu
Bitmaps exportieren und die Pfade in `app/src-tauri/tauri.conf.json`
ergänzen.

## Asset-Matrix

| Quelle               | Ziel                    | Format      | Zweck                              |
| -------------------- | ----------------------- | ----------- | ---------------------------------- |
| `nsis-header.svg`    | `nsis-header.bmp`       | BMP, 24-bit | NSIS-Header (150 × 57 px)          |
| `nsis-sidebar.svg`   | `nsis-sidebar.bmp`      | BMP, 24-bit | NSIS-Welcome/Finish (164 × 314 px) |
| `dmg-background.svg` | `dmg-background.png`    | PNG @1x     | DMG-Hintergrund (660 × 400 px)     |
| `dmg-background.svg` | `dmg-background@2x.png` | PNG @2x     | DMG-Hintergrund (1320 × 800 px)    |

## Export per ImageMagick

```bash
cd app/src-tauri/installer

# NSIS — BMP 24-bit, keine Alpha
magick nsis-header.svg  -background white -flatten -type TrueColor BMP3:nsis-header.bmp
magick nsis-sidebar.svg -background "#0F1115" -flatten -type TrueColor BMP3:nsis-sidebar.bmp

# DMG — PNG @1x + @2x
magick dmg-background.svg -background "#0F1115" -resize 660x400  dmg-background.png
magick dmg-background.svg -background "#0F1115" -resize 1320x800 dmg-background@2x.png
```

Alternativ über Figma / Affinity öffnen und die Vorgaben beim Export
setzen (24-bit BMP, kein Alpha-Kanal — sonst zeigt NSIS graue Ränder).

## Tauri-Config verdrahten

Nach dem Export folgende Keys in `tauri.conf.json → bundle` ergänzen:

```json
"windows": {
  "nsis": {
    "displayLanguageSelector": true,
    "languages": ["English", "German"],
    "installerIcon": "icons/icon.ico",
    "headerImage": "installer/nsis-header.bmp",
    "sidebarImage": "installer/nsis-sidebar.bmp"
  }
},
"macOS": {
  "minimumSystemVersion": "10.15",
  "dmg": {
    "background": "installer/dmg-background.png",
    "appPosition": { "x": 180, "y": 170 },
    "applicationFolderPosition": { "x": 480, "y": 170 },
    "windowSize": { "width": 660, "height": 400 }
  }
}
```

Erst **nach** erfolgreichem Export committen — sonst bricht
`yarn tauri:build` mit „installer asset not found".
