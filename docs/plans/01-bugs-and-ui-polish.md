# Plan 1 — Bugs & UI Polish

## Context

Sammlung der plattformübergreifenden Bugs, OS-spezifischen Bugs (macOS/Windows/Linux) und allgemeinen UX-Verbesserungen aus `docs/plans/future.md`. Phase A (Bugs) hat Vorrang vor Phase D (Features). Repo-Aktions-Bugs ("open in terminal/folder") sind in Plan 2, da sie inhaltlich zur Repo-Aktions-Pipeline gehören. Author-Dedup ist hier verortet, weil sie in jeder Author-Anzeige greift, nicht nur in Statistiken.

Verifikation am Ende: `yarn typecheck && yarn lint && yarn test && yarn test:e2e` plus manuelle OS-Smokes wo angegeben.

---

## Phase 0 — Cross-Plan-Koordination (Foundations)

Items, die alle 3 Pläne berühren. **Diese müssen zuerst landen**, sonst zerschießt ein paralleler Plan-Stream den anderen (Settings-Schema-Konflikte, Drawer-Doppel-Implementierung, Palette-Doppel-Implementierung).

### 0.1 Settings-Schema — additive Migration-Policy

Über die 3 Pläne werden folgende Felder zu `AppSettings` (`app/src-tauri/src/config/settings.rs:28-85`) hinzugefügt:

| Feld                                         | Plan   | Typ                         |
| -------------------------------------------- | ------ | --------------------------- |
| `pinnedRepoIds`                              | 1 §A.5 | `Vec<String>`               |
| `authorAliases`                              | 1 §A.4 | `BTreeMap<String, String>`  |
| `uiScale`                                    | 1 §D.6 | `f32`                       |
| `repoListViewMode`                           | 1 §D.1 | `enum`                      |
| `repoListSort`                               | 2 §B.5 | `{ field, direction }`      |
| `repoImportDefaults`                         | 2 §B.1 | nested struct               |
| `defaultScanPath`                            | 2 §B.2 | `Option<String>`            |
| `terminal: { id, profile?, customCommand? }` | 3 §D.1 | nested struct               |
| `commitMessageTemplate`                      | 2 §C.2 | `String`                    |
| `privacy: { fetchFavicons, ... }`            | 2 §B.3 | nested struct               |
| `repos[id].sshKeyPath`                       | 2 §B.6 | `Option<String>` (per-Repo) |

**Migration-Regel:** **Jedes** neue Feld bekommt `#[serde(default)]` und einen `Default`-Impl, damit existierende `settings.json`-Dateien ohne Schema-Bump weiter laden. Beispiel:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppSettings {
    // existing fields...
    #[serde(default)] pub pinned_repo_ids: Vec<String>,
    #[serde(default)] pub author_aliases: BTreeMap<String, String>,
    #[serde(default = "default_ui_scale")] pub ui_scale: f32,
    #[serde(default)] pub privacy: PrivacySettings,
    // ...
}
```

`RepoRecord` (settings.rs:97-106) bekommt `#[serde(default)]` auf neuen `ssh_key_path: Option<String>`. **Test:** Migrations-Test in `config/store.rs` lädt eine Fixture-`settings.json` ohne neue Felder + erwartet erfolgreiche Deserialisierung mit Defaults.

### 0.2 Drawer-Primitive — gemeinsame Prop-Surface

Plan 1 §A.1 erstellt `app/src/components/molecules/Drawer/index.tsx`. Plan 2 §C.5 ergänzt einen "Files Changed"-Tab. Damit beide kohärent sind, definieren wir die finale Prop-Surface jetzt:

```ts
type DrawerTab = { id: string; label: string; content: ReactNode };

type DrawerProps = {
  open: boolean;
  side?: "right" | "left";
  size?: "sm" | "md" | "lg" | string;
  onClose: () => void;
  header?: ReactNode;
  footer?: ReactNode;
  // entweder children ODER tabs (mutually exclusive — TS via discriminated union):
  children?: ReactNode;
  tabs?: DrawerTab[];
  defaultTabId?: string;
  onTabChange?: (id: string) => void;
};
```

Plan 1 §A.1 implementiert `children`-Variante; Plan 2 §C.5 nutzt `tabs`-Variante. **Reihenfolge:** Plan 1 §A.1 muss vor Plan 2 §C.5 landen.

### 0.3 `lib/charts/`-Umbrella

Plan 1 §B.3 (`palette.ts`) und Plan 3 §B.1 (`smoothLine.ts`) legen beide unter `app/src/lib/charts/` an. Die existierende Palette in `app/src/lib/activityStats.ts` (Konstante `ACTIVITY_PALETTE` und `buildRepoColorMap`) wird **nicht parallel** dupliziert, sondern **umgezogen**:

1. `ACTIVITY_PALETTE` → `app/src/lib/charts/palette.ts` (re-exportieren als `CHART_PALETTE`).
2. `buildRepoColorMap` → ebd. (oder belassen in `activityStats.ts`, importiert die Palette).
3. Alle Cards in `app/src/components/organisms/activity/cards/*` importieren ausschließlich aus `lib/charts`.

### 0.4 Sequenzierung / Release-Train

Pflicht-Reihenfolge (verhindert Merge-Konflikte):

1. **Phase 0.1 Settings-Migration** zuerst (alle neuen Felder mit `serde(default)` + Migrations-Test) — entkoppelt alle anderen Items.
2. **Plan 1 §A.5** (pinnedRepoIds Persistenz) — Vor Plan 2 §B.4 (Click-to-unpin nutzt persistierten State).
3. **Plan 1 §A.1** (Drawer-Primitive) — Vor Plan 2 §C.5 (Tab-Variante).
4. **Plan 1 §B.3** (Palette-Extraktion) — Vor allen anderen Chart-Touches in Plan 1/Plan 3.
5. **Plan 3 §D.1** (Terminal-Setting) — Vor Plan 2 §A.1 (Bug-Fix nutzt Setting).

