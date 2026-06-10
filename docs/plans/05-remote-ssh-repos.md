# Plan 5 — Remote-SSH-Repositories (Dev-Maschinen über SSH verwalten)

## Context

Recrest scannt und verwaltet heute ausschließlich **lokale** Git-Repositories (`app/src-tauri/src/git/scanner.rs` läuft mit `walkdir` über lokale Roots; `status.rs`/`git_ops.rs` arbeiten auf `Repository::open(local_path)`). Dieser Plan beschreibt ein **neues, eigenständiges Epic**: einen entfernten Host (z. B. eine Entwicklungs-VM) über SSH einbinden, die dort liegenden Repos einsehen und sie — soweit sinnvoll — über SSH verwalten. Konzeptionell vergleichbar mit „VS Code Remote-SSH", aber auf Recrests Repo-Dashboard zugeschnitten.

**Abgrenzung — was das NICHT ist:** Die per-Repo/Default-SSH-Key-Funktion aus Plan 3 (B.6) ist reine **Authentifizierung** für Git-Remotes (`git@github.com:…`). Sie hat mit diesem Plan nichts zu tun außer dem Stichwort „SSH". Hier geht es darum, einen **Host als Repo-Quelle** zu behandeln.

**Voraussetzung:** Plan 3 (Repo & Git Actions) gemerged. Dieser Plan ist groß und sollte erst nach Stabilisierung der lokalen Repo-Verwaltung angegangen werden.

**Status:** Spezifikation / Richtungsentscheidung. Vor Implementierung müssen die „Offenen Fragen" am Ende beantwortet werden.

---

## Use Case (Motivation)

> „Ich habe eine Development-Umgebung über SSH. Wenn ich mich verbinde, komme ich auf meine VM, dort liegen Projekte. Kann ich diese über die App einsehen und über SSH verwalten?"

Konkret:

- Mehrere Repos liegen auf einer Remote-VM (kein lokaler Klon).
- Der Nutzer will Branch/Dirty/Ahead-Behind-Status sehen, ohne sich per Terminal einzuloggen und `git status` zu tippen.
- Idealerweise: Fetch/Pull/Push remote auslösen, Repo im Remote-Editor/Terminal öffnen, ggf. Logs ansehen.

---

## Architektur-Entscheidung (vorab zu klären)

Zwei grundlegend verschiedene Wege, Git-Operationen auf dem Remote auszuführen:

1. **Remote-Shell (`ssh2`-Crate, libssh2):** SSH-Session aufbauen, Git-Kommandos auf dem Host laufen lassen (`git -C <path> status --porcelain=v2 --branch`), Stdout parsen. Nutzt das **Remote-`git`** + dessen `~/.ssh/config`/Credentials. Robust, da Recrest nicht die Repo-Daten überträgt, nur Kommando-Output. **Empfohlen.**
2. **Remote-Dateisystem mounten (sshfs/sftp) + lokales libgit2:** Repo-Verzeichnis lokal einhängen, dann wie lokal behandeln. Fragil (libgit2 über Netz-FS langsam/fehleranfällig, plattformabhängig). **Nicht empfohlen.**

→ Dieser Plan geht von **Weg 1 (Remote-Shell via `ssh2`)** aus. Damit sind Status/Fetch/Pull/Push „nur" das Absetzen und Parsen von `git`-Kommandos über einen SSH-Channel.

**Crate:** `ssh2 = "0.9"` (libssh2-Bindings). Achtung Linking: `git2` vendored bereits libssh2 — prüfen, dass `ssh2` nicht eine zweite, konfligierende libssh2 zieht (`vendored`-Features abstimmen, ggf. `ssh2` ohne vendored gegen die von git2 gelinkte nutzen, oder bewusst beide vendored mit getrennten Symbolen). **Das ist ein Build-Risiko und muss früh in einem Spike validiert werden.**

---

## Datenmodell

Neuer Record in `config/settings.rs`:

```rust
pub struct RemoteHost {
    pub id: String,
    pub label: String,            // "Dev VM"
    pub hostname: String,         // "vm.intern" oder IP
    pub port: u16,                // default 22
    pub username: String,
    pub auth: RemoteHostAuth,     // Agent | Key { path } | (Passwort NICHT persistieren)
    pub scan_roots: Vec<String>,  // Remote-Pfade, die nach Repos durchsucht werden
}
```

