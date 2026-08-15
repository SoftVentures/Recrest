# Linux-Skalierung & Paketierung — Audit August 2026

Findings aus einem Drei-Domänen-Audit auf `develop` (`8a72822`), ausgelöst durch zwei
Nutzerberichte von Linux/Wayland: (1) Schriftgröße verstellen vergrößert die ganze UI und das
Drumherum verschwindet, (2) die UI passt sich nicht an den Bildschirm an und ist viel zu klein.
Dazu die Frage nach Paketen für weitere Distributionen.

Jeder Eintrag sagt, wie er verifiziert wurde — reine Lese-Analyse ist als solche markiert, damit
die wackeligen Punkte sichtbar wackelig bleiben. Einzelne Punkte tragen zusätzlich eine
**Korrektur … (beim Fixen verifiziert)**: die Erstfassung war dort zu scharf, der korrigierte Text
gilt.

Sortiert nach Schaden, nicht nach Bereich.

---

## Status nach diesem Change Set

Der Audit war ursprünglich als reine Bestandsaufnahme geschrieben („nichts hiervon ist gefixt").
Das gilt nicht mehr: der **Paketierungsteil ist implementiert**, der **Skalierungsteil nur zur
Hälfte**. Der Stand pro Punkt:

| Punkt      | Thema                                                             | Status                                                                           |
| ---------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1          | Launcher execs den falschen Binärnamen, Launcher nicht ausführbar | ✅ gefixt — Launcher probt beide Schreibweisen, Quelldatei auf `755`             |
| 2          | Zwei Menüeinträge, einer tot                                      | ✅ gefixt — `deb`/`rpm` nutzen `desktopTemplate` statt des `files`-Tricks        |
| 3          | `deb.depends` unvollständig + Duplikate                           | ✅ gefixt                                                                        |
| **4**      | **`zoom` verkleinert die Layout-Box**                             | ❌ **nicht hier** — Branch `feature/rem-scaling-migration`                       |
| **5**      | **„Schriftgröße" ist kein Schriftgrößen-Regler**                  | ❌ **nicht hier** — dito                                                         |
| 6          | WebKitGTKs `xft-dpi`-Page-Zoom                                    | ⚠️ offen (upstream); nur der Doku-Drift im Launcher ist korrigiert               |
| 7          | Fenstergröße nie gegen den Monitor geklemmt                       | ✅ gefixt — `app/src-tauri/src/window_geometry.rs`                               |
| 8          | `window-state` restauriert physische Pixel                        | ✅ gefixt — `clamp_size` + `persisted_state_flags` (dito)                        |
| **9**      | **MUI-Overlays liegen außerhalb des Zooms**                       | ❌ **nicht hier** — dito                                                         |
| 10         | `AddRepoModal` 1200 px ohne `maxWidth`                            | ✅ gefixt — `GeneralModal` deckelt auf `vw`/`vh`                                 |
| **11**     | **Nichts skaliert nach oben**                                     | ❌ **nicht hier** — dito                                                         |
| **12**     | **`uiScale` ist toter Code im Renderer**                          | ❌ **nicht hier** — dito                                                         |
| 13         | `bundle.linux.rpm` fehlt                                          | ✅ gefixt (mit Korrektur, siehe unten)                                           |
| 14         | Updater auf keinem Distro-Kanal gegated                           | ✅ gefixt — `app/src-tauri/src/update/channel.rs`                                |
| 15         | Keine AppStream-Metadaten                                         | ✅ gefixt — `resources/eu.softventures.recrest.metainfo.xml`, im Release gegated |
| 16         | Icon-Set unvollständig                                            | ✅ gefixt — 32–512 in `deb`/`rpm`/`AppImage`                                     |
| P2-Liste   | Chrome-Offset, Drag-Region, nicht schrumpfbare Panes, `nowrap`    | ❌ offen                                                                         |
| Doku-Drift | README, `docs/RELEASE.md`, Checkliste, Launcher-Kommentar         | ✅ gefixt                                                                        |

**Ausdrücklich nicht enthalten: 4, 5, 9, 11, 12.** Das ist genau der `zoom`→`rem`-Umbau — also die
Ursache der _beiden ursprünglichen Nutzerberichte_, mit denen dieser Audit begann. Dieser Change Set
macht das Linux-Paket startfähig und den Updater distro-sicher; er behebt **nicht**, dass der
Schriftgrößen-Regler die ganze UI zoomt und die App auf großen Bildschirmen zu klein bleibt. Das
liegt im separaten Branch `feature/rem-scaling-migration`.

Zwei Punkte bleiben unverifizierbar, solange kein Linux-Host im Spiel ist: die Auswirkung von
`deb.desktopTemplate` auf das **AppImage** (derselbe Bundler-Pfad, aber anderes Ausgabelayout) und
alles unter „Nur auf einem Wayland-Host verifizierbar" am Ende des Dokuments.

---

## P0 — Das Linux-Paket startet nicht

### 1. `.deb` installiert `/usr/bin/Recrest`, der Launcher execs `/usr/bin/recrest`

`app/src-tauri/resources/recrest-launcher.sh:22`, `app/src-tauri/Cargo.toml:22` (`[[bin]] name = "Recrest"`).

Der Launcher macht `exec /usr/bin/recrest "$@"` — kleingeschrieben. Das Binary heißt im Paket
`Recrest`. Auf einem case-sensitiven Dateisystem, also auf jedem normalen Linux, existiert
`/usr/bin/recrest` nicht.

Der Kommentar direkt darüber (`recrest-launcher.sh:16-18`) behauptet das Gegenteil:

> the bundle installs the Tauri-built executable under its native `recrest` name

Das ist falsch. Kein Symlink, kein `postinst` gleicht es aus.

**Verifiziert** am veröffentlichten Artefakt `recrest-v0.11.0-linux-x64.deb` (GitHub Release
`v0.11.0`), entpackt mit `ar x` + `tar tzvf data.tar.gz`. Vollständige Dateiliste des Pakets:

```
-rwxr-xr-x  24249856  usr/bin/Recrest                                  <- großes R
-rw-r--r--       911  usr/bin/recrest-launcher                         <- execs /usr/bin/recrest
-rw-r--r--       208  usr/share/applications/Recrest.desktop
-rw-r--r--       354  usr/share/applications/recrest.desktop
-rw-r--r--      4094  usr/share/icons/hicolor/256x256/apps/Recrest.png
-rw-r--r--      4094  usr/share/icons/hicolor/256x256/apps/recrest.png
-rw-r--r--       648  usr/share/icons/hicolor/32x32/apps/Recrest.png
-rw-r--r--      2133  usr/share/icons/hicolor/128x128/apps/Recrest.png
-rw-r--r--      2133  usr/share/icons/hicolor/128x128/apps/recrest.png
-rw-r--r--      1156  usr/share/icons/hicolor/64x64/apps/recrest.png
```

Keine Symlinks (alle Einträge `-rw`/`-rwx`), `control.tar.gz` enthält nur `control` + `md5sums`,
also kein Skript, das nachträglich verlinkt.

**Nachtrag — ein zweiter, unabhängiger P0 in derselben Zeile.** `usr/bin/recrest-launcher` ist
`-rw-r--r--`, also **nicht ausführbar**. Der Start wäre damit auch mit korrektem Binärnamen
gescheitert. Das steht oben in der Dateiliste und ist beim ersten Durchgang übersehen worden.
Ursache: der Bundler kopiert `files`-Einträge per `fs::copy`, was den Modus der Quelldatei erbt —
und `app/src-tauri/resources/recrest-launcher.sh` lag im Repo mit 644. Beim deb-Tarring greift
zusätzlich `HeaderMode::Deterministic`, das nur das User-Execute-Bit weiterträgt. Fix: `chmod 755`
auf die Quelldatei (git zeichnet den Moduswechsel auf).

**Fix:** entweder `mainBinaryName: "recrest"` in `tauri.conf.json` setzen, oder den Launcher auf
`exec /usr/bin/Recrest` umstellen. Ersteres ist sauberer, weil dann auch der von Tauri generierte
Desktop-Eintrag stimmt (siehe Punkt 2). Der AUR-PKGBUILD ist davon **nicht** betroffen — er
installiert das Binary explizit als `usr/bin/recrest` (`packaging/aur/recrest/PKGBUILD:74`).

### 2. Zwei Menüeinträge, einer davon tot, der andere ohne Launcher und ohne Deep Links

Das Paket installiert **beide** Desktop-Dateien. Auf case-sensitiven Dateisystemen koexistieren sie,
der Nutzer sieht zwei identisch benannte „Recrest"-Einträge.

`Recrest.desktop` (208 B, von Tauri generiert):

```ini
[Desktop Entry]
Categories=Development;
Comment=Lightweight developer dashboard
Exec=Recrest
StartupWMClass=Recrest
Icon=Recrest
Name=Recrest
Terminal=false
Type=Application
MimeType=x-scheme-handler/recrest
```

`recrest.desktop` (354 B, unser `app/src-tauri/resources/recrest.desktop`, via
`tauri.conf.json:104`/`:114` als `files`-Eintrag eingespielt):

```ini
[Desktop Entry]
Type=Application
Name=Recrest
GenericName=Developer Dashboard
Comment=Lightweight developer dashboard for local repos, PRs, and CI
Exec=recrest-launcher %U
Icon=recrest
Terminal=false
Categories=Development;
StartupNotify=true
StartupWMClass=Recrest
MimeType=x-scheme-handler/recrest;
Keywords=git;github;gitlab;bitbucket;pullrequest;ci;
```

Daraus folgt:

|                                            | `Recrest.desktop`                | `recrest.desktop`           |
| ------------------------------------------ | -------------------------------- | --------------------------- |
| startet überhaupt                          | ✅ `Exec=Recrest`                | ❌ toter Launcher (Punkt 1) |
| `GDK_BACKEND`-Wahl (Wayland/X11)           | ❌ Launcher umgangen             | ✅ (wirkungslos)            |
| `%U` → Deep Links `recrest://`             | ❌ fehlt, URL wird nie übergeben | ✅ (wirkungslos)            |
| `StartupNotify`, `Keywords`, `GenericName` | ❌                               | ✅ (wirkungslos)            |

Der funktionierende Eintrag ist also genau der ohne Launcher und ohne Deep-Link-Übergabe. **Damit
ist die gesamte Wayland-/X11-Backend-Logik in `recrest-launcher.sh` auf `.deb`-Installationen
faktisch nie aktiv.** AppImage-Nutzer, die das Image direkt starten, umgehen den Launcher ebenfalls
(AppRun execs das Hauptbinary).

**Verifiziert** am Artefakt (beide Dateien via `tar xzOf` direkt aus dem Archiv gelesen — beim
Entpacken auf macOS überschreiben sie sich gegenseitig, das ist eine Falle bei der Nachprüfung).

**Fix:** `deb.desktopTemplate` / `rpm.desktopTemplate` statt des `files`-Tricks verwenden, damit
Tauri **eine** Datei aus unserer Vorlage generiert statt zwei nebeneinander zu legen.

### 3. `.deb`-`Depends` ist unvollständig und hat Duplikate

Aus dem `control` des veröffentlichten Pakets:

```
Depends: libwebkit2gtk-4.1-0, libgtk-3-0, libayatana-appindicator3-1, libwebkit2gtk-4.1-0, libgtk-3-0
```

Zwei Einträge doppelt (`tauri.conf.json:100-102` listet sie zusätzlich zu Tauris Automatik).
Es fehlen gegenüber dem AUR-PKGBUILD, der beide begründet (`packaging/aur/recrest/PKGBUILD:10-18`):

- **`desktop-file-utils`** — ohne das läuft der `update-desktop-database`-Trigger nicht, also wird
  `x-scheme-handler/recrest` nie registriert und Deep Links tun nichts.
- **`librsvg2-2`** (`librsvg`) und **`dbus`**.

**Fix:** `bundle.linux.deb.depends` bereinigen und ergänzen.

---

## P1 — Skalierung

Vorab die Einordnung, weil sie die Priorisierung ändert: **das Schriftgrößen-Problem ist kein
Linux-Bug.** Es reproduziert in Chromium und WebKit identisch (Messung unten). Auf Linux fällt es
nur stärker auf, weil dort eine **zweite** Zoom-Ebene darüberliegt (Punkt 6).

### 4. `zoom` verkleinert die Layout-Box, die Media Queries merken es nicht

`app/src/styles/globals.css:31-38`:

```css
#root {
  zoom: var(--ui-scale);
  width: calc(100vw / var(--ui-scale));
  height: calc(100vh / var(--ui-scale));
  overflow: hidden;
}
```

`--ui-scale` ist 0.94 / 1 / 1.12 / 1.25 je Schriftgrößenstufe
(`app/src/theme/ThemeWrapper.tsx:31-42`, gesetzt in `:241`).

Die Kompensation ist rechnerisch korrekt — das gezoomte `#root` füllt exakt den Viewport, es
entsteht keine OS-Scrollbar. Der Defekt ist ein anderer: `window.innerWidth` und `matchMedia`
melden weiterhin den **echten** Viewport, während das Layout nur noch den geteilten Platz hat.

**Verifiziert** per Playwright gegen `yarn dev:web`, Viewport 1440×900, beide Engines:

| Stufe  | `--ui-scale` | `window.innerWidth` | `#root` computed width |
| ------ | ------------ | ------------------- | ---------------------- |
| sm     | 0.94         | 1440                | 1531.9 px              |
| md     | 1            | 1440                | 1440 px                |
| lg     | 1.12         | 1440                | 1285.7 px              |
| **xl** | **1.25**     | **1440**            | **1152 px**            |

Chromium und WebKit liefern dieselben Werte (WebKit 26.4 via Playwright). Bei „Extra large" gehen
also **288 px Layout-Breite** verloren, ohne dass ein einziger Breakpoint davon erfährt.

Konsequenz an den beiden Konsumenten:

- `app/src/hooks/useResponsiveSidebar.ts:12` (`COMPACT_LAYOUT_BREAKPOINT_PX = 1200`) löst nicht aus
  → die Sidebar bleibt bei 209 px (`Sidebar/index.tsx:96`) in einer effektiv 1152-px-Box.
- `Header.styles.tsx:61/107/143` blenden ihre Elemente nicht aus, obwohl der Platz real fehlt.

Zusammen mit `overflow: hidden` auf `#root` ist das wörtlich „das Drumherum ist nicht mehr zu
sehen": abgeschnitten statt umgebrochen, ohne Scroll-Ausweg.

**Fix-Richtung:** `--ui-scale` an `html { font-size }` hängen statt an `zoom`. Dann bleiben die
Viewport-px konstant und die Media Queries stimmen wieder. Das setzt Punkt 5 voraus.

### 5. „Schriftgröße" ist gar kein Schriftgrößen-Regler — 96 % der Werte sind harte px

Zwei Mechanismen laufen parallel:

1. `app/src/theme/index.ts:77-88` setzt `typography.fontSize` auf 12 / 13 / 15 / 17 px.
2. `ThemeWrapper.tsx:31-42` setzt zusätzlich `--ui-scale` (Punkt 4).

Zweig 1 ist praktisch wirkungslos: von 106 Text-Leaf-Nodes reagieren auf 13 px → 17 px genau
**2 (1,9 %)**. Grund: alle Typography-Varianten sind mit rohen px-Zahlen überschrieben
(`theme/index.ts:94-108`), es erbt fast nichts die Body-Größe.

Einheiten-Audit über `app/src/**/*.{ts,tsx}`, 532 `fontSize:`-Vorkommen:

| Art                 | Anzahl | Anteil   |
| ------------------- | ------ | -------- |
| unitless = harte px | ~511   | **96 %** |
| `rem`               | **0**  | 0 %      |
| `em`                | 2      | 0,4 %    |
| `inherit`/Token     | ~19    | 3,6 %    |

Im gesamten `app/src` gibt es **genau ein** `rem` (`Header.styles.tsx:79`), **null**
`pxToRem`, **null** Container Queries und 3 `clamp()/min()/max()`.

Der Regler heißt „Schriftgröße", ist aber implementiert als globaler UI-Zoom. Genau das beschreibt
der Nutzerbericht mit „die ganze UI vergrößert sich".

**Fix-Richtung:** `typography.htmlFontSize` setzen, Basisgrößen auf `rem`/`pxToRem` heben. Das ist
der eigentliche Umbau und Voraussetzung für Punkt 4.

### 6. Linux hat eine dritte, unbekannte Zoom-Ebene: WebKitGTKs `xft-dpi`-Page-Zoom

`docs/plans/01-bugs-and-ui-polish.md:394` trennt zwei Layer:

> **OS/Compositor-Scale (C.6)** … **App-interne UI-Scale (D.6):** CSS-Variable `--ui-scale`,
> multipliziert sich mit OS-Scale.

Es gibt einen dritten. WebKitGTK hat das ehemalige _Text_-Scaling aus `gtk-xft-dpi` in einen
**Page**-Scaling-Faktor umgebaut. GNOMEs „Große Schrift" setzt
`org.gnome.desktop.interface text-scaling-factor` (Large-Text-Toggle = 1.25), GTK spiegelt das nach
`gtk-xft-dpi`, WebKitGTK zoomt daraufhin die komplette Seite. Der CSS-Viewport schrumpft, das
Fenster bleibt gleich groß — und trifft dann auf Punkt 4.

Beleg für die Kette unabhängig von uns: in
[tauri#5600](https://github.com/tauri-apps/tauri/issues/5600) meldet `window.devicePixelRatio`
`-0.0208` statt `2`, weil WebKitGTKs `xftDPI()` das Sentinel `-1` von
`gdk_screen_get_resolution()` nicht behandelt — und der Wert landet im Page-Zoom-Faktor.

Offene Upstream-Issues:

| Issue                                                                                                  | Status          | Letztes Update |
| ------------------------------------------------------------------------------------------------------ | --------------- | -------------- |
| [tauri#5600 — Incorrect DPI scaling on Wayland/Linux](https://github.com/tauri-apps/tauri/issues/5600) | offen seit 2022 | 2026-07-02     |
| [tauri#14590 — DPI Scaling Issue on Ubuntu Wayland](https://github.com/tauri-apps/tauri/issues/14590)  | offen           | 2025-12        |
| [wry#1727 — Text blur after resize on Wayland](https://github.com/tauri-apps/wry/issues/1727)          | offen           | 2026-05        |

Damit ist die Bewertung in `docs/plans/00-acceptance-checklist.md:57` überholt:

> **PARTIAL:** Wayland fractional scaling delivers correct nativ scaling automatically
> (kein Eingriff nötig).

**Zusatzbefund:** `recrest-launcher.sh:6-9` begründet die Wayland-Präferenz mit „native fractional
scaling via `wp_fractional_scale_v1`". Der Stack ist aber GTK **3** (`gtk`/`gdk` 0.18.2 laut
`Cargo.lock`), und GTK3 implementiert dieses Protokoll nicht — nur GTK4. tao speichert den
Scale-Faktor konsequenterweise als `AtomicI32`, also ganzzahlig, ohne Repräsentation für
fraktionales Scaling.

### 7. Fenstergröße wird nie gegen den Monitor geklemmt

`tauri.conf.json:18-21`: `width: 1280`, `height: 800`, `minWidth: 1100`, `minHeight: 720`, kein
`maxWidth`, kein `maximized`. Dazu `lib.rs:669` als Laufzeit-Duplikat der Mindestgröße.

Im gesamten Rust-Code gibt es **null** Treffer für `scale_factor`, `current_monitor`,
`primary_monitor`, `available_monitors`, `set_size`, `inner_size`, `maximize`. Die Startgröße ist
eine harte Konstante ohne jeden Monitorbezug — auf 4K ohne wirksames Scaling ist das rund ein
Drittel der Breite, also „viel zu klein".

Die Mindestgröße 1100×720 ist zusätzlich unabhängig von `--ui-scale`: bei `xl` bleiben davon
`1100/1.25 = 880 × 576` CSS-px übrig, deutlich unter der Design-Untergrenze.

**Fix-Richtung:** im `setup`-Hook `current_monitor()` lesen, Start- und Mindestgröße gegen die
Workarea klemmen, danach `center()`.

### 8. `window-state` restauriert physische Pixel über einen ganzzahligen Scale

`lib.rs:587-596` aktiviert `SIZE | POSITION | MAXIMIZED | FULLSCREEN`; `lib.rs:1124-1140`
schreibt die Geometrie zusätzlich bei **jedem** `CloseRequested` zurück, also auch beim
Close-to-Tray.

Im Plugin (2.4.1) wird `SIZE` als `PhysicalSize` **ohne jede Validierung** gesetzt (`:211-216`);
nur `POSITION` läuft durch ein `Monitor::intersects`-Gate (`:191-208`), und selbst dort wird bei
Nicht-Überlappung nur _nicht gesetzt_, nie korrigiert. tao teilt beim Anwenden durch den aktuellen
Integer-Scale (`window.rs:490-491`), der laut `:365` erst per `connect_scale_factor_notify`
aktualisiert wird — der Restore läuft aber in `on_window_ready`, auf Wayland potenziell bevor die
Surface einem Output zugeordnet ist.

Weicht der Scale beim Speichern vom Scale beim Restore ab, driftet die Größe um den Faktor der
Differenz — und wird beim nächsten Schließen zementiert. Auf 2× also halb oder doppelt so groß.

**Nur auf einem Wayland-Host verifizierbar.** Messung: `~/.local/share/eu.softventures.recrest/`
Window-State über mehrere Starts diffen und mit `devicePixelRatio` korrelieren.

**Fix-Richtung:** nach `restore_state` einen Sanity-Pass — `inner_size()` gegen
`current_monitor().work_area()` klemmen, bei Überschreitung auf Default + `center()` zurückfallen.
Auf Wayland `StateFlags::POSITION` weglassen (`gtk_window.move_()` ist dort ohnehin ein No-op).

### 9. Alle MUI-Overlays liegen außerhalb des Zooms

`zoom` sitzt auf `#root`, MUI portaliert nach `document.body`. Im gesamten Repo: **null**
`disablePortal`, **null** `container`-Prop. Menüs, Modals, Drawers, Tooltips bleiben also bei 1×,
während der Rest skaliert.

Empirisch bei `--ui-scale: 1.25`: MenuItem-Höhe 33 px (unskaliert) gegen In-Root-Button 28 px
(= 22,4 Layout-px × 1,25).

Das war bekannt und bewusst akzeptiert — `docs/plans/02-material-ui-migration.md:524`:

> Popper/Menu/Dialog portalen zu `document.body`, also außerhalb des Scaling. Keine Migration nötig.

Diese Bewertung ist der Defekt. Umgekehrt liegt der Backdrop von `OverallSearch`
(`OverallSearch.styles.tsx:10-17`, `position: fixed`) **innerhalb** des gezoomten Subtrees und
bekommt dadurch einen skalierten Containing Block.

### 10. `AddRepoModal` ist 1200 px breit, ohne `maxWidth`

`GeneralModal/index.tsx:24` — `width: $modalWidth ?? 560` starr, kein `maxWidth`; `:64` setzt
`maxWidth: "none !important"` aufs Paper, `:57` `overflow: "hidden"`.
`AddRepoModal/index.tsx:53` übergibt `modalWidth={1200}`.

Da Modals nicht gezoomt werden (Punkt 9), gilt das gegen den echten Viewport: schmalere Fenster
clippen beidseitig, ohne Scroller. `GeneralDrawer` macht es richtig
(`GeneralDrawer/index.tsx:70-71`: `width` **und** `maxWidth: "100vw"`).

**Zwei Korrekturen** (beim Fixen gemessen):

1. Die ursprünglich genannten **1240 px sind falsch**. MUIs `CssBaseline` setzt global
   `border-box`, das Padding liegt also _innerhalb_ der 1200. Der Dialog ist real 1200 px breit
   (plus 2 px Rahmen).
2. Gravierender ist ein Defekt, den dieser Punkt gar nicht benannt hatte: **die vertikale
   Obergrenze fehlte wirksam.** Das Paper wird per Flexbox zentriert, seine Höhe ist damit
   _indefinite_ — ein prozentuales `maxHeight` auf `Root` berechnet sich zu `none` und war ein
   stiller No-op. Bei einem 720-px-Fenster saß `modalHeight={720}` in einem Paper mit
   `calc(100vh - 64)`, dessen `overflow: hidden` die Aktionsleiste abgeschnitten hat.

**Fix:** Obergrenzen in `vw`/`vh` statt in Prozent (Modals sind nach `document.body` portaliert,
Viewport-Einheiten sind dort die korrekte Bezugsgröße), plus `boxSizing: "border-box"` lokal
gepinnt, damit die Invariante einen Wechsel des Baseline-Resets überlebt. Deckt alle 13
Aufrufstellen ab (nicht 14 — nachgezählt).

### 11. Nichts skaliert nach oben

Theme-Breakpoints enden bei `xl: 1280` (`theme/index.ts:107`). Alle 11 Media Queries im Repo sind
`max-width`; **keine** `min-width` über 1280. `useDevice.ts` und `useResponsiveSidebar.ts`
kollabieren ausschließlich nach unten, es gibt keinen `wide`-Zweig.

Gemessen bei 2560×1440: `#root` ist 2560 breit, die Textgrößenverteilung ist **identisch** zu
1280 — 13 px (34×), 12,5 px (29×), 11,5 px (26×). `html` bleibt bei 16 px.

Zusätzlich läuft `responsiveFontSizes(theme)` (`theme/index.ts:294`) ins Leere: es überspringt
`body1`/`body2`/`caption`/`overline` (`remFontSize <= 1` → early return) und behandelt nur `h4`,
das dabei auf `1.25rem` **runter**gesetzt wird.

### 12. `uiScale` ist end-to-end spezifiziert und im Renderer toter Code

Definiert in `shared/src/types/settings.ts:160`, Rust `config/settings.rs:345-346`,
Patch-Command `commands/settings.rs:48`, persistiert in `settings.json` — und hat **keinen
einzigen** Renderer-Konsumenten außer Fixtures/Seeds.

`docs/plans/01-bugs-and-ui-polish.md:474-479` sah es anders vor: `--ui-scale` auf `:root`,
„alle `rem`/`em` skalieren mit", Slider 0.8–1.5, Hotkeys `Cmd/Ctrl + +/-/0`. Umgesetzt wurde
`zoom` mit vier festen Stufen ohne `rem`-Basis; die Hotkeys fehlen ganz
(`shortcuts.constants.ts` enthält keine Zoom-Aktion). `00-acceptance-checklist.md` führt **1.D6**
trotzdem als `[x]` erledigt.

**Fix-Richtung:** zwei getrennte Regler — „Schriftgröße" (nur Text, über `rem`) und
„UI-Skalierung" (`uiScale`, alles) — statt eines Reglers, der beides halb macht.

---

## P2 — Weitere Skalierungs-Folgefehler

- **Chrome-Offset ungezoomt geschrieben, gezoomt konsumiert.** `AppLayout.tsx:141` schreibt
  `--recrest-app-chrome-bottom` als ungezoomte px; der Header liegt aber _in_ `#root`. Bei XL ist
  die reale Unterkante `(38+64)·1,25 = 127,5` px, die Variable sagt 102 px → der portalierte
  `GeneralDrawer` startet 25 px zu hoch. Analog `useScrollbarWidth.ts:20-27`.
- **Windows-Drag-Region 25 % zu groß.** `Win11Titlebar/index.tsx:137` meldet
  `rect.{x,y,w,h} * dpr` als Caption-Button-Ausschluss ans OS; `getBoundingClientRect()` liefert
  unter `zoom` visuelle px. Funktionaler Windows-Bug.
- **Nicht schrumpfbare Panes.** `MergeRequests/index.tsx:70-79` (`width: 400`, `flexShrink: 0`),
  `Repos/DetailPane.styles.tsx:8,14-17` (`width: 360`, `flexShrink: 0`) + `RepoList/index.tsx:42`
  (`minWidth: 800`) → Untergrenze ~1168 px. `Dashboard/index.tsx:64,72` nutzt bares `1fr` statt
  `minmax(0, 1fr)` und hat null Breakpoints.
- **21 bare `whiteSpace: "nowrap"`** ohne `textOverflow` (von 83 gesamt), load-bearing u. a.
  `Header.styles.tsx:59-61`, `Changes/index.tsx:163-164`.
- **nivo-Heatmap überläuft unter `zoom`** (bei der visuellen Nachprüfung gefunden).
  `HeatmapCard/index.tsx:142-147` als Host, sichtbar durch `Dashboard/index.tsx:55-62`
  (`overflowY: auto` lässt `overflow-x` zu `auto` rechnen). `ResponsiveHeatMap` misst seinen Host
  mit der zoom-skalierten Box und rendert `<svg width = host × scale>`: bei 1280×800 und `xl`
  ergibt Host 729,4 px ein SVG von 911,75 px → **142 px horizontaler Scrollbereich**
  (`scrollWidth 953` vs `clientWidth 811`), die letzten Stundenspalten sind abgeschnitten.
  **Vorbestehend**, dreifach belegt: tritt auch bei `lg` auf (Host 256,3 → SVG 287,1), auch wenn
  man das Grid auf die alte `2fr 1fr`-Form zwingt (824 vs 811), und auch auf der Activity-Seite,
  die dieser Change Set nicht berührt. Die Container-Query-Stapelung **verstärkt** es von 13 px auf
  142 px, weil die Karte breiter wird und der 25-%-Fehler mit der Breite skaliert.
  **Nicht gefixt, absichtlich:** der Defekt entsteht ausschließlich durch `zoom` und verschwindet
  mit dem rem-Umbau (Punkt 4) von selbst. Eine Krücke hier wäre eine Reparatur an einem
  Mechanismus, den der Branch `feature/rem-scaling-migration` gerade abschafft. **Nach dem Merge
  des Branches gegenprüfen** — falls er dann noch auftritt, ist es ein eigenständiger nivo-Bug.
- **Wayland-CSD.** tao installiert auf Wayland bedingungslos eine GTK-`HeaderBar`
  (`window.rs:90-92`), _bevor_ `:182` `set_decorated(false)` läuft. GTK3 bleibt damit dauerhaft in
  Client-Side-Decorations, `gtk_window_resize()` bemisst inkl. CSD-Chrome. Die Webview-Fläche ist
  also kleiner als die angeforderten 1280×800. Nicht in unserem Code lösbar.

---

## P1 — Paketierung

### Ist-Stand

| Kanal                                                         | Artefakt                    | gebaut             | veröffentlicht                 |
| ------------------------------------------------------------- | --------------------------- | ------------------ | ------------------------------ |
| macOS arm64 / x64                                             | `.dmg`                      | ✅                 | ✅                             |
| Windows x64                                                   | NSIS `.exe`                 | ✅                 | ✅                             |
| Windows arm64                                                 | `.exe`                      | ⚠️ optional        | ⚠️ Fehlen = nur Warning        |
| Linux x86_64                                                  | `.AppImage`, `.deb`, `.rpm` | ✅                 | ✅                             |
| **Linux aarch64**                                             | —                           | ❌                 | ❌                             |
| AUR `recrest` / `recrest-git`                                 | PKGBUILD                    | ✅ lokal           | ❌ nicht auf aur.archlinux.org |
| **AUR `recrest-bin`**                                         | —                           | ❌ existiert nicht | ❌                             |
| Flatpak, Snap, COPR, OBS, Nix, Homebrew, winget, Choco, Scoop | —                           | ❌                 | ❌                             |

Signierung: macOS **ad-hoc** (`tauri.conf.json:81` `signingIdentity: "-"`), keine Notarisierung.
Windows **unsigniert** — die in `release-tauri.yml:363-364` weitergegebenen
`WINDOWS_CERTIFICATE`-Secrets werden vom Tauri-v2-Bundler nicht gelesen (v1-Erbe), der Build bliebe
auch mit gesetzten Secrets unsigniert. Updater-Signierung (minisign) ist aktiv.

### 13. `bundle.linux.rpm` fehlt komplett

`tauri.conf.json:98-120` konfiguriert nur `deb` und `appimage`. Das RPM wird über
`targets: "all"` (`:52`) trotzdem gebaut und als Pflicht-Asset veröffentlicht
(`release-tauri.yml:562`, `:764`, `:892`). Folge:

**Korrektur an diesem Punkt** (beim Fixen verifiziert, die ursprüngliche Fassung war zu scharf):

- Das RPM war **nicht** dependency-frei. `tauri-cli/src/interface/rust.rs:1432-1438` schiebt die
  Sonames automatisch in `rpm.depends`, `dnf` zog webkit2gtk/gtk3/appindicator also über
  `Requires: libwebkit2gtk-4.1.so.0()(64bit)` durchaus mit. Der echte Mangel sind unlesbare
  Soname-Requires statt Paketnamen.
- Ein Desktop-File und `Recrest.png`-Icons **wurden** installiert (`rpm.rs:202-212`).

Die tatsächlichen RPM-Lücken waren damit: kein `recrest-launcher`, keine kleingeschriebenen
`recrest.png`-Icons (`Icon=recrest` löste also nie auf), keine AppStream-Datei. Alle drei löst der
`files`-Block.

**`rpm.depends` bleibt bewusst auf zwei Einträgen.** `tauri.conf.json` ist striktes JSON (der
Release-Workflow liest es mit `jq`), kann also keinen Kommentar an Ort und Stelle tragen — deshalb
steht die Begründung hier: `depends` enthält nur `desktop-file-utils` und `hicolor-icon-theme`,
weil nur diese beiden auf Fedora, openSUSE _und_ Mageia identisch heißen. Bibliotheken gehören
nicht hinein. Ein zwischenzeitlicher Versuch mit `webkit2gtk4.1`, `libayatana-appindicator-gtk3`,
`dbus-libs`, `librsvg2` waren Fedora/RHEL-Paketnamen; openSUSE nennt dieselben Dinge
`libwebkit2gtk-4_1-0`, `libdbus-1-3`, `librsvg-2-2`, das RPM wäre dort schlicht uninstallierbar
geworden. Die Soname-`Requires:`, die `tauri-cli` (`rust.rs:1432-1438`) ohnehin automatisch
injiziert, lösen dagegen auf **jeder** RPM-Distro auf und decken exakt diese Bibliotheken ab. Also:
nicht wieder hinzufügen.

### 14. Der In-App-Updater ist auf keinem Distro-Kanal gegated

`update/mod.rs:41` setzt `"canAutoInstall": true` **unbedingt** auf dem Plugin-Pfad;
`UpdaterBanner/index.tsx:136` zeigt daraus den Install-Button. Es gibt im gesamten Rust- und
TS-Code **null** Treffer für `APPIMAGE`, `APPDIR`, `pacman`, `dpkg`, `install_channel`,
`installChannel`.

Zusätzlich referenziert `latest.json` neben AppImage auch `.deb` und `.rpm`
(`release-tauri.yml:614-616`, `:628-631`). Auf einer pacman-Installation existiert kein passendes
Format.

Debian, Fedora, Arch und Flathub erwarten alle, dass ein paketverwaltetes Binary sich nicht selbst
aktualisiert. Das ist ein Policy-Blocker für **jeden** Distro-Kanal.

**Korrektur an unserer eigenen Doku:** `packaging/aur/README.md:88-91` behauptet, der Install-Button
„macht gar nichts, ohne Fehlermeldung". Das gilt nur für den auto-install-Pfad; der Button
propagiert den Fehler (`commands/update.rs:75` → `UpdaterBanner/index.tsx:93-94` → `toast.error`).
Der Kernbefund (kein Kanal-Gate) stimmt, die Begründung nicht.

### 15. Keine AppStream-Metadaten

Es existiert keine `*.metainfo.xml`. Das ist ein **harter Blocker für Flathub** und sorgt außerdem
dafür, dass Recrest in GNOME Software und KDE Discover ohne Name, Screenshots und Release-Notes
erscheint — auch bei `.deb`/`.rpm`.

### 16. Icon-Set unvollständig

Auf der Platte liegen 32/64/128/256/512 (`app/src-tauri/icons/linux/`), das AUR-Paket installiert
alle fünf. `.deb` und `.AppImage` installieren via `files` nur 64/128/256
(`tauri.conf.json:105-107`, `:115-117`) — **512 und 32 fehlen**, und durch die Doppelung aus
Punkt 2 sind sie zusätzlich inkonsistent auf `Recrest.png`/`recrest.png` verteilt.

### Empfohlene Reihenfolge für neue Kanäle

1. **`recrest-bin` im AUR** — wird in beiden PKGBUILDs bereits als `conflicts` geführt, existiert
   aber nicht. Baut auf dem vorhandenen `.deb`/`.AppImage` auf, erspart Arch-Nutzern einen
   ~20-Minuten-Rust-Build. Der übliche dritte AUR-Slot.
2. **AUR überhaupt publizieren** — beide Pakete existieren nur im Repo, Reichweite heute: null.
3. **`winget`** — Manifest-PR gegen `microsoft/winget-pkgs`, nutzt den vorhandenen NSIS-`.exe`,
   unsignierte Installer sind zulässig. Größter Hebel pro Aufwand.
4. **Homebrew Cask** — nutzt die vorhandenen DMGs; ad-hoc-Signatur erzwingt eine
   Gatekeeper-Hinweiszeile im Cask.
5. **AppStream + Flatpak/Flathub** — größte Reichweite (Fedora Silverblue, Steam Deck, alle
   Immutable-Distros), aber die meiste Arbeit: Offline-Build erzwingt vendored Cargo-/Yarn-Sources,
   die App-ID verlangt `eu.softventures.recrest.desktop`, und der FS-Zugriff
   (`git/scanner.rs` scannt beliebige Roots, `commands/ide.rs` startet fremde Editoren) braucht
   `--filesystem=host` + `org.freedesktop.Flatpak`-Talk, was Review-Diskussionen auslöst.
6. **Linux aarch64** — Voraussetzung für ein sinnvolles `recrest-bin` auf `aarch64`; das PKGBUILD
   deklariert die Architektur bereits (`recrest/PKGBUILD:7`).

**Snap** ist bewusst niedrig priorisiert: Strict Confinement ist mit „beliebige lokale Repos lesen
und fremde Editoren starten" praktisch unvereinbar, `classic` erfordert ein eigenes Review.

---

## Doku-Drift (nebenbei gefunden)

- **`README.md:73-80`** listet Dateinamen, die es nicht gibt: `Recrest_<version>_universal.dmg`,
  `_x64-setup.msi`, `_amd64.AppImage`. Real sind es die Contract-Namen
  `recrest-v<tag>-mac-arm64.dmg` usw. Ein Universal-DMG existiert seit dem Wechsel auf Per-Arch-Legs
  nicht mehr, und der Windows-Download ist der NSIS-`.exe`, nicht das MSI (`README.md:92`). Die
  Shell-Snippets `:120-133` treffen ins Leere. Die Landingpage ist korrekt
  (`landingpage/src/lib/downloadUrl.ts:23-68`).
- **`docs/RELEASE.md`** beschreibt einen Workflow, den es nicht mehr gibt: `:52-53` eine
  3-Runner-Matrix (real: 5 Per-Arch-Legs), `:60` `tauri-action@v0` (real SHA-gepinnt `@v1.0.0`),
  und `:123-125` behauptet, der Updater sei „currently disabled" — er ist aktiv mit gesetztem
  Pubkey.
- **`00-acceptance-checklist.md:57`** (1.C6) und **`:1.D6`** — siehe Punkte 6 und 12.
- **`recrest-launcher.sh:16-18`** — siehe Punkt 1.

---

## Was nachweislich _nicht_ das Problem ist

- **Die Zoom-Kompensationsmathematik.** `calc(100vw / var(--ui-scale))` ist korrekt;
  `#root.getBoundingClientRect()` bleibt über alle vier Stufen exakt beim Viewport, es entsteht
  keine OS-Scrollbar. In Chromium **und** WebKit identisch gemessen.
- **Die Hypothese „auf WebKitGTK fällt `zoom` aus, deshalb wird die App zu klein".** Widerlegt:
  WebKit 26.4 liefert dieselben Werte wie Chromium (Tabelle in Punkt 4).
- **Das AppShell-Grid.** `AppLayout.tsx:44-79` ist vorbildlich — `minmax(0, 1fr)`, `minWidth: 0`
  und `minHeight: 0` durchgezogen.
- **`minWidth: 0`-Hygiene.** 127 von 152 `minWidth`-Deklarationen sind `0`.
- **Horizontales Scrollen.** `overflowX: "hidden"` kommt im Repo nicht vor.
- **Das Viewport-Meta.** `index.html:16` ist neutral, kein `user-scalable=no`. Das Anti-Flash-Script
  berührt nur Theme/Translucency.
- **`StartupWMClass`.** Vorhanden (`recrest.desktop:11`) — die häufigste Ursache für ein
  generisches Wayland-Taskbar-Icon liegt hier nicht vor.
- **Ein erzwungener X11-Fallback.** Der Launcher _bevorzugt_ Wayland, X11 ist nur der Else-Zweig.
- **`GDK_SCALE`/`GDK_DPI_SCALE`.** Werden nicht falsch gesetzt — sie werden schlicht ignoriert.
- **`transparent: true`.** Kein Faktor für die Layout-Skalierung.
- **`sx`-Prop / Tailwind-Reste.** Keine gefunden, die Konvention wird eingehalten.

---

## Nur auf einem Wayland-Host verifizierbar

1. **Punkt 8** — realer `scale_factor` bei `on_window_ready` vs. nach dem ersten `Resized`.
   Window-State über mehrere Starts diffen.
2. **Punkt 6** — ob `text-scaling-factor` tatsächlich als Page-Zoom durchschlägt. Messung:
   `window.devicePixelRatio` und `#root` computed width bei 100 % vs. 125 % Large Text.
3. **Wayland-CSD (P2)** — `window.innerWidth/innerHeight` direkt nach Start gegen die
   angeforderten 1280×800 halten.
4. **Punkt 1/2** — welcher Menüeintrag im installierten Paket startet und ob `GDK_BACKEND` gesetzt
   ist: `tr '\0' '\n' < /proc/$(pgrep -f -n [Rr]ecrest)/environ | grep -E 'GDK_|WAYLAND|WEBKIT'`.
5. Gegenprobe: dieselbe Session einmal mit `GDK_BACKEND=x11` — trennt Wayland-spezifische Ursachen
   (8, CSD) von den layout-seitigen (4, 5).