### 0.5 Pfad-Korrekturen

`app/src/lib/tauri.ts` existiert nicht — der korrekte Pfad ist `app/src/lib/tauri/index.ts` (Verzeichnis-Modul mit `services/`-Unterordner). Alle Items in den 3 Plänen referenzieren ggf. den falschen Pfad — bei jeder Implementierung den korrekten Pfad nutzen.

`app/src-tauri/src/providers/r#trait.rs` (Plan 2) ist Schreibweise des Modul-Imports. **Die Datei heißt `trait.rs`** (Rust-Keywörter werden im `mod`-Statement mit `r#` escaped, der Dateiname bleibt `trait.rs`).

---

## Phase A — Cross-Platform Bugs

### A.1 MR-Drawer optisch inkonsistent

- **Symptom:** "Der Drawer in merge requests view ist optisch ein anderer im Vergleich zu den anderen views und er ist schlechter."
- **Betroffene Dateien:**
  - `app/src/pages/MergeRequestsPage.tsx:353` — `MRDrawer` als plain `<aside>` mit Klasse `a-mr-drawer`.
  - `app/src/components/organisms/layout/DetailPane/` — verwendete Drawer/Sheet-Variante in anderen Views.
  - `app/src/styles/views.scss` — Klasse `.a-mr-drawer`.
- **Root-Cause-Hypothese:** Es existiert kein gemeinsames Drawer-Primitive; jede View baut sich ein eigenes. MR baut ad-hoc und weicht in Spacing/Schatten/Animation ab.
- **Vorgehen:**
  1. Shared Primitive extrahieren als `app/src/components/molecules/Drawer/index.tsx` mit Prop-Surface aus **Phase 0.2** (children-Variante in dieser Iteration; tabs-Variante kommt in Plan 2 §C.5).
  2. Tokens/Spacing aus `DetailPane`-CSS übernehmen, in `app/src/styles/components/_drawer.scss` zentralisieren.
  3. `DetailPane` als dünner Wrapper auf neues Primitive setzen.
  4. `MergeRequestsPage.tsx:353` umstellen — Inhalt bleibt, Hülle wechselt zu `<Drawer>`.
- **Test:**
  - Unit: Snapshot des Primitives (offen/zu, side=left/right, size sm/md/lg).
  - Style-Assertion: Playwright-Test rendert beide Drawer (MR + Repo-Detail) und vergleicht `getComputedStyle()` für `padding`, `box-shadow`, `transition` — Werte müssen identisch sein.
  - E2E: existierende MR-Spec + neuer Step "Drawer öffnet/schließt + ESC-Key + Click-Outside".

### A.2 MR-Notifications nur bei Assignee

- **Symptom:** "Ich sollte nur MR spezifische notifications bekommen, wenn ich der assignee bin […] anzeigen sollten wir alle."
- **Betroffene Dateien:**
  - `app/src/hooks/useNotificationTriggers.ts:88` (PR-Loop), `:120-132` (Transitions-Build), `:149-151` (`emit()`).
  - `app/src-tauri/src/providers/api.rs:6-22` — `PullRequestDto` hat **weder** `assignees` noch `requested_reviewers` (nur `PullRequestDetailDto` hat `reviewers: Vec<ReviewerDto>`). Felder müssen neu hinzugefügt werden.
  - `app/src-tauri/src/providers/github.rs` — Mapper befüllt aus GitHub-API (`/pulls` liefert `assignees[].login`, `requested_reviewers[].login`).
  - `shared/src/types/pr.ts` — TS-DTO mit ergänzen.
  - `app/src/store/slices/providersSlice.ts` — `username` pro Provider liegt unter `state.providers.<id>.user`.
- **Root-Cause-Hypothese:** Trigger-Hook hat keinen Filter und das DTO hat die Filter-Felder gar nicht.
- **Vorgehen:**
  1. **DTO erweitern** (Backend + Frontend): `PullRequestDto.assignees: Vec<String>` (Login/Username-Liste), `PullRequestDto.requestedReviewers: Vec<String>`.
  2. GitHub-Mapper befüllen. GitLab/Bitbucket: leere Vec bis Plan 2 §D.1 die Mapper liefert.
  3. **Filter an der richtigen Stelle:** Notification-Filter wirkt **vor** dem Hinzufügen zur `transitions[kind]`-Map (Zeile 120-132). Nicht erst vor `emit()`, sonst wird die Diff-Berechnung verschwendet.
     - `new_pr` (Zeile 123): `if (!isAssigneeOrReviewer(pr, me)) skipNotification`.
     - `ci_failed` / `merge_ready` (Zeile 127/130): selbe Bedingung.
  4. Helper `isAssigneeOrReviewer(pr, me)` in `app/src/lib/notifications.ts` (neu) mit Casing-Toleranz (`.toLowerCase()`) und Provider-Granularität (Provider-ID muss matchen).
  5. **Identity-Race auf Cold-Start:** Wenn `state.providers.<id>.user` noch `undefined` ist (Provider lädt async), darf der Hook **nicht** alle PRs als "nicht meine" filtern und damit Notifications komplett unterdrücken. Lösung: Solange Identity unbekannt → Trigger-Hook gibt früh zurück und merkt sich den letzten gesehenen `prs`-Snapshot **nicht** (nächster Tick läuft erneut, sobald Identity da ist).
  6. **Anzeige bleibt unangetastet** — UI listet weiterhin alle PRs.