- Passphrasen/Passwörter **nie** in `settings.json` — Session-Cache (wie `AppState.ssh_passphrases` aus Plan 3) bzw. OS-Keychain (`auth/token.rs`-Muster).
- TS-Spiegel in `shared/src/types/` (camelCase), Barrel-Export.

`RepoRecord` braucht eine Herkunft, um lokal vs. remote zu unterscheiden:

```rust
pub enum RepoOrigin { Local, Remote { host_id: String, remote_path: String } }
```

(Additiv mit `#[serde(default)]` einführen, damit bestehende `settings.json` weiter laden — vgl. Plan 3 B.6 `legacy_repo_record_loads_without_ssh_key_path`.)

---

## Phase A — SSH-Host-Verbindung (Spike + Fundament)

### A.1 Build-Spike: `ssh2` neben `git2`

- [ ] `ssh2` zu `app/src-tauri/Cargo.toml` hinzufügen, ein minimales `Session::connect` + ein triviales Remote-Kommando (`echo ok` via `channel.exec`) in einem `#[ignore]`-Test (echte Verbindung) **und** einem Unit-Test gegen einen lokalen sshd-Mock. Verifizieren, dass `cargo build` unter `vendored-libgit2`/`vendored-openssl` **ohne Symbol-Konflikt** durchläuft auf macOS + Linux + Windows.
- [ ] Bei Konflikt: Entscheidung dokumentieren (eigene libssh2 vs. geteilte). **Blocker für den Rest des Plans.**

### A.2 `RemoteHost`-Settings + CRUD-Commands

- [ ] `RemoteHost`/`RemoteHostAuth` in `settings.rs` (additiv), TS-Typen + Seeds.
- [ ] Commands `list_remote_hosts`, `add_remote_host`, `update_remote_host`, `remove_remote_host` (Muster: `commands/repos.rs` add/remove + `config.save(&app)`). In beide `generate_handler!`-Blöcke (`lib.rs`) eintragen, TS-Konstanten ergänzen.
- [ ] Verbindungstest-Command `test_remote_host(host_id) -> Result<RemoteHostInfo>` (führt `git --version` + `uname -a` remote aus). TDD gegen sshd-Mock.

### A.3 Connection-Pool / Session-Handling

- [ ] `AppState.remote_sessions: Arc<Mutex<HashMap<String, ssh2::Session>>>` (oder ein kleiner Pool mit Reconnect). Sessions sind nicht `Send`-trivial — Strategie festlegen (dedizierter Thread pro Host vs. neue Session pro Kommando). **In A.1-Spike mitklären.**
- [ ] Passphrase-Prompt-Flow analog Plan 3 (`ssh_unlock_key`).

---

## Phase B — Remote-Discovery

### B.1 Remote-Scan

- [ ] `scan_remote(host_id) -> Vec<RemoteRepoDto>`: über SSH ein `find <root> -maxdepth N -type d -name .git` (oder ein kleines Shell-Snippet) laufen lassen, Pfade einsammeln, `.git` zu Repo-Roots normalisieren (Pendant zu `scanner.rs::skip_current_dir` — verschachtelte Repos nicht doppelt zählen).
- [ ] Ergebnis in den Store mergen, `RepoRecord` mit `RepoOrigin::Remote` anlegen.
- [ ] Performance: ein `find` pro Host statt N Roundtrips.

---

## Phase C — Remote-Status

### C.1 Status über `git status --porcelain=v2 --branch`

- [ ] `remote_repo_status(repo_id)`: SSH `git -C <remote_path> status --porcelain=v2 --branch` + `git -C <p> rev-list --left-right --count @{u}...HEAD` für Ahead/Behind. Output in den **bestehenden** `RepoStatusDto` parsen (gleiche Form wie lokal, damit die UI nichts unterscheiden muss).
- [ ] Pure Parser-Funktion `parse_porcelain_v2(stdout) -> RepoStatusDto` mit Tabellen-Tests (keine SSH nötig zum Testen → gut isolierbar).
- [ ] Kein `notify`-Watcher über SSH (zu teuer) → Status via Polling/manuellem Refresh; Intervall an `polling_interval_ms` koppeln.

