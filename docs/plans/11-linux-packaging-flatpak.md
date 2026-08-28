# Plan 11 — Linux-Packaging: AppImage raus, AUR live, Flatpak rein

**Status:** Umgesetzt und verifiziert. Der Flatpak-Offline-Build läuft in CI
grün durch und lädt ein installierbares Bundle hoch. Offen bleiben die zwei
Veröffentlichungsschritte (AUR-Push, Flathub-Submission — letzterer erst nach
dem nächsten Release) und die Sandbox-Checks auf einer echten Linux-Session;
siehe „Was offen bleibt".
**Datum:** 2026-08-27
**Vorgänger:** `10-linux-scaling-and-packaging-audit.md` (Befunde 14–16 und „Empfohlene Reihenfolge für neue Kanäle")

## Auslöser

Feedback aus dem produktiven Einsatz auf Arch/Wayland: Die App selbst läuft
fehlerfrei (Scaling, Lesbarkeit, native Builds, beide PKGBUILDs), aber
AppImage soll als Kanal verschwinden und durch Flatpak ersetzt werden. Die
AUR-Pakete liegen seit #115 im Repo und sind nirgends veröffentlicht.

X11 bleibt ungetestet — der einzige aktive Linux-Tester hat keinen X-Server.
Das bleibt ein offener Punkt in `00-acceptance-checklist.md`, kein Blocker
für diesen Plan.

## Entscheidungen

| Frage                              | Entscheidung                                                        |
| ---------------------------------- | ------------------------------------------------------------------- |
| AppImage-Drop vs. Flatpak-Timing   | Beides jetzt, parallel. Kein Warten auf Flathub.                      |
| Flatpak-Sandbox                    | Voller Host-Zugriff via `flatpak-spawn --host`, nicht die kastrierte Variante. |
| Flatpak-Ziel                       | Flathub. Ein selbstgehostetes Repo hätte keinen Reichweitenvorteil gegenüber `.deb`. |

## Ausgangslage: die Update-Story pro Kanal

Der nicht offensichtliche Preis des AppImage-Drops ist, dass AppImage heute der
**einzige** Linux-Kanal mit In-App-Auto-Update ist — `channel.rs:108`
(`can_self_install()`) ist genau `AppImage | Bundle`.

| Kanal              | Update heute                                                        | Nach diesem Plan |
| ------------------ | ------------------------------------------------------------------- | ---------------- |
| AppImage           | In-App, minisign-signiert                                            | entfällt         |
| `.deb` / `.rpm`    | Einmal-Download, **kein APT-/DNF-Repo** — nur der Banner informiert   | unverändert      |
| AUR                | `pacman`, sobald veröffentlicht                                       | live             |
| Flatpak/Flathub    | automatisch                                                           | neu              |

Der Verlust betrifft damit nur AppImage-Nutzer, deren Alternativen (AUR,
Flatpak) beide ein besseres Update-Verhalten haben als der Kanal, den sie
verlassen.

---

## Werkstück A — AppImage entfernen

Unabhängig von B, C, D. Kann sofort starten.

### Änderungen

**`app/src-tauri/tauri.conf.json`**

- `bundle.targets: "all"` → explizite Liste ohne `appimage`.
  Tauri ignoriert Targets, die zur Build-Plattform nicht passen, also gilt eine
  Liste für alle OS: `["deb", "rpm", "msi", "nsis", "app", "dmg"]`.
  **Kein `"updater"`** — das ist ein Tauri-v1-Target; in v2 steuert
  `createUpdaterArtifacts` die Payloads (gegen `BundleType` in
  `node_modules/@tauri-apps/cli/config.schema.json` geprüft).
- `bundle.linux.appimage` (Zeilen 128–139) ersatzlos streichen.
- `createUpdaterArtifacts: true` bleibt — Windows und macOS brauchen es weiter.

**`.github/workflows/release-tauri.yml`**

Die AppImage-Sonderbehandlung entfällt vollständig. Zwei Dinge verschwinden
konzeptionell, nicht nur als Zeilen:

- **Die Copy-statt-Move-Semantik.** AppImage war Updater-Payload *und*
  Download-Asset zugleich und musste deshalb kopiert statt verschoben werden.
  Nach dem Drop hat Linux überhaupt keinen Updater-Payload mehr, `.deb`/`.rpm`
  werden regulär verschoben.
- **Die Upload-Retry-Behandlung**, die es wegen des ~100 MB großen AppImage gab.

Dazu die Kopfkommentare (Zeilen 8–15), die AppImage als Updater-Payload
beschreiben. Die vollständige Liste der fünf Stellen, die im selben Commit fallen
müssen, steht in Werkstück E — sie gehören zum Asset-Kontrakt und werden dort
gepflegt, damit sie nicht an zwei Orten auseinanderlaufen.

**Landingpage** — siehe Werkstück F, das die Downloadseite ohnehin auf die neue
Kanal-Matrix umbaut.

**Doku**

- `README.md` — Linux-Downloadliste. **Achtung:** Plan 10 hat dort bereits
  Doku-Drift festgestellt (Dateinamen, die es nie gab). Beim Anfassen mitfixen.
- `docs/RELEASE.md` — Asset-Tabelle (Zeile 137), Updater-Payload-Absatz (145–148),
  Signaturtabelle (178), Installationshinweise (203).
- `docs/ARCHITECTURE.md:213` — Asset-Aufzählung.

### Was ausdrücklich bleibt

- **`InstallChannel::AppImage` in `channel.rs`.** Bestehende AppImage-Installationen
  laufen weiter und müssen den korrekten Banner bekommen. Die Variante zu
  entfernen würde sie in `Unknown` fallen lassen.
- **`installer_extensions` in `github.rs`** wurde dagegen geändert — siehe den
  Abschnitt darunter. Die ursprüngliche Annahme („bleibt wie es ist, das `.deb`
  greift automatisch") war falsch und hätte einem AppImage-Nutzer eine Datei
  angeboten, die er nicht installieren kann.

### Verifiziert: der Updater-Pfad — und ein Datenverlust-Risiko dabei

Die ursprüngliche Frage war, ob Linux-Nutzer nach dem Drop noch von neuen
Versionen erfahren. Beim Nachlesen im Plugin-Quellcode
(`tauri-plugin-updater-2.10.1`) kam etwas Schlimmeres heraus.

**Befund 1 — die Auflösung fällt zurück.** `Updater::get_urls` (`updater.rs:568`)
probiert `{os}-{arch}-{installer}` und **dann** das un-suffixierte
`{os}-{arch}`. Der Bundler schreibt weiterhin `linux-x86_64-deb`,
`linux-x86_64-rpm` **und** `linux-x86_64` — und letzteres zeigt ohne AppImage
auf das `.deb`. (Am v0.11.0-Manifest verifiziert: dort zeigt `linux-x86_64` noch
auf das AppImage.)

**Befund 2 — der Installer prüft nichts.** `install_appimage`
(`updater.rs:1031`, „rewriting AppImage") schreibt den Payload mit einem nackten
`std::fs::write` über die laufende Image-Datei, ohne zu prüfen, ob die Bytes
überhaupt ein AppImage sind.

**Zusammen:** Eine Installation, die noch ein altes AppImage fährt, löst
`linux-x86_64-appimage` → fehlt → `linux-x86_64` → das `.deb` auf, und
`can_self_install()` ist für `AppImage` **true**. Bei aktivierter automatischer
Aktualisierung (`lib.rs:764`, `auto_update == "auto"`) passiert das beim Start
unbeaufsichtigt: das AppImage des Nutzers wird durch ein `.deb` ersetzt und
startet nicht mehr.

**Fix (umgesetzt):** Der Job `strip-linux-updater-entries` entfernt alle
`linux-*`-Schlüssel aus `latest.json`, bevor `prune` läuft. Das Plugin liefert
dann `TargetsNotFound` → `Err` → `update/mod.rs:93` fällt zum GitHub-Fallback
durch → Banner ohne Install-Button. Die ursprüngliche Frage ist damit auch
beantwortet: Linux-Nutzer sehen weiterhin einen Hinweis.

**Zweiter Fix (umgesetzt):** `github.rs::installer_extensions` bekam den
`InstallChannel` als Parameter. Ein AppImage-Kanal matcht nur noch `.appimage`,
jeder andere Linux-Kanal gar keine Datei — sonst hätte der Fallback demselben
Nutzer ein `.deb` als Download angeboten. Das ist dieselbe Regel, die dort schon
für die CPU-Architektur galt: lieber die Releases-Seite als eine Datei, die die
Maschine nicht installieren kann.

---

## Werkstück B — AUR veröffentlichen

Unabhängig von A, C, D bis auf `recrest-bin` (siehe unten).

### B1 — `recrest` und `recrest-git` publizieren

Beide Pakete sind fertig (`packaging/aur/`), inklusive `.SRCINFO`. Es fehlt
ausschließlich die Veröffentlichung: AUR-Account, SSH-Key, `git push` gegen
`ssh://aur@aur.archlinux.org/<pkgname>.git`.

`packaging/aur/README.md` beschreibt den Copy-in-den-AUR-Clone-Ablauf bereits.
Ergänzen: den konkreten Push-Vorgang und wer maintainet.

### B2 — `recrest-bin` ergänzen

Wird in beiden bestehenden PKGBUILDs als `conflicts` geführt, existiert aber
nicht. Baut aus dem `.deb`-Release-Asset (nach Werkstück A ist das AppImage
keine Quelle mehr) und erspart Arch-Nutzern den ~20-Minuten-Rust-Build.

- `source=("recrest-bin-$pkgver.deb::$url/releases/download/v$pkgver/recrest-v$pkgver-linux-x64.deb")`
- `sha256sums` echt, nicht `SKIP` — Release-Assets sind byte-stabil, anders als
  GitHubs generierte Tarballs (siehe die Begründung im `recrest`-PKGBUILD).
- `package()` entpackt das `.deb` und legt das Layout auf den lowercase-Namen um,
  wie es die beiden anderen Pakete tun.
- `depends` von `recrest` übernehmen, `makedepends` auf `('tar')` reduzieren.
- `provides`/`conflicts` spiegeln: `conflicts=('recrest' 'recrest-git')`.
- `arch=('x86_64')` — es gibt kein aarch64-Linux-Release-Asset. (`recrest` und
  `recrest-git` deklarieren aarch64, weil sie aus Quellcode bauen.)

### Offener Punkt

Beide PKGBUILDs führen `Manuel Haucke` als Maintainer. Vor dem Push zu klären,
auf welches AUR-Konto die Pakete laufen und ob der `# Maintainer:`-Header so
bleibt.

---

## Werkstück C — `host_command()`-Wrapper

Voraussetzung für D, aber eigenständig testbar. Auf allen Nicht-Flatpak-Kanälen
ein reiner No-op.

### Problem

Recrest ist eine Host-Interaktions-App. In der Flatpak-Sandbox brechen ohne
Gegenmaßnahme:

| Stelle                                                        | Prozess                       | Ohne Wrapper       |
| ------------------------------------------------------------- | ----------------------------- | ------------------ |
| `git_info.rs:24`, `system.rs:107`, `git_index.rs:416`         | `git`                         | kein `git` im Runtime |
| `ide.rs:245` (+ `which::which` in `resolve_binary`, `:91`)    | VS Code, JetBrains …          | `which` findet nichts |
| `terminal.rs:298`, `:315`, `:670` (+ `which` in `:43`)        | Terminalemulator, Shell       | tot                |
| `git_ops.rs:294`                                              | `xdg-open`                    | funktioniert (Portal) |

`git2`/libgit2 ist **nicht** betroffen — das ist eine Library und liest mit
`--filesystem=host` direkt vom Dateisystem.

### Lösung

Ein Modul (Vorschlag: `app/src-tauri/src/platform/host_command.rs`), das

1. Flatpak über `FLATPAK_ID` erkennt — die Env-Probe existiert bereits als
   `ENV_FLATPAK_ID` in `update/channel.rs:56` und wird bisher nur vom Updater
   genutzt. Die Probe-Logik gehört an eine Stelle, nicht dupliziert.
2. `Command::new(x)` zu `flatpak-spawn --host x` umschreibt, wenn Flatpak erkannt
   wurde, sonst unverändert durchreicht.
3. **Die Binary-Auflösung mitnimmt.** Das ist der subtile Teil: `which::which("code")`
   läuft in der Sandbox und findet nichts, also meldet Recrest „keine IDE
   installiert", noch bevor irgendein Spawn passiert. Unter Flatpak muss die
   Auflösung selbst über den Host gehen.

Beide `tokio::process::Command`-Aufrufe (`git_index.rs:416`, `terminal.rs:670`)
brauchen dieselbe Behandlung wie die synchronen.

### Testbarkeit

Die Env-Probe injizierbar halten, wie `channel.rs` es vormacht (`PROBED_ENV_KEYS`
+ übergebene Probe statt direktem `std::env`-Zugriff). Dann sind Unit-Tests für
„baut unter Flatpak den `flatpak-spawn`-Aufruf korrekt" und „reicht sonst
unverändert durch" ohne echte Sandbox möglich.

---

## Werkstück D — Flatpak-Manifest und Flathub

Setzt C voraus.

### Manifest

Eigenes Repo (`flathub/com.soft_ventures.Recrest`), wie Flathub es verlangt.

- Runtime `org.gnome.Platform`, dazu `org.freedesktop.Sdk.Extension.rust-stable`
  und die Node-Extension.
- **Offline-Build.** Flathub baut ohne Netz: `flatpak-cargo-generator` über den
  Cargo-Lockfile und `flatpak-node-generator` über `yarn.lock` erzeugen die
  vendored Source-Manifeste. Die müssen bei jedem Dependency-Bump neu erzeugt
  werden — das ist der laufende Wartungsaufwand dieses Kanals.
- `tauri build --no-bundle`, wie in den PKGBUILDs: die Bundler-Ausgaben werden
  nicht gebraucht und `createUpdaterArtifacts` würde einen Signing-Key verlangen.

### Permissions

| Permission                          | Wofür                                     |
| ----------------------------------- | ----------------------------------------- |
| `--filesystem=host`                 | `git/scanner.rs` scannt beliebige Roots    |
| `--talk-name=org.freedesktop.Flatpak` | `flatpak-spawn --host` für Werkstück C   |
| `--talk-name=org.freedesktop.secrets` | Keyring (`auth/token.rs` via `keyring`)  |
| `--socket=wayland` (+ `--socket=fallback-x11`) | Fenster                        |
| `--share=network`                   | Provider-APIs                              |

`org.freedesktop.Flatpak` wertet Flathub faktisch als Sandbox-Escape und
verlangt eine Begründung im Review. Für Entwicklerwerkzeuge ist das der
etablierte Weg — GNOME Builder, VSCodium und Zed machen dasselbe. Die
Begründung gehört vorbereitet in den Submission-PR.

### Desktop-File-ID

`recrest.desktop` dokumentiert bereits, dass die Desktop-File-ID pro Kanal
abweicht: `Recrest.desktop` bei deb/rpm (der Tauri-Bundler leitet den Namen aus
`productName` ab, nicht konfigurierbar), `recrest.desktop` auf Arch. Flathub
verlangt zwingend `com.soft_ventures.Recrest.desktop` — ein dritter Name.

Das `<launchable>` in `com.soft_ventures.Recrest.metainfo.xml` muss zum jeweiligen
Kanal passen, sonst zeigt GNOME Software auf einen Launcher, den es nicht gibt.
Im Flatpak-Manifest per `mv` in den `build-commands` lösen, damit die
Repo-Variante für deb/rpm unverändert bleibt.

### Verifiziert im Container (2026-08-27)

Der Offline-Build wurde im echten Flathub-Image (`flatpak-builder 1.4.6`)
durchgespielt. **Ergebnis: der netzlose Build kompiliert durch** —
`yarn install --offline`, Vite-Build und der Rust-Release-Build der 1489
vendored Crates laufen ohne Netzzugriff (8 min für den Rust-Teil). Die
generierten Source-Listen sind damit nachweislich vollständig.

Auf dem Weg dahin fielen sechs Fehler auf, die alle erst beim Ausführen sichtbar
werden und alle behoben sind:

| Fehler                                                        | Wirkung ohne Fix                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| `env` auf Modulebene im Manifest                               | still verworfen (nur eine Warnung); Caches am falschen Ort         |
| `--ignore-engines` fehlte trotz ersetzter `.yarnrc`            | `yarn install` bricht ab: Node 22.23.1 ≠ gepinnte 22.22.3          |
| `--disable-download` allein im CI-Workflow                      | blockt auch den Git-Checkout; Build stirbt vor der ersten Zeile    |
| `--force-clean` fehlte in der zweiten Stufe                     | „App dir 'build' is not empty"                                     |
| Generator las die Lockfiles des Arbeitsbaums                    | Sources für den falschen Commit — siehe unten                      |
| `--xdg-layout` / Skript-Aufruf des Node-Generators veraltet     | Generator startet gar nicht                                        |

Die Lockfile-Divergenz ist die, die ohne Fix bei **jedem** Release erneut
zuschnappt: `develop` hatte `motion@^13.0.0`, v0.11.0 `motion@^12.40.0`, und der
Fehler tarnt sich als fehlendes Paket (`Can't make a request in offline mode
(…/motion-12.40.0.tgz)`) statt als falscher Commit. `generate-sources.sh` liest
den Commit deshalb jetzt selbst aus dem Manifest.

Drei weitere Fehlschläge gingen auf das Container-Setup zurück und sind
**keine** Repo-Fehler — `rofiles-fuse` (fehlendes `/dev/fuse`),
`Extension …/47 not installed` (`--rm` verwarf die Installation) und
`state dir is not on the same filesystem` (Volume-Layout). Der
Extension-Point im GNOME SDK deklariert `version = 24.08` und löst korrekt auf;
eine Manifest-Änderung dafür wäre falsch gewesen. Der verifizierte
Container-Aufruf steht in `packaging/flatpak/README.md`.

### Das Manifest pinnt einen Commit, keinen Tag

Bis zum nächsten Release ist das so beabsichtigt. Der Build installiert
`com.soft_ventures.Recrest.metainfo.xml`, die für Flathub Pflicht ist — und die
existiert erst seit `49690f3`, also nach v0.11.0. Ein Build des Tags scheitert
nach vollständiger Kompilierung am letzten `install`-Schritt.

Das Manifest zeigt deshalb auf einen develop-Commit, der die Datei hat. Damit
bleibt der Kanal in CI prüfbar. **Die Flathub-Submission braucht trotzdem einen
Release-Tag** — beim nächsten Release `commit:` (und `tag:`) umstellen und die
Sources neu erzeugen.

### Was bereits erledigt ist

- **AppStream-Metadaten** (`com.soft_ventures.Recrest.metainfo.xml`) existieren.
  Blocker 15 aus Plan 10 ist damit vom Tisch. Vor der Submission
  `appstreamcli validate` laufen lassen und den `<releases>`-Block auf die
  aktuelle Version bringen.
- **Updater-Gating.** `is_package_managed()` deckt `Flatpak` bereits ab, der
  Install-Button erscheint dort nicht und `install_update` weist den Aufruf auch
  bei direktem IPC-Zugriff ab (`commands/update.rs:56`).

### Zu prüfen

- Keyring über `org.freedesktop.secrets` in der Sandbox — funktioniert
  grundsätzlich, ist aber ein eigener Testpunkt.
- `recrest-launcher.sh` (`GDK_BACKEND`-Wrapper): in Flatpak vermutlich
  überflüssig, da das Manifest die Sockets festlegt. Prüfen, ob er stört.
- Deep Links (`x-scheme-handler/recrest`) über das Portal.

---

## Werkstück E — Release-Bereitstellung in der CI

Was die CI am Ende auf das GitHub-Release legt, ist der Vertrag, gegen den
sowohl die Landingpage (Werkstück F) als auch der GitHub-Updater-Fallback
(`github.rs::pick_platform_asset`) auflösen. Nach dem AppImage-Drop muss dieser
Vertrag an **allen** Stellen gleichzeitig stimmen — er ist heute an fünf Stellen
im Workflow dupliziert, und Plan 10 hat genau dort schon einmal eine Divergenz
gefunden (deb/rpm-URLs in `latest.json`, die auf von `prune` gelöschte Assets
zeigten).

### Asset-Kontrakt nach diesem Plan

| Plattform     | Asset                              | Pflicht |
| ------------- | ---------------------------------- | ------- |
| macOS arm64   | `recrest-${TAG}-mac-arm64.dmg`     | ja      |
| macOS x64     | `recrest-${TAG}-mac-x64.dmg`       | ja      |
| Windows x64   | `recrest-${TAG}-windows-x64.exe`   | ja      |
| Windows arm64 | `recrest-${TAG}-windows-arm64.exe` | optional |
| Linux x64     | `recrest-${TAG}-linux-x64.deb`     | ja      |
| Linux x64     | `recrest-${TAG}-linux-x64.rpm`     | ja      |
| —             | `SHA256SUMS.txt`                   | ja      |

`recrest-${TAG}-linux-x64.AppImage` entfällt ersatzlos.

### Anzupassende Stellen im Release-Workflow

Alle fünf müssen im selben Commit fallen, sonst bricht `verify` oder — schlimmer —
`prune` löscht etwas, das noch referenziert wird:

1. `publish`-Aufrufe im `linux-x64`-Zweig (Zeilen ~587–590).
2. `prune`-Patterns (~755–757).
3. Die Keep-Liste der Updater-Payloads (~790–792). Linux hat danach **keinen**
   Updater-Payload mehr — der `linux-x64`-Eintrag verschwindet ganz, statt auf
   `.deb` umgebogen zu werden.
4. `verify`-Checks (~918–920): die `check`-Zeile für das AppImage streichen.
5. Backstop-`find` (~629): `-name '*.AppImage'` entfernen.

### SHA256SUMS.txt

Der Workflow prüft bereits, dass die Datei **jedes** veröffentlichte
`recrest-v*`-Asset abdeckt — begründet damit, dass `sha256sum -c` fehlende
Einträge als „nichts zu prüfen" durchwinkt statt als Fehler. Diese Prüfung ist
generisch über das Namensmuster und braucht keine Änderung; sie ist aber der
Grund, warum ein halb entfernter AppImage-Eintrag sofort rot wird. Gut so.

### Flatpak in der CI

Flathub baut selbst aus dem Manifest-Repo — die CI muss also nichts
veröffentlichen, aber sie muss verhindern, dass das Manifest stillschweigend
bricht. Ein Dependency-Bump, der die vendored Sources ungültig macht, darf nicht
erst im Flathub-Review auffallen.

- **Pflicht:** Ein Job (eigener Workflow, z. B. `flatpak.yml`), der bei Änderungen
  an `app/**`, `shared/**`, `yarn.lock` oder `Cargo.lock` das Manifest offline
  baut (`flatpak-builder --disable-download`) und rot wird, wenn die generierten
  Sources nicht mehr passen. Das ist der eigentliche Regressionsschutz.
- **Übergangsweise:** Solange Flathub noch nicht live ist, ein
  `recrest-${TAG}-linux-x64.flatpak`-Bundle als **optionales** Release-Asset, damit
  Flatpak-Nutzer schon installieren können. Sobald Flathub veröffentlicht ist,
  entfällt das Asset wieder — ein Bundle, das niemand mehr braucht, ist nur ein
  weiterer Eintrag im Kontrakt, der divergieren kann.

### Doku

`docs/RELEASE.md` beschreibt laut Plan 10 bereits einen Workflow, den es nicht
mehr gibt (3-Runner-Matrix statt 5 Per-Arch-Legs, `tauri-action@v0` statt
SHA-gepinnt `@v1.0.0`, „updater currently disabled" obwohl aktiv). Die Datei wird
in Werkstück A ohnehin angefasst — diese Drift dabei mitfixen, statt sie ein
drittes Mal zu dokumentieren.

---

## Werkstück F — Landingpage-Downloads

Die Downloadseite muss zeigen, was es wirklich gibt: kein AppImage mehr, dafür
zwei Kanäle, die keine Datei sind.

### Strukturelles Problem

`getAssetsForOs()` gibt `DownloadAsset[]` zurück, und `DownloadAsset` trägt
ausschließlich einen `filename`, den `buildDownloadUrl()` zu einer
GitHub-Releases-URL zusammensetzt. Flathub und AUR passen da nicht hinein: das
eine ist ein externer Link, das andere ein Paketname für `paru`/`yay`.

Das Modell muss deshalb einen zweiten Kanaltyp bekommen — entweder eine
diskriminierte Union (`{ kind: "file" } | { kind: "external" } | { kind: "command" }`)
oder eine getrennte Liste neben den Datei-Assets. Die Union ist vorzuziehen: die
Downloadseite rendert dann eine Liste statt zwei, und der `noUncheckedIndexedAccess`-
strenge TS-Modus zwingt beim Rendern ohnehin zur Fallunterscheidung.

### Neue Linux-Matrix

| Eintrag       | Typ      | Ziel                                              |
| ------------- | -------- | ------------------------------------------------- |
| `.deb (x64)`  | Datei    | `recrest-v${version}-linux-x64.deb`                |
| `.rpm (x64)`  | Datei    | `recrest-v${version}-linux-x64.rpm`                |
| Flathub       | extern   | Flathub-Seite (erst nach D live schalten)          |
| Arch (AUR)    | Befehl   | `paru -S recrest-bin` (mit Hinweis auf `recrest` aus Quellcode) |

macOS und Windows bleiben unverändert.

### Anzupassende Dateien

- `landingpage/src/lib/downloadUrl.ts` — Typ erweitern, AppImage streichen,
  Flathub- und AUR-Einträge ergänzen.
- `landingpage/src/lib/downloadUrl.test.ts` — der Test auf den AppImage-Dateinamen
  fällt weg, die Index-Erwartungen der restlichen Assets verschieben sich; Tests
  für die neuen Kanaltypen ergänzen.
- Die Download-Komponente, die `getAssetsForOs` rendert — Fallunterscheidung für
  externe Links und Befehle (Befehl mit Copy-Button statt Download-Button).
- `landingpage/src/i18n/{de,en}.json` — **beide** Locales gleichzeitig, EN ist nur
  Fallback und DE ist vollständig gepflegt:
  - `download.osSub.linux`: `"AppImage, .deb und .rpm · x64"` → neue Kanalliste.
  - `download.install.linux[]`: die AppImage-`chmod`-Zeile entfällt, Flathub- und
    AUR-Zeilen kommen dazu.

### Reihenfolge innerhalb F — revidiert

Ursprünglich sollte der Flathub-Eintrag erst nach der Submission live gehen, weil
ein Link auf eine nicht existierende Seite schlimmer sei als kein Link.
**Entscheidung des Auftraggebers: er kommt sofort rein.** Der Kanal wird damit von
Anfang an angekündigt, und der Link beginnt zu funktionieren, sobald Flathub das
Manifest merged und baut — bis dahin 404, bewusst in Kauf genommen.

Wichtig für die Erwartungshaltung: Der Link lebt **nicht** dadurch, dass unsere
`flatpak.yml`-Pipeline grün wird. Die baut nur im eigenen Repo. Die Flathub-Seite
entsteht erst mit dem Merge der Submission bei `flathub/flathub` und deren
eigenem Build.

---

## Reihenfolge

```
A (AppImage raus) ─┐
E (CI-Kontrakt) ───┼── ein gemeinsames Release
F¹ (Landing: deb/rpm + AUR) ─┤
B1 (AUR live) ─────┘
B2 (recrest-bin) ── nach A, braucht das .deb als Quelle

C (host_command) ── D (Flatpak/Flathub) ── F² (Landing: Flathub-Link)
```

A, E und F¹ sind **ein** Vorgang, kein drei: Der Asset-Kontrakt aus E ist das,
was A ändert und was F¹ rendert. Gehen sie getrennt, zeigt die Landingpage
entweder auf ein Asset, das die CI nicht mehr baut, oder verschweigt eines, das
sie baut.

B1 gehört ins selbe Release, weil der Zwischenzustand „AppImage noch da, AUR noch
nicht live" der teuerste ist — beide Kanäle gleichzeitig gepflegt, keiner davon
der, den wir wollen.

F² ist bewusst abgetrennt: der Flathub-Link darf erst live, wenn D durch ist.

## Abnahme

**Bereitstellung (A, E)**

- [ ] Ein Release-Build produziert `.deb` und `.rpm`, kein `.AppImage`.
- [ ] Alle Assets aus der Kontrakt-Tabelle liegen unter den erwarteten Namen auf
      dem Release; `verify` läuft grün und der Job wurde tatsächlich ausgeführt
      (nicht übersprungen).
- [ ] `SHA256SUMS.txt` deckt jedes veröffentlichte `recrest-v*`-Asset ab und die
      Hashes stimmen mit den Bytes auf dem Release überein.
- [ ] `latest.json` referenziert kein Asset, das `prune` gelöscht hat — die
      Divergenz aus Plan 10 ist nicht zurückgekehrt.
- [ ] Linux-Client zeigt bei neuer Version weiterhin den Update-Banner
      (Verifikation aus Werkstück A) — ohne Install-Button.

**Landingpage (F)**

- [ ] Linux zeigt `.deb`, `.rpm` und den AUR-Befehl; kein AppImage mehr.
- [ ] Jeder Datei-Download auf der Seite löst auf ein real existierendes
      Release-Asset auf — für alle drei Plattformen geklickt, nicht nur Linux.
- [ ] `downloadUrl.test.ts` grün, inklusive Tests für die neuen Kanaltypen.
- [ ] DE und EN vollständig gepflegt, keine Locale mit AppImage-Resten.
- [ ] Der Flathub-Eintrag erscheint erst, wenn die Flathub-Seite existiert (F²).

**AUR (B)**

- [ ] `recrest`, `recrest-git`, `recrest-bin` sind im AUR auffindbar und
      installieren sich auf einem frischen Arch-System.
- [ ] `recrest-bin` zieht das `.deb` des aktuellen Releases und verifiziert die
      Checksumme.

**Flatpak (C, D)**

- [ ] `host_command()` ist unit-getestet für beide Pfade und auf deb/rpm/AUR
      nachweislich verhaltensneutral.
- [ ] Flatpak-Build lokal: Repo-Scan, IDE-Öffnen, Terminal-Öffnen, Token-Speichern
      und Deep Link funktionieren in der Sandbox.
- [ ] Der CI-Job baut das Manifest offline und wird rot, wenn die vendored Sources
      veraltet sind (durch einen absichtlich veralteten Lockfile-Stand geprüft).
- [ ] `appstreamcli validate` grün, Flathub-Submission-PR offen.

## Was offen bleibt

Alles unten braucht Zugangsdaten oder eine Linux-Maschine — nichts davon lässt
sich im Repository erledigen.

### Erfordert deine Accounts

1. **AUR-Push.** `recrest`, `recrest-git` und `recrest-bin` sind fertig und
   liegen in `packaging/aur/`. Es fehlt der Push gegen
   `ssh://aur@aur.archlinux.org/<pkgname>.git` — AUR-Konto plus hinterlegter
   SSH-Key. Der genaue Ablauf steht in `packaging/aur/README.md`.
   Vorher zu klären: beide bestehenden PKGBUILDs führen `Manuel Haucke` als
   `# Maintainer:`, `recrest-bin` hat das übernommen. Auf welches Konto die
   Pakete laufen sollen, ist eine Entscheidung, keine Codefrage.
2. **Flathub-Submission.** Manifest und Doku liegen in `packaging/flatpak/`.
   Der PR gegen `flathub/flathub` fehlt, ebenso die generierten
   `cargo-sources.json` / `node-sources.json` — die entstehen beim ersten Lauf
   von `generate-sources.sh` auf einer Linux-Maschine.

### Erfordert eine Linux-Maschine

3. **Die fünf Sandbox-Punkte durchgehen** (Repo-Scan, IDE, Terminal, Keyring,
   Deep Link + Tray) — die Liste steht in `packaging/flatpak/README.md`.

   Bauen musst du dafür nichts mehr: der `flatpak.yml`-Lauf lädt ein fertiges
   `recrest.flatpak` als Artefakt hoch (7 Tage). `flatpak install --user
   recrest.flatpak` genügt.

   Das ist der Rest, den kein Build beantworten kann. Der Container beweist, dass
   es *baut* — nicht, dass es in der Sandbox *funktioniert*. Der
   `host_command`-Wrapper ist unit-getestet und auf allen anderen Kanälen
   nachweislich verhaltensneutral, aber der `flatpak-spawn`-Zweig braucht eine
   echte Sandbox mit Desktop-Session.
4. **`recrest-bin` mit `makepkg -si` auf einem frischen Arch-System prüfen.**
   Die Checksummen sind gegen das echte v0.11.0-`.deb` erzeugt, die
   Entpack-Logik ist gegen dessen tatsächlichen Dateibaum geschrieben — aber
   `bsdtar`-Aufrufe sind nicht ausgeführt worden.

### Beim nächsten Release

5. **`RELEASE.md` (Root).** Der Linux-Abschnitt nennt noch die AppImage-Schritte.
   Absichtlich unverändert gelassen: die Datei dokumentiert v0.11.0, und v0.11.0
   *hatte* ein AppImage. Beim Schreiben der nächsten Release-Notes gehört dort
   `.deb`/`.rpm`/AUR hin, plus der Hinweis, dass Linux kein In-App-Auto-Update
   mehr hat.
6. **Den Strip-Job im ersten echten Release beobachten.** `latest.json` danach
   herunterladen und prüfen, dass kein `linux-*`-Schlüssel mehr drinsteht.

### Nebenbefund, nicht in diesem Plan behoben

Das v0.11.0-`.deb` installiert `/usr/bin/recrest-launcher` mit **Modus 644** —
nicht ausführbar, obwohl `recrest.desktop` ihn als `Exec=` nennt. Der Tauri-
Bundler kopiert `files`-Einträge ohne Exec-Bit. `recrest-bin` korrigiert das
beim Repacken, aber `.deb` und `.rpm` selbst sind weiterhin betroffen. Braucht
eine eigene Untersuchung samt Linux-Verifikation.

---

## Nicht in diesem Plan

- **Linux aarch64.** Voraussetzung für ein sinnvolles `recrest-bin` auf aarch64;
  bleibt Punkt 6 der Kanalliste aus Plan 10.
- **`winget` und Homebrew Cask.** Weiterhin die günstigsten offenen Kanäle
  (Plan 10, Punkte 3 und 4), aber nicht Linux.
- **Snap.** Bleibt bewusst unpriorisiert: Strict Confinement ist mit „beliebige
  lokale Repos lesen und fremde Editoren starten" praktisch unvereinbar.