- **Test:**
  - Unit `isAssigneeOrReviewer`: 8 Cases — (a) Assignee match, (b) Reviewer match, (c) weder, (d) leere Listen, (e) Casing `Roehle` vs `roehle`, (f) Provider-Mismatch (gleicher Login auf zwei Providern), (g) Identity null → returns false, (h) PR ohne Felder (legacy DTO).
  - Slice-Test `useNotificationTriggers`: identity null → keine emits; identity gesetzt + PR ohne Self → keine emits; identity gesetzt + PR mit Self-Assignment → emits.
  - Manuell: PR ohne Self-Assignment → keine Notification; mit Self-Assignment → Notification.

### A.3 Truncation für Labels — Review Queue + global

- **Symptom:** "In 'Review queue' in statistics überschreiten die labels den rand. In all diesen Feldern, nicht nur diesem sollten wir truncaten `...`."
- **Betroffene Dateien:**
  - `app/src/components/organisms/activity/cards/ReviewQueueCard/index.tsx:51` — Meta-Zeile.
  - `app/src/styles/views.scss:2703-2710` — `.a-act-rq-meta` ohne Truncation.
  - `app/src/styles/views.scss:2699-2701` — `.a-act-rq-title` Pattern (`text-overflow: ellipsis; white-space: nowrap`).
- **Vorgehen:**
  1. Bestehendes Title-Pattern auf `.a-act-rq-meta` anwenden + `min-width: 0` auf den umschließenden Flex-Container.
  2. Sweep durch `views.scss`: alle `.flex` Reihen mit Text-Children ohne `min-width: 0` finden, dasselbe Pattern dort anwenden.
  3. Optional: SCSS-Mixin `@mixin truncate` einführen und an betroffenen Stellen verwenden.
- **Test:**
  - Visuell: Review-Queue mit überlangen Repo-Namen.
  - Story/Snapshot mit langen Strings (für jede gefixte Stelle eine).

### A.4 Author-Dedup (Röhle ↔ Roehle)

- **Symptom:** Derselbe Autor wird durch Umlaut-Variante als zwei Autoren gezählt.
- **Betroffene Dateien:**
  - `app/src-tauri/src/git/status.rs:208` — git log liefert raw author string.
  - `app/src-tauri/src/commands/repos.rs` — `list_recent_commits` Mapper.
  - `app/src/lib/activityStats.ts:249-284` — `computeLeaderboard` aggregiert nach raw `author`.
  - `shared/src/types/*` — `RecentCommitDto` o.ä.
- **Root-Cause-Hypothese:** Aggregation-Key ist der Anzeige-Name; Email wäre der stabilere Identity-Anchor, wird aber nicht durchgereicht. Selbst die Email kann pro-System differieren (work vs. private).
- **Vorgehen:**
  1. **Backend:** Author-DTO erweitern um `signatureKey: string`, `displayName: string`, `email: string`.
     - `signatureKey` = `normalize(name) + "|" + normalize(email_local_part)`.
  2. **`normalize` in `app/src-tauri/src/git/author_normalize.rs`** (neu) — Reihenfolge ist **kritisch**, weil NFD allein die German-Konvention (`ö → oe`) bricht (NFD splittet `ö` in `o + ¨`, ASCII-Fold lässt `o`, nicht `oe`):
     1. **Vor** NFD: deutsche Umlaut-Map anwenden (`ä→ae, ö→oe, ü→ue, Ä→Ae, Ö→Oe, Ü→Ue, ß→ss`).
     2. **Vor** NFD: zusätzliche Sprach-Mappings für häufige Diaspora — französisch (`œ→oe, æ→ae`), nordisch (`å→aa, ø→oe, æ→ae`), türkisch (`ı→i, ş→s, ğ→g, İ→I`), polnisch (`ł→l, Ł→L`).
     3. Crate `deunicode` (Version `1.x`, in `Cargo.toml` pinnen) für den Rest (Akzente, kyrillisch, CJK-Romanisierung) — bequemer und korrekter als bespoke NFD+Strip.
     4. `to_lowercase()`, `trim()`.
  3. **Mapping:** Frontend nutzt `signatureKey` als Aggregation-Key. `displayName` wird im UI angezeigt; bei Kollision (verschiedene Names mit gleichem Key) das längste/häufigste Display.
  4. **Persisted Override:** User kann manuell zwei Autoren mergen → Settings-Tabelle `authorAliases: BTreeMap<signatureKey, canonicalKey>` in `AppSettings` (siehe Phase 0.1).
- **Test (konkrete Tabellen-Cases für Rust-Unit):**

  | input name + email                            | erwarteter `signatureKey`                                                       |
  | --------------------------------------------- | ------------------------------------------------------------------------------- |
  | `Röhle <oe@x>`                                | `roehle\|oe`                                                                    |
  | `Roehle <oe@x>`                               | `roehle\|oe`                                                                    |
  | `Valentin Röhle <v.roehle@benova.eu>`         | `valentinroehle\|vroehle`                                                       |
  | `Valentin Roehle <valentin.roehle@benova.eu>` | `valentinroehle\|valentinroehle` (zwei Einträge — durch `authorAliases` mergen) |
  | `François Müller <f@x>`                       | `francoismueller\|f`                                                            |
  | `Łukasz Słoń <l@x>`                           | `lukaszslon\|l`                                                                 |
  | `İlhan Şahin <i@x>`                           | `ilhansahin\|i`                                                                 |
  | `Søren Ærø <s@x>`                             | `soerenaeroe\|s`                                                                |
  | `北条 太郎 <t@x>`                             | `bei tiao tai lang\|t` (deunicode-Output, Whitespace bleibt)                    |
  | leerer Name + email                           | `\|<email_local>`                                                               |
  | gleicher Name doppelte Spaces                 | identisch (Trim+Collapse)                                                       |
  | name in Großbuchstaben                        | identisch zu Kleinbuchstaben                                                    |
  - TS-Unit für `computeLeaderboard` mit gemischten Author-Namen + Override über `authorAliases`.
  - E2E: Repo mit Commits "Röhle" + "Roehle" → eine Zeile in der Leaderboard-Card.