---

## Phase D — Remote-Aktionen

### D.1 Fetch/Pull/Push remote

- [ ] `git -C <p> fetch|pull|push` über SSH. Auth läuft über die Credentials **auf dem Remote** (dessen ssh-agent/config) — Recrest reicht nur das Kommando durch. Fehler-Output sauber als `CommandError` mappen.

### D.2 Öffnen-Aktionen

- [ ] „Im Remote-Terminal öffnen": lokalen Terminal-Emulator mit `ssh -t host "cd <path>; $SHELL"` starten (nutzt Plan 3 `terminal_spawn_plan`).
- [ ] „In IDE öffnen": VS Code Remote-SSH-URI (`vscode-remote://ssh-remote+<host>/<path>`) bzw. JetBrains Gateway — best-effort, IDE-abhängig.
- [ ] Explorer/lokale Logo-Erkennung entfällt remote (kein lokaler Pfad) → Avatar fällt auf Gradient zurück.

---

## Phase E — UI

### E.1 Hosts verwalten

- [ ] Settings-Bereich „Remote-Hosts" (neuer Tab oder unter Integrations): Host hinzufügen/bearbeiten/entfernen, Verbindung testen, Scan-Roots pflegen. Wiederverwenden: `ProviderRow`-artige Card-Struktur, `pickFile` für Key.

### E.2 Remote-Repos im Dashboard

- [ ] Repos-Liste gruppiert nach Herkunft (lokal vs. „Dev VM"), Remote-Repos mit Host-Badge. `RepoRow` bekommt ein optionales Origin-Indiz.
- [ ] Aktionen, die remote nicht gehen (z. B. „Im Explorer öffnen"), ausblenden/disablen.
- [ ] Ladezustände: Remote-Status ist langsamer als lokal → Skeleton/Spinner pro Host.

---

## Sicherheit

- Host-Keys verifizieren (known_hosts), kein blindes Akzeptieren unbekannter Fingerprints — beim ersten Connect Fingerprint anzeigen + bestätigen lassen.
- Passwörter/Passphrasen nie persistieren (Session-Cache/Keychain).
- Remote-Kommandos mit festen Argument-Arrays bauen, **kein** String-Splicing von User-Pfaden in Shell-Kommandos ohne Quoting (Injektion vermeiden).
- Nie Key-Pfade/Passphrasen loggen (vgl. Plan 3 `SshCreds` ohne `Debug`).

---

## Offene Fragen (vor Implementierung klären)

1. **`ssh2` + `git2` Link-Konflikt** — der Build-Spike (A.1) entscheidet Machbarkeit. Falls hart blockiert: Alternative über die System-`ssh`-CLI (`ssh host "git …"` via `std::process::Command` mit Argument-Array, kein Shell-String) statt libssh2 — simpler, aber abhängig von installiertem `ssh` + non-interaktiver Auth.
2. **Session-Modell:** Persistente Session pro Host (schneller, aber Reconnect-Logik) vs. Session-pro-Kommando (einfacher, aber langsam)?
3. **Scope MVP:** Reicht „Hosts + Discovery + Status (read-only)" als erstes Release, und Fetch/Pull/Push (Phase D) später?
4. **known_hosts-Verifikation:** Recrest-eigener Store oder die System-`~/.ssh/known_hosts` mitnutzen?
5. **Mehrere Hosts gleichzeitig** — UI- und Pool-Komplexität; im MVP evtl. auf 1 Host beschränken?

---

## Done-Check (pro Phase, nicht gesamt)

- [ ] A: Build-Spike grün auf allen 3 OS; Host-CRUD + Verbindungstest mit Tests.
- [ ] B/C: Discovery + Status gegen einen echten Test-Host manuell verifiziert; Parser-Unit-Tests grün.
- [ ] D: Fetch/Pull/Push remote manuell verifiziert.
- [ ] E: Playwright-MCP-Check der Host-Verwaltung + Remote-Repo-Liste (UI-Konvention).
- [ ] `cargo test` + `yarn typecheck && yarn lint && yarn test` grün.
