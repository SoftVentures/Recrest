# Phase 1.7 — Static-Data-Sweep — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jeden Wert in der App, der als Fakt dargestellt wird (Versionen, OS, Counts, Statistiken, Pfade, „Erkannt: …"-Hinweise), durch eine Live-Quelle ersetzen. Phase 1.3 hat das Pattern bereits am System-Facts-Beispiel etabliert — diese Phase wendet es überall an.

**Architecture:** Reproduzierbarer Sweep-Script + manuelle Inspektion der Treffer, dann gezielte Fixes mit existierenden Backend-Commands / Store-Selectors / Vite-Defines.

**Tech Stack:** Tauri v2 Commands, Vite-Defines (für Build-Time-Werte wie App-Version), Redux-Selectors.

---

## File Structure

- Create: `scripts/audit-static-facts.mjs` — Sweep-Script
- Modify: betroffene Locale-Dateien, Components, Settings-Sektionen (basierend auf Audit-Output)
- Ggf. neue Backend-Commands für Daten die heute hardcoded sind aber dynamisch sein sollten

---

## Task 1: Audit-Script

**Files:**

- Create: `scripts/audit-static-facts.mjs`

- [ ] **Step 1: Script schreiben**

```js
// scripts/audit-static-facts.mjs
import { execSync } from "node:child_process";

const PATTERNS = [
  {
    name: "OS-Strings in Locales",
    cmd: `grep -rnE '"(macos|windows|linux|darwin)( [0-9.]+)?"' app/src/locales || true`,
  },
  {
    name: "Arch in Locales",
    cmd: `grep -rnE '"(x86_64|aarch64|arm64|x64)"' app/src/locales || true`,
  },
  {
    name: "Version-Strings in Locales",
    cmd: `grep -rnE '"v?[0-9]+\\.[0-9]+\\.[0-9]+"' app/src/locales || true`,
  },
  {
    name: "Hardcoded Versions in Components",
    cmd: `grep -rnE "['\\"]v?[0-9]+\\.[0-9]+\\.[0-9]+['\\"]" app/src --include="*.tsx" --include="*.ts" | grep -v "stories\\|test" || true`,
  },
  {
    name: "Hardcoded counts in JSX",
    cmd: `grep -rnE ">[0-9]{2,}<" app/src --include="*.tsx" | grep -v "stories\\|test" || true`,
  },
  {
    name: "Erkannt:/Detected: strings",
    cmd: `grep -rnE "Erkannt:|Detected:" app/src --include="*.tsx" --include="*.ts" --include="*.json" || true`,
  },
];