### A.5 Pinned Repos oben

- **Symptom:** "wenn repo pinned, nicht oben."
- **Betroffene Dateien:**
  - `app/src/components/organisms/repos/RepoList/index.tsx:25-42` — Sort/Group nutzt `GROUP_ORDER`, ignoriert `pinned`.
  - `app/src/store/slices/uiSlice.ts:30,73-77` — `pinnedRepoIds` UI-only.
  - `app/src-tauri/src/config/settings.rs:28-85` — `AppSettings` ohne `pinnedRepoIds`.
- **Vorgehen:**
  1. In `RepoList`: vor Gruppierung `const pinned = repos.filter(r => r.pinned)`, eigene Gruppe "Pinned" an Index 0 prependen, Rest wie bisher.
  2. Pinned-Section ist nicht collapsible (oder default-expanded und merkt State).
  3. **Persistenz-Lift (siehe Phase 0.1):** `AppSettings.pinned_repo_ids: Vec<String>` mit `#[serde(default)]`; `uiSlice` lädt initial aus Settings, Toggle dispatched zusätzlich `saveSettings({ pinnedRepoIds })`.
  4. **Voraussetzung für Plan 2 §B.4** (Click-to-unpin nutzt persistierten State).
- **Test:**
  - Unit: `RepoList` mit gemischter Pin-Liste — Pinned erscheinen erste.
  - E2E: Pin → Reload → Pin bleibt oben.

### A.6 "checks failed" zu generisch

- **Symptom:** "'checks failed' zu pipelines failed - zu generisch."
- **Betroffene Dateien:**
  - `app/src/i18n/locales/en/common.json` — bekannte Stelle: `chip_checks_failed_one/_other` (≈Zeile 241-242).
  - `app/src/i18n/locales/{en,de}/*.json` — Notification-Keys `notifications.ci_failed.title/body` (referenziert in `useNotificationTriggers.ts:142-143`).
  - `app/src-tauri/src/commands/notifications.rs` falls dort hardcoded.
- **Wortwahl-Klärung:** "Pipelines" wäre GitHub-Vokabular-falsch (GitHub UI sagt "Checks", GitLab "Pipelines", Bitbucket "Pipelines"). User-Symptom ist "zu generisch" — vorgeschlagene Lösungen:
  - **Option a (Empfohlen): per-Provider-Begriff.** Neuer i18n-Schlüssel pro Provider (`notifications.ci_failed.<github|gitlab|bitbucket>.title`). `useNotificationTriggers.ts` wählt den Provider-spezifischen Key über `pr.providerId`. Englisch: GitHub → "Checks failed", GitLab/Bitbucket → "Pipelines failed". Deutsch analog.
  - **Option b (Fallback):** neutraler Begriff "CI failed" / "CI fehlgeschlagen" für alle Provider.
- **Vorgehen:**
  1. `rg -i "checks? failed|ci[ _]?fail|pipeline" app/src/i18n` für vollständige Liste der Stellen.
  2. Option a implementieren: i18n-Keys umstellen auf Provider-Suffixe; `useNotificationTriggers.ts` `t('notifications.ci_failed.' + pr.providerId + '.title')` mit Fallback auf `notifications.ci_failed.default.title`.
  3. Auch `chip_checks_failed_*` (in `RepoRow`/Status-Chips) entsprechend pluralisieren.
- **Test:**
  - i18n-Snapshot pro Provider-Variante.
  - Component-Test `useNotificationTriggers` mit drei Mock-PRs (je Provider) → drei verschiedene Title-Strings.
  - Manuell: failing CI auf GitHub-Repo → "Checks failed"; auf GitLab-Repo → "Pipelines failed".

### A.7 Full Repo View — MR-Click navigiert weg statt Drawer zu öffnen

- **Symptom:** "full repo view, mr buggy."
- **Betroffene Dateien:**
  - `app/src/pages/RepoDetailPage.tsx:430-484` — PRs-Section in Full-Repo-View, Klick-Handler in Zeile 463 ruft `navigate(AppRoute.MERGE_REQUESTS)` und reißt den User aus dem Repo-Kontext.
- **Konkrete Reproduktion:**
  1. Recrest öffnen, GitHub-PAT verbunden.
  2. Repo mit ≥3 offenen PRs hinzufügen.
  3. Repo-Detail öffnen, Section "Merge requests" → PR anklicken.
  4. **Beobachtet:** Page-Switch zu MR-View (kein Inline-Drawer).
  5. **Erwartet:** Drawer öffnet inline mit PR-Detail (konsistent mit MergeRequestsPage-Verhalten).
- **Vorgehen:**
  1. PR-Click-Handler in `RepoDetailPage.tsx:463` ändert von `navigate(...)` auf das selbe Drawer-Open-Pattern wie `MergeRequestsPage`.
  2. Drawer-Komponente ist das Primitive aus Plan 1 §A.1 (Phase 0.2 Prop-Surface, children-Variante).
  3. State (selectedPrId) lokal in `RepoDetailPage` halten.
