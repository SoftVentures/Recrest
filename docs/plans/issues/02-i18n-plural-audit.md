# Phase 1.5 — i18n-Plural-Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jeder String mit einer Count-Variable nutzt i18next-native Pluralisierung (`_one`/`_other`/`_zero`); manuell zusammengebaute „N item(s)"-Strings entfernt; DE-Übersetzungen grammatikalisch korrekt.

**Architecture:** Audit-Phase mit reproduzierbarem Sweep-Script, dann Fix-Commits pro Namespace. Optional ein Build-Time-Check als CI-Sicherung.

**Tech Stack:** i18next 23, react-i18next 14.

---

## File Structure

- Create: `scripts/audit-i18n-plurals.mjs` — Audit-Script, lokal und in CI nutzbar
- Modify: alle Files unter `app/src/locales/{de,en}/*.json` mit fehlenden `_one`/`_other`-Paaren
- Modify: alle `.tsx`/`.ts`-Files die `t(key, { count })` mit nicht-pluralisiertem Key aufrufen
- Modify: alle Stellen die manuelle Plural-Strings zusammenbauen (Template-Literals, `${n} item${n === 1 ? '' : 's'}`-Patterns)

---

## Task 1: Audit-Script schreiben

**Files:**

- Create: `scripts/audit-i18n-plurals.mjs`

- [ ] **Step 1: Script schreiben**

```js
// scripts/audit-i18n-plurals.mjs
import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["de", "en"];
const NS_DIR = "app/src/locales";
const violations = [];

// 1) JSON-Pluralisierungs-Check
for (const lng of LOCALES) {
  const dir = join(NS_DIR, lng);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const flat = flattenJson(JSON.parse(readFileSync(join(dir, file), "utf8")));
    for (const [key, val] of Object.entries(flat)) {
      if (typeof val !== "string") continue;
      const hasCountVar = /\{\{count\}\}/.test(val);
      const hasPluralSuffix = /_(one|other|zero|few|many|two)$/.test(key);
      if (hasCountVar && !hasPluralSuffix) {
        violations.push({ lng, file, key, val, kind: "count-without-plural-key" });
      }
      if (hasPluralSuffix) {
        const base = key.replace(/_(one|other|zero|few|many|two)$/, "");
        if (!flat[`${base}_other`]) {
          violations.push({ lng, file, key, kind: "missing-other-counterpart" });
        }
      }
    }
  }
}

// 2) Code-Side-Check: t(...) mit count: ... ohne pluralisierten Key
const grep = execSync(`grep -rn --include="*.tsx" --include="*.ts" "count:" app/src || true`, {
  encoding: "utf8",
});
// Heuristisch loggen — manueller Audit der Treffer nötig
console.log("=== JSON Violations ===");
for (const v of violations) console.log(JSON.stringify(v));
console.log("=== `count:` callsites (manual audit) ===");
console.log(grep);

process.exit(violations.length ? 1 : 0);

function flattenJson(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flattenJson(v, key));
    else out[key] = v;
  }
  return out;
}
```

- [ ] **Step 2: Script ausführen, Ergebnis sammeln**

Run: `node scripts/audit-i18n-plurals.mjs > /tmp/i18n-audit.log 2>&1; cat /tmp/i18n-audit.log`
Expected: Liste aller Verstöße — dient als Arbeitsgrundlage für die folgenden Tasks.

- [ ] **Step 3: Commit**

```bash
git add scripts/audit-i18n-plurals.mjs
git commit -m "chore(scripts): add i18n plural audit script"
```

---

## Task 2: JSON-Violations beheben (alle Namespaces, beide Locales)

**Files:**

- Modify: betroffene `app/src/locales/{de,en}/*.json` (basierend auf Audit-Output)

- [ ] **Step 1: Pro Namespace die fehlenden `_one`/`_other`-Paare ergänzen**

Für jeden Verstoß aus dem Audit:

1. Falls `{{count}}` im String ist: Schlüssel in `key_one` + `key_other` aufteilen mit korrekten Singular-/Plural-Formen
2. Falls bereits ein `_one` ohne `_other` existiert: `_other`-Variante ergänzen
3. EN- und DE-Versionen parallel pflegen — beide brauchen das gleiche Schlüsselpaar
4. Bei `count === 0`: `_zero` ergänzen wo das die UX verbessert (z.B. „Keine Repositories" vs. „0 Repositories")

Beispiel-Refactor:

```json
// Vorher
"items_found": "{{count}} Treffer gefunden"
// Nachher
"items_found_one": "{{count}} Treffer gefunden",
"items_found_other": "{{count}} Treffer gefunden",
"items_found_zero": "Keine Treffer"
```