for (const p of PATTERNS) {
  console.log(`\n=== ${p.name} ===`);
  try {
    console.log(execSync(p.cmd, { encoding: "utf8" }));
  } catch (e) {
    console.log(e.stdout?.toString() ?? "");
  }
}
```

- [ ] **Step 2: Script ausführen, Ergebnis sammeln**

Run: `node scripts/audit-static-facts.mjs > /tmp/static-facts-audit.log 2>&1; cat /tmp/static-facts-audit.log`
Expected: Liste aller verdächtigen Stellen — dient als Arbeitsgrundlage.

- [ ] **Step 3: Commit**

```bash
git add scripts/audit-static-facts.mjs
git commit -m "chore(scripts): add static-data audit sweep"
```

---

## Task 2: Treffer-Triage

**Files:**

- Working-Doc (lokal, nicht commiten): Trefferliste durchgehen

- [ ] **Step 1: Audit-Output kategorisieren**

Jeden Treffer in eine von drei Kategorien einordnen:

- **Fakt** → muss durch Live-Quelle ersetzt werden (Task 3 ff.)
- **Beispiel/Placeholder** → bleibt, sollte aber als solcher klar erkennbar sein (z.B. `placeholder="/pfad/zu/repos"`)
- **Konstante** → nicht-Fakt, bleibt unverändert (z.B. CSS-Werte, magische Zahlen mit anderem Sinn)

- [ ] **Step 2: Arbeitsliste zusammenstellen**

Working-Doc mit Format:

```
- file:line — was steht da? — Kategorie — Fix-Plan
```

---

## Task 3: App-Version überall durch Vite-Define ersetzen

**Files:**

- Modify: `app/vite.config.ts` (Define existiert vermutlich für About-Dialog — sicherstellen dass alle nutzen)
- Modify: Components/Locales die hardcoded eine App-Version zeigen

- [ ] **Step 1: Vite-Define prüfen**

Run: `grep -n "VITE_APP_VERSION\|__APP_VERSION__\|package.json" app/vite.config.ts`
Expected: existierender Define-Block (laut Memory: `feedback_devstub` Commit „pull About version from package.json via vite define"). Wenn nicht existiert: anlegen.

```ts
// app/vite.config.ts
import pkg from "./package.json";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
```

Plus Type-Declaration:

```ts
// app/src/vite-env.d.ts
declare const __APP_VERSION__: string;
```

- [ ] **Step 2: Hardcoded App-Versionen ersetzen**

Pro Treffer aus Audit: `t("...", { version: __APP_VERSION__ })` oder direkter Verweis auf `__APP_VERSION__`. Locale-Strings die ein hardcoded `"v1.2.3"` enthielten werden zu `"v{{version}}"`.

- [ ] **Step 3: Test + Commit**

Run: `yarn test:ts`

```bash
git add app
git commit -m "fix(app): single source of truth for app version via vite define"
```

---

## Task 4: „Erkannt: $Platform"-artige Strings gegen reale Detection

**Files:**

- Modify: Components/Locales mit „Erkannt:"-/„Detected:"-Strings (aus Audit)

- [ ] **Step 1: Pro Treffer: prüfen ob hinter dem String tatsächlich eine Detection läuft**

Beispiel `settings.json`: `"shortcuts_detected": "· Erkannt: {{platform}}"` ist schon parametrisiert — gut. Aber: wird `{{platform}}` mit echtem Detection-Wert befüllt? Run: `grep -rn "shortcuts_detected" app/src --include="*.tsx"`.

Wenn ja: ok. Wenn nein: Backend-Call (`useDevice()` oder `get_system_facts()`) einhängen.

- [ ] **Step 2: Pro Treffer: Detection einhängen oder als statisch erkennen und entfernen**

- [ ] **Step 3: Test + Commit**

Run: `yarn workspace @recrest/app test`

```bash
git add app/src
git commit -m "fix(detection): bind all 'Detected: …' strings to actual runtime detection"
```

---

## Task 5: Counts und Statistiken aus Store statt hardcoded

**Files:**

- Modify: Components die Zahlen in JSX hardcoden (aus Audit)

- [ ] **Step 1: Pro Treffer prüfen**

`>123<`-Treffer in JSX prüfen: ist die Zahl eine echte Stat (dann Selector), eine Designkonstante (z.B. Animation-Duration → bleibt), oder ein Beispielwert (raus oder als Placeholder klar machen)?

- [ ] **Step 2: Echte Stats umstellen auf Selectors**

Beispiel:

```tsx
// Anti-Pattern
<Card>87 Pull Requests</Card>;
// Korrekt
const count = useAppSelector(selectOpenPrCount);
<Card>{t("prs.open_count", { count })}</Card>;
```

- [ ] **Step 3: Test + Commit**

Run: `yarn test:ts && yarn workspace @recrest/app test`

```bash
git add app/src
git commit -m "refactor(stats): wire hardcoded counts to live selectors"
```

---

## Task 6: Storage-/Cache-Größen über echten Backend-Read

**Files:**

- Create/Modify: `app/src-tauri/src/commands/system.rs::get_data_sizes`
- Modify: Settings → „Daten & Cache"-Sektion: zeigt echte Größen

- [ ] **Step 1: Backend-Command**

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataSizes {
    pub settings_bytes: u64,
    pub cache_bytes: u64,
    pub tokens_bytes: u64,
}

#[tauri::command]
pub fn get_data_sizes(app: tauri::AppHandle) -> Result<DataSizes, CommandError> {
    let dir = app.path().app_data_dir().map_err(|e| CommandError::internal(e.to_string()))?;
    Ok(DataSizes {
        settings_bytes: file_size(dir.join("settings.json")),
        cache_bytes: dir_size(&dir.join("cache")),
        tokens_bytes: file_size(dir.join("dev-tokens.json")),
    })
}

fn file_size(p: PathBuf) -> u64 { std::fs::metadata(&p).map(|m| m.len()).unwrap_or(0) }
fn dir_size(p: &Path) -> u64 { walkdir::WalkDir::new(p).into_iter().filter_map(|e| e.ok()).filter_map(|e| e.metadata().ok()).filter(|m| m.is_file()).map(|m| m.len()).sum() }
```

In `lib.rs::generate_handler![...]` registrieren.

- [ ] **Step 2: Settings-Sektion zeigt die Werte**

Sektion „Daten & Cache" bekommt eine Live-Anzeige der drei Größen. Format-Util `formatBytes(n)` in `app/src/lib/utils/format.utils.ts`.

- [ ] **Step 3: Test + Commit**

```bash
git add app/src-tauri app/src
git commit -m "feat(settings): show real data/cache sizes from backend"
```

---

## Task 7: Final-Sweep + CI

**Files:**

- Modify: `package.json` (Root-Script)
- ggf. `.github/workflows/*.yml`

- [ ] **Step 1: Sweep wiederholen**

Run: `node scripts/audit-static-facts.mjs > /tmp/static-facts-after.log 2>&1; cat /tmp/static-facts-after.log`
Expected: nur noch legitime Treffer (Placeholders, Konstanten, Storybook-Mocks). Jeder verbleibende Treffer wird kommentiert oder explizit ausgeschlossen (z.B. via Whitelist im Script).

- [ ] **Step 2: Audit-Script als yarn-Befehl + CI-Integration**

```json
// package.json
"scripts": { "audit:static": "node scripts/audit-static-facts.mjs" }
```

In bestehender CI ergänzen.

- [ ] **Step 3: Commit**

```bash
git add package.json .github/workflows
git commit -m "ci: enforce static-data sweep on PR"
```

---

## Verification

- [ ] **Sweep grün:** `yarn audit:static` zeigt nur erwartete Treffer
- [ ] **`yarn dev`:** Settings → System / Daten & Cache / Diagnose alle Werte real
- [ ] **App-Version-Anzeige:** an mind. 3 Stellen (About, Settings-Footer, Onboarding-Header) zeigt sie denselben Wert wie `package.json`