- **Test:**
  - E2E-Spec: Repo mit ≥3 PRs → Click PR-Row → URL bleibt auf Repo-Detail, Drawer ist sichtbar.
  - Component-Test `RepoDetailPage` mit Mock-PRs.

---

## Phase B — UI/Visual Polish

### B.1 Dashboard "Lang Mix" — Legende unten, Diagramm größer

- **Symptom:** "dashbaord -> lang mix: legende unten, diagramm größer."
- **Betroffene Dateien:**
  - `app/src/components/organisms/activity/cards/LanguageDonutCard/index.tsx:76-104`.
  - `app/src/styles/views.scss` (Selektor `.a-act-donut-wrap`).
- **Vorgehen:**
  1. Card-Layout `flex-direction: column` (statt row), Donut-Wrap `flex: 1` für volle verfügbare Breite/Höhe.
  2. Legende `display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px;`.
  3. Bei Card-Breite `< 280px` Single-Column-Legende.
- **Test:** Story mit Card in 3 Breiten (240/320/480px).

### B.2 Repo-Default-Avatar einheitlich

- **Symptom:** "repo default avatar, hell oben links, dunkel unten rechts -> einheitlich."
- **Betroffene Dateien:** `app/src/components/molecules/AuthorAvatar/index.tsx:138-155`.
- **Vorgehen:**
  - Option a (empfohlen): Gradient-Richtung pro Avatar deterministisch aus Hash → 4 Richtungen rotieren (`135deg`, `45deg`, `225deg`, `315deg`). Visuell wirken Avatare divers, kein "alle gleich"-Eindruck.
  - Option b: Flat-Color statt Gradient. Einfacher, aber weniger Varianz.
- **Test:** Story mit 24 Avataren in einer Reihe — visuelle Stichprobe.

### B.3 Diagramm-Color-Fade einheitlich

- **Symptom:** "bei diagrammen einheitlicher colorfade."
- **Betroffene Dateien:**
  - `app/src/lib/activityStats.ts` — existiert bereits `ACTIVITY_PALETTE`-Konstante + `buildRepoColorMap`.
  - Alle Chart-Komponenten in `app/src/components/organisms/activity/cards/*`.
- **Vorgehen (siehe auch Phase 0.3 `lib/charts/`-Umbrella):**
  1. **Existierendes extrahieren statt parallel anlegen:** `ACTIVITY_PALETTE` und `buildRepoColorMap` aus `activityStats.ts` nach `app/src/lib/charts/palette.ts`. Re-export aus `activityStats.ts` für rückwärtskompatibilität (oder Importe ändern).
  2. Helper `fade(color, alpha)` und `shade(color, lightnessDelta)` in derselben Datei (HSL-basiert, keine Lib-Dependency).
  3. Alle Charts importieren aus `lib/charts/palette` statt eigener Konstanten.
  4. Donut/Bar/Line/Area: gleiche Reihenfolge → Repo X hat überall die gleiche Farbe.
- **Test:**
  - Unit-Test für `fade`/`shade` mit Tabellen-Cases (input HSL → output Hex).
  - Snapshot-Test pro Card (Farbe-Index 0..5 stable).
  - Manueller Sweep Activity-Page + Dashboard.

---

## Phase C — OS-spezifische Bugs

### C.1 macOS: Spotlight bringt Tray-App nicht in Vordergrund

- **Symptom:** App per X in Tray → cmd+space → App-Name → Enter → App bleibt im Tray.
- **Betroffene Dateien:**
  - `app/src-tauri/src/lib.rs:76-82` — single-instance Plugin.
  - `app/src-tauri/src/lib.rs:282-296` — Tray-Click-Handler ruft `show()`/`unminimize()`/`set_focus()`.
- **Root-Cause-Hypothese:** Spotlight-Launch ist auf macOS keine Second-Instance, sondern ein "reopen" Event auf der bereits laufenden App. Single-Instance-Handler wird nicht getriggert.
- **Vorgehen:**
  1. Helper `fn show_main_window(app: &AppHandle)` extrahieren aus dem bestehenden Tray-Click-Handler (lib.rs:282-296). Ruft `show()`, `unminimize()`, `set_focus()` auf das Hauptfenster.
  2. Builder-Chain in `lib.rs::run()` ändert `.run(generate_context!())` zu:

     ```rust
     app.run(|app_handle, event| match event {
         tauri::RunEvent::Reopen { has_visible_windows: false, .. } => {
             show_main_window(app_handle);
         }
         _ => {}
     });
     ```

  3. **`ActivationPolicy` NICHT auf `Regular` umstellen** — würde die App im Dock erscheinen lassen und mit dem "Tray-only"-Verhalten kollidieren, das `closeToTray` impliziert. `Accessory` bleibt korrekt; das `Reopen`-Event reicht aus.

- **Test:**
  - Manueller Smoke macOS: App schließen mit X → in Tray → cmd+space → "Recrest" → Enter → Fenster im Vordergrund.
  - Manueller Smoke macOS: App schließen mit Cmd+Q → App beendet (kein Tray) — Verhalten unverändert.

### C.2 Windows: Tooltips + Snap-Layouts-Hover-Menü beim Maximize-Button

- **Symptom (zwei Aspekte aus future.md):**
  - "wenn man oben rechts über die items hovert kommen tooltips" — Beschreibung des **aktuellen** Zustands (custom Tooltips von Win11Titlebar.tsx existieren).
  - "für eben diese actions muss aber in minimieren/maximieren beim hover wie in jedem anderen windows app das arrange menu zu sehen sein" — der eigentliche Bug.