(DE hat phonetisch oft identische Singular-/Plural-Formen — trotzdem beide Schlüssel anlegen, weil i18next sie braucht.)

- [ ] **Step 2: Audit-Script erneut laufen lassen**

Run: `node scripts/audit-i18n-plurals.mjs`
Expected: Exit-Code 0 (keine Violations mehr).

- [ ] **Step 3: Typecheck**

Run: `yarn test:ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/src/locales
git commit -m "fix(i18n): add _one/_other plural keys across all locales and namespaces"
```

---

## Task 3: Callsite-Audit — manuelle Plural-Strings auf i18next umstellen

**Files:**

- Modify: alle Files die aus der Audit-Script-Liste mit `count:` auffallen und manuelle Pluralisierung machen

- [ ] **Step 1: Manueller Durchgang der `count:`-Treffer**

Vom Audit-Script-Output ausgehend: jeden `t(..., { count })`-Aufruf prüfen, ob der referenzierte Key pluralisiert ist. Falls nicht: Key umbenennen / Locale-Datei nachziehen.

- [ ] **Step 2: Manuelle Template-Strings finden**

Run: `grep -rnE "\\$\\{[^}]+\\}\\s*item|\\$\\{[^}]+\\}s?\\b" app/src --include="*.tsx" --include="*.ts"`
Expected: Heuristische Liste von Stellen die manuell pluralisieren. Jede Stelle prüfen — typische Patterns:

```tsx
// Anti-Pattern
const label = `${count} repo${count === 1 ? "" : "s"}`;
// Korrekt
const label = t("repo_count", { count });
```

- [ ] **Step 3: Pro gefundener Stelle: umstellen + zugehörigen Locale-Key ergänzen wenn nicht existent**

Pro Stelle:

1. Sinnvollen Key benennen (`namespace:repo_count` etc.)
2. `key_one` und `key_other` in beiden Locales anlegen
3. Komponente auf `t(key, { count })` umstellen
4. Test schreiben falls Komponente Tests hat (siehe Task 1 von Phase 1 als Beispiel)

- [ ] **Step 4: Audit-Script erneut, Tests laufen lassen**

Run: `node scripts/audit-i18n-plurals.mjs && yarn workspace @recrest/app test && yarn test:ts`
Expected: alles grün.

- [ ] **Step 5: Commit**

```bash
git add app/src
git commit -m "refactor(i18n): replace manual plural strings with i18next native pluralization"
```

---

## Task 4: DE-Übersetzungs-Sweep (Qualität, nicht Plural)

**Files:**

- Modify: `app/src/locales/de/*.json`

- [ ] **Step 1: Side-by-side EN→DE durchgehen**

Pro Namespace: EN- und DE-Datei nebeneinander öffnen, jeden Eintrag prüfen auf:

- Sinngleichheit (DE übersetzt nicht 1:1 Wort-für-Wort wenn die Bedeutung im Deutschen anders rüberkommt)
- Konsistentes Gendering — entweder durchgehend neutral oder durchgehend Generisches Maskulinum (Memory: User-Sprache ist locker, gendert nicht — also Generisches Maskulinum)
- Fachbegriffe bleiben englisch wo idiomatisch (Pull Request, Merge Request, Repository, Branch, Commit, Pull, Fetch, Push)
- Tippfehler

- [ ] **Step 2: Findings in einem Commit**

```bash
git add app/src/locales/de
git commit -m "fix(i18n/de): translation quality pass across all namespaces"
```

---

## Task 5: Optional — CI-Integration des Audit-Scripts

**Files:**

- Modify: `package.json` (Root-Scripts)
- ggf. Modify: `.github/workflows/*.yml`

- [ ] **Step 1: Script als yarn-Befehl exposen**

In Root-`package.json`:

```json
"scripts": {
  "audit:i18n": "node scripts/audit-i18n-plurals.mjs"
}
```

- [ ] **Step 2: In bestehende CI-Pipeline einbinden**

Run: `grep -l "yarn test:ts\|yarn lint" .github/workflows`
Im passenden Workflow vor `yarn lint`:

```yaml
- run: yarn audit:i18n
```

- [ ] **Step 3: Commit**

```bash
git add package.json .github/workflows
git commit -m "ci: enforce i18n plural correctness on PR"
```

---

## Verification

- [ ] **Audit-Script grün:** `yarn audit:i18n` Exit-Code 0
- [ ] **Build/Tests:** `yarn test:ts && yarn workspace @recrest/app test`
- [ ] **Stichprobe:** in `yarn dev` 10 zufällige UI-Stellen mit Counts durchklicken (0, 1, 2, 5) — alle Plural-Formen korrekt in DE und EN