- **Betroffene Dateien:** `app/src/components/organisms/layout/Titlebar/Win11Titlebar.tsx:1-114` (custom Tooltips Zeile 32-46/48-93/95-110).
- **Klärung:** Snap-Layouts nutzen das **OS-eigene** Tooltip-System; sobald Snap-Layouts-Menu funktioniert, ist das nativen Tooltip ein Bonus. Empfehlung: custom React-Tooltips entfernen sobald Snap-Layouts greifen, damit es kein Doppel-Tooltip gibt (UX-Inkonsistenz).
- **Root-Cause-Hypothese:** Snap-Layouts triggern nur, wenn das OS den Hover über der Maximize-Button-Region erkennt — `WM_NCHITTEST` muss für die Region `HTMAXBUTTON` (sowie `HTMINBUTTON`/`HTCLOSE` für die Geschwister) zurückgeben. Custom Titlebar in CSS reicht nicht; das WebView fängt das Event vorher ab.
- **Vorgehen:**
  1. **Crate-Pinning:** `windows = "0.58"` (oder neueste 0.5x) in `app/src-tauri/Cargo.toml` mit Features `["Win32_UI_WindowsAndMessaging", "Win32_Foundation"]`.
  2. **Subclass-Proc in `app/src-tauri/src/platform/windows/snap.rs`** (neu) — registriert via `SetWindowSubclass` auf das Hauptfenster nach Tauri-Setup:
     - Bei `WM_NCHITTEST`: Maus-Position in Client-Coords umrechnen, gegen vom Frontend gemeldete Button-Bounds testen, entsprechenden `HTMAXBUTTON` / `HTMINBUTTON` / `HTCLOSE` zurückgeben.
     - Sonst `DefSubclassProc` rufen.
  3. **Cleanup:** `RemoveWindowSubclass` in `RunEvent::Exit` (Memory-Leak-Schutz, wichtig für Hot-Reload während dev).
  4. **Frontend → Backend:** neuer Tauri-Command `set_caption_button_bounds(min: Rect, max: Rect, close: Rect)`. Win11Titlebar misst nach Mount + auf Resize (`ResizeObserver`) und ruft Command.
  5. **Edge-Case:** Tauri's eigene Subclass-Routine (für IME etc.) muss bestehen bleiben — `SetWindowSubclass` erlaubt Stacking via `uIdSubclass`-Diskriminator (verwende einen eigenen).
- **Test:**
  - Windows 11 manuell: Hover über Maximize → Snap-Layouts-Flyout erscheint.
  - Hover über Minimize/Close → OS-Tooltip ("Minimieren"/"Schließen" in System-Sprache).
  - Resize-Snapshot: Bounds aktualisieren sich nach Window-Resize.

### C.3 Windows: Autostart funktioniert nicht

- **Betroffene Dateien:**
  - `app/src/lib/tauri/services/autostartService.ts`.
  - `app/src-tauri/Cargo.toml` (`tauri-plugin-autostart` Version 2.x — pinnen).
  - `app/src-tauri/src/lib.rs` Plugin-Init.
- **Konkrete Reproduktions-Schritte:**
  1. Recrest starten → Settings → System → "Start with system" ON. DevTools-Console und Rust-Logs auf Errors prüfen.
  2. PowerShell: `Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"` → existiert ein `recrest`-Eintrag?
  3. **Wenn nein:** Plugin-Init im `lib.rs` fehlt oder `enable()` failed silent. Tauri-Command-Result in `autostartService.ts` loggen, nicht swallowen.
  4. **Wenn ja, falscher Pfad:** Pfad zeigt auf Dev-EXE statt installierter EXE. Plugin nutzt `std::env::current_exe()` — bei `yarn dev` zeigt es auf den Vite-Wrapper. Dokumentieren: Autostart-Toggle nur in installierter Build wirksam.
  5. **Wenn Pfad ok, App startet trotzdem nicht:** Reboot → Event Viewer → Windows Logs → Application + Apps & Services → Microsoft → Windows → SmartScreen prüfen.
  6. **MSIX/Microsoft Store Install:** anderer Mechanismus (`Windows.Startup.StartupTask`) — nur relevant falls jemals Store-Distribution geplant.
- **Fix-Strategie:**
  1. Plugin-Init in `lib.rs::run()`: `app.plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--start-minimized"])))`. `--start-minimized` koppelt mit C.4.
  2. `autostartService.ts`: Tauri-Errors throwen statt swallow; in Settings-UI als Toast anzeigen.
  3. **Source-of-Truth-Fix:** Settings-Toggle liest `is_enabled()` (Plugin-Call), nicht den `settings.json`-Mirror. Settings-Spiegel kann sonst divergieren wenn der User per Task-Manager → Autostart-Tab den Eintrag manuell deaktiviert.
- **Test:** Manueller Windows-11-Smoke mit installiertem Build — Toggle an, Reboot, App startet im Tray.

### C.4 Windows: "Start minimized" Verhalten klären

- **Symptom (User-Wortlaut):** "start minimized aktivieren führt zum minimieren des windows."
- **Betroffene Dateien:** `app/src-tauri/src/lib.rs:244-250`.
- **Aktueller Code (verifiziert):** Zeile 248 ruft **bereits** `w.hide()` (Tray-Hide), **nicht** `minimize()`. Das User-Symptom passt zum Code nicht direkt — entweder:
  - (a) User interpretiert `hide()` (App verschwindet aus Taskbar, nur Tray) als "minimieren".
  - (b) Auf Windows verhält sich `hide()` anders als erwartet (z.B. wenn die App keine `SkipTaskbar`-Flag hat).
- **Vorgehen:**
  1. **Reproduzieren auf Windows:** Setting "Start minimized" + "Close to tray" jeweils kombinatorisch (4 Permutationen) toggeln, App neu starten, dokumentieren was jeweils passiert.
  2. **Falls Code stimmt (a):** UX-Problem ist Bezeichnung. Settings-Label umbenennen zu "Beim Systemstart in den Tray starten" + Hilfetext. Verhalten unverändert.
  3. **Falls Win32-Quirk (b):** in `lib.rs:244-250` zusätzlich `WS_EX_TOOLWINDOW`-Style setzen oder `set_skip_taskbar(true)` ergänzen damit `hide()` wirklich aus Taskbar verschwindet.
  4. Logik-Konsolidierung mit `closeToTray`:
     - `start_minimized && close_to_tray` → `hide()` + skip-taskbar.
     - `start_minimized && !close_to_tray` → `minimize()` (in Taskbar minimiert sichtbar).
- **Test:** Toggle-Matrix (4 Kombinationen) auf Windows + macOS + Linux dokumentieren.

### C.5 Linux: Wayland nutzen

- **Betroffene Dateien:**
  - `app/src-tauri/tauri.conf.json:80-88`.
  - `.deb`/`.AppImage`-Build-Skripte (CI).
  - Falls `.desktop`-Datei: `Exec=`-Zeile.
- **Vorgehen:**
  1. `.desktop`-Datei `Exec=env GDK_BACKEND=wayland recrest %U`. Auf Wayland-only Sessions reicht das.
  2. **`WEBKIT_DISABLE_DMABUF_RENDERER=1` nur als opt-in Workaround** (nicht default), für User mit Mesa+WebKitGTK Rendering-Glitches. Trade-off dokumentieren: schaltet HW-Acceleration aus → höherer CPU-Verbrauch auf großen Displays. README-Hinweis mit Bedingung "wenn Artefakte/schwarze Flächen auftreten".
  3. **Fallback wenn Wayland nicht verfügbar:** `GDK_BACKEND=wayland` failt auf X11-only-Sessions. Wrapper-Script muss prüfen ob `WAYLAND_DISPLAY` env gesetzt ist und sonst `GDK_BACKEND=x11` setzen.
  4. Bei AppImage: Wrapper-Script mit obigem Check.
  5. WebKitGTK 2.42+ vorausgesetzt (für stabiles Wayland) — in README dokumentieren, in `.deb`-Dependencies als Min-Version pinnen.
- **Test:**
  - Arch + Hyprland + dunst manuell — App rendert ohne XWayland (`xeyes` zeigt sie nicht).
  - Ubuntu 22.04 (X11 GNOME) — App startet weiterhin (Fallback greift).

### C.6 Linux: Scaling-Fix

- **Symptom:** Skalierung kaputt unter Linux.
- **Betroffene Dateien:**
  - `app/src-tauri/src/lib.rs:307-317` — Window-State Scale-Faktor-Konvertierung.
  - `.desktop`-Datei (siehe C.5).
- **Klarstellung:** Linux-Skalierung hat zwei unabhängige Layer, die der Plan trennt:
  - **OS/Compositor-Scale (C.6):** GTK/WebKitGTK reagiert auf `GDK_SCALE` (Integer) + `GDK_DPI_SCALE` (Fractional). Wayland-Compositor liefert das per `wp_fractional_scale_v1` Protokoll automatisch. Auf X11 muss es per env gesetzt werden.
  - **App-interne UI-Scale (D.6):** CSS-Variable `--ui-scale`, multipliziert sich mit OS-Scale.
- **Vorgehen:**
  1. **Wayland-Pfad (siehe C.5):** kein Eingriff nötig, Compositor liefert fractional scaling.
  2. **X11-Fallback:** `.desktop`-Datei oder Wrapper-Script setzt `GDK_SCALE=2` für HiDPI ≥1.5×, sonst leer (Default 1×). Heuristik vereinfachen: User-Setting "Force HiDPI" in Linux-Settings-Sub-Tab ergänzen.
  3. **`LogicalSize` vs `PhysicalSize`-Frage entfernen:** Hat nichts mit Linux fractional scaling zu tun (war Misdiagnose). Window-State-Persistence in `lib.rs:307-317` bleibt unverändert.
- **Test:**
  - Arch + Hyprland + 4K-Display: UI in nativer Größe (nicht doppelt).
  - Ubuntu 22.04 + 1080p + 4K Multi-Monitor: korrekte Skalierung pro Monitor.

### C.7 Linux: Notification-Icon

- **Symptom:** dunst auf Arch zeigt kein App-Icon.
- **Betroffene Dateien:** `app/src-tauri/src/commands/notifications.rs:47-112`.
- **Vorgehen (Reihenfolge nach geringstem Aufwand):**
  1. **App-Icon korrekt installieren:** AppImage/.deb legt `recrest.png` nach `/usr/share/icons/hicolor/{256x256,128x128,64x64}/apps/recrest.png` und ruft `gtk-update-icon-cache`. Dazu `recrest.desktop` mit `Icon=recrest` (kein Pfad, sondern Icon-Name für Theme-Lookup).
  2. **`notify_rust::Notification::icon("recrest")`** statt zbus-Direktaufruf. `tauri-plugin-notification` nutzt unter der Haube `notify-rust`; falls die Plugin-API kein Icon-Setting durchreicht, ein Direkt-Aufruf von `notify-rust` aus `commands/notifications.rs` als Linux-spezifischer Pfad.
  3. **Fallback `image-path`-Hint** falls (1) + (2) auf manchen Compositors nicht greifen: `Hint::ImagePath("/usr/share/icons/hicolor/256x256/apps/recrest.png".to_string())` direkt setzen.
- **Test:**
  - Arch + dunst manuell — Notification zeigt Recrest-Logo.
  - Plasma/KDE Notification-System: Icon ebenfalls da.
  - GNOME: Icon ebenfalls da (GNOME Shell zieht aus desktop-entry, Theme-Lookup muss greifen).

---

## Phase D — Allgemeine UX-Verbesserungen (Future Ideas)

### D.1 Responsive Layout / Card-View Toggle

- **Symptom:** "horizontaler scroll […] Boxen müssen sich ans Bild anpassen […] Möglichkeit eine card view zu zeigen."
- **Betroffene Dateien:** `app/src/components/organisms/repos/RepoList/index.tsx`, MR-Listen, weitere Tabellen.
- **Vorgehen:**
  1. Container-Queries (`@container`) in `views.scss` für RepoRow → unter ~720px Card-Layout.
  2. View-Toggle in Page-Header (`Grouped/Flat/Card`), Pref in `uiSlice.repoListViewMode`.
- **Test:** 3 Breiten visuell.

### D.2 Branch-View: Sektionen kollabierbar, Filter, Suche

- **Status:** Branch-View-Page in Recon nicht eindeutig identifiziert — vor Implementierung lokalisieren.
- **Vorgehen:**
  1. `rg "branch" app/src/pages` → Datei finden.
  2. `<details>`/`<summary>` für Sektionen (Local/Remote/Stale/...).
  3. Filter-Bar: Suche (substring), Status-Filter (merged/unmerged), Hidden-Toggle.
- **Test:** Component-Tests für Filter-Logik, E2E für Suche.

### D.3 Confirmation-Dialoge

- **Vorgehen:**
  1. Atom `app/src/components/atoms/ConfirmDialog/index.tsx`. Hook `useConfirm()` returns `confirm(opts) → Promise<boolean>`.
  2. Verwendung an: Repo entfernen, Force-Push, Discard-Changes, Token-Reset, Reset-Settings.
  3. Auto-Mode-Setting "Confirm risky actions" im Settings-Tab "Behavior" (Default: an).
- **Test:** Component-Test, Hook-Test.

### D.4 Wizard "Zurück"

- **Betroffene Dateien:** `app/src/components/organisms/onboarding/OnboardingWizard/index.tsx:16-72` (`goTo` API + Step-Definitionen 55-67).
- **Aktueller Stand (verifiziert):** Der Wizard hat bereits `goTo`-API; einzelne Steps haben **bereits** `onBack`-Callbacks. Der User-Wunsch ist also nicht "Zurück implementieren", sondern eher: **Zurück-Button konsistent in jedem Step sichtbar + nicht-destruktiv** (Felder bleiben ausgefüllt).
- **Vorgehen:**
  1. **Step-History als Stack** zusätzlich zu `goTo`: jeder `goTo(step)`-Call pusht den vorherigen auf einen Stack; `goBack()` poppt.
  2. **Konsistenter Footer-Back-Button** in `WizardShell` o.ä. (statt jedes Step muss ihn selbst rendern). Disabled auf Step 0 (oder dem Welcome-Step).
  3. **Form-State erhalten:** der Wizard hält bereits `data` als Component-State; `goBack()` darf nichts in `data` resetten.
- **Test:**
  - Component-Test: 3-Step-Pfad mit Form-Eingaben → `goBack` → vorheriger Step + Felder befüllt.
  - E2E: Onboarding-Spec deckt "Zurück" ab.

### D.5 Wischgesten

- **Vorgehen:**
  1. Use-Cases enumerieren: Drawer schließen (swipe right), Page-Wechsel (swipe left/right), MR-Aktion (swipe).
  2. Library: `@use-gesture/react` (klein, framework-frei).
  3. Pro Use-Case Hook (`useDrawerSwipe`, `usePageSwipe`).
- **Test:** Component-Test mit synth. Pointer-Events.

### D.6 Skalierungs-Hotkey + Sync zu Settings

- **Vorgehen:**
  1. Globaler Shortcut `Cmd/Ctrl + +/-/0` in `App.tsx` o.ä.
  2. CSS-Variable `--ui-scale` auf `:root`, alle `rem`/`em` skalieren mit.
  3. `AppSettings.uiScale: number` (default 1.0). Sync via Settings-Slice.
  4. Settings-Slider 0.8–1.5 in System-Settings-Tab.
- **Test:** E2E: Hotkey → Setting-Slider verschiebt sich.

### D.7 Scroll-Memory pro Page

- **Vorgehen:**
  1. Hook `useScrollRestoration(pageId)` schreibt scroll-top auf unmount in `sessionStorage[recrest:scroll:<pageId>]`.
  2. Beim Mount restore.
  3. Anwenden auf Activity, Repo-List, MR-List.
- **Test:** E2E: scrollen → Page-Switch → zurück → Position erhalten.

---

## Phase-übergreifende Verifikation

```bash
yarn typecheck
yarn lint
yarn test
yarn test:e2e
yarn dev:web   # smoke
yarn dev       # smoke (jeweils auf jeder Plattform für C.x)
```

Manuelle Smokes:

- macOS: C.1 + Drawer-Vergleich + Notifications.
- Windows: C.2/C.3/C.4 + Drawer-Vergleich.
- Linux (Arch+Wayland+dunst): C.5/C.6/C.7 + dunst-Icon.
- Cross: A.4 mit Test-Repo "Röhle/Roehle"-Commits, A.6 mit failing CI-Run.
