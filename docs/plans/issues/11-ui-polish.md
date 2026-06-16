# Phase 8 — UI-Politur — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Logo als Nav-Element, ActivityChart 24h-Achse + Wochentag-Icons, Code-Ligaturen-Setting auf Boolean reduziert, Shortcuts-Sektion auditiert und repariert, macOS-Icon-Audit, gefoldete Left-Navbar Time-Selector mit Tooltip.

**Architecture:** Mehrere kleine, unabhängige Polish-Tasks. Keine neuen Backend-Module außer ggf. ein Icon-Re-Generation-Pass.

**Tech Stack:** React + MUI v9, SVG-Quellen, vorhandene Icon-Generation-Scripts.

---

## File Structure

- Modify: `app/src/layouts/AppLayout/...` — Logo als Button
- Modify: `app/src/pages/app/Dashboard/parts/ActivityChart/index.tsx` — 24h-Marker, Achsen-Icons
- Modify: `app/src/lib/utils/appearance.utils.ts` — `LigatureMode` → boolean
- Modify: `app/src/locales/{de,en}/common.json:786-787` — Label
- Modify: `app/src/store/reducers/settingsReducer.ts` — Migration
- Audit + Modify: Shortcuts-Sektion + zugehörige Keybinding-Implementierung
- Modify: `app/src/assets/logos/recrest-icon-mac-*.svg` — Icon-Quellen
- Modify: linke Sidebar — Time-Selector Tooltip + Styling im collapsed-State

---

## Task 1: Logo als Nav-Element

**Files:**

- Modify: `app/src/layouts/AppLayout/...` (oder Ort des Logo-Headers)

- [ ] **Step 1: Logo zu `<button>` umbauen**

```tsx
import { useNavigate } from "react-router-dom";

import { ROUTE_PATHS } from "@/lib/constants/routes.constants";

const navigate = useNavigate();
<LogoButton onClick={() => navigate(ROUTE_PATHS.dashboard)} aria-label={t("aria:home")}>
  <Logo />
</LogoButton>;

// LogoButton — styled-component mit Hover-Tint
const LogoButton = styled("button")(({ theme }) => ({
  background: "transparent",
  border: 0,
  cursor: "pointer",
  padding: 4,
  borderRadius: theme.shape.borderRadius,
  "&:hover": { background: theme.palette.action.hover },
}));
```

(Native `<button>` mit Eslint-Disable und kurzer Begründung — siehe app/CLAUDE.md.)

- [ ] **Step 2: aria-Locale-String ergänzen**

`aria.json` (DE/EN): `"home": "Zum Dashboard"` / `"home": "Go to dashboard"`.

- [ ] **Step 3: Tests + Commit**

```bash
git add app/src
git commit -m "feat(layout): logo navigates to dashboard with hover state"
```

---

## Task 2: ActivityChart 24h-Achse + Wochentag-Icons

**Files:**

- Modify: `app/src/pages/app/Dashboard/parts/ActivityChart/index.tsx`

- [ ] **Step 1: X-Achse Ticks bis 24**

Aktuelle Tick-Generation finden (vermutlich `[0, 6, 12, 18, 23]` oder ähnlich). Auf `[0, 6, 12, 18, 24]` ändern und den 24-Tick am rechten Rand ausrichten.

- [ ] **Step 2: Wochentag-Icons an Y-Achsen-Enden**

```tsx
import { MoonIcon, SunIcon } from "@/assets/icons/...";

// Y-Achse: Wochentage. Erstes Label-Slot ergänzt durch SunIcon, letztes durch MoonIcon.
<YAxisLabel>
  <SunIcon size={12} aria-hidden /> {t("weekdays.sun")}
</YAxisLabel>;
// analog für letzten Tag (z.B. Samstag): MoonIcon
```

Konkrete Icon-Wahl ggf. mit User klären — Default: Sun + Moon aus Lucide.

- [ ] **Step 3: Test + Smoke**

Run: `yarn workspace @recrest/app test ActivityChart`
Browser-Smoke: Dashboard öffnen, Chart prüfen.

- [ ] **Step 4: Commit**

```bash
git add app/src
git commit -m "feat(activity): 24h tick on x-axis, sun/moon icons on weekday axis"
```

---

## Task 3: Code-Ligaturen-Setting → Boolean

**Files:**

- Modify: `app/src/lib/utils/appearance.utils.ts`
- Modify: `app/src/store/reducers/settingsReducer.ts`
- Modify: Settings-UI „Code-Ligaturen"
- Modify: `app/src/locales/{de,en}/common.json:786-787`

- [ ] **Step 1: `LigatureMode` → boolean**

```ts
// appearance.utils.ts
// Vorher: export type LigatureMode = "off" | "standard" | "stylistic";
// Nachher:
export type LigatureMode = boolean;
export function codeLigatureFeatureSettings(enabled: boolean): string {
  return enabled ? '"liga" 1, "calt" 1, "ss01" 1' : '"liga" 0, "calt" 0';
}
```

- [ ] **Step 2: Reducer-Migration**

```ts
// Beim Hydrate: prev.codeLigatures: string → boolean
const codeLigatures: boolean =
  typeof prev?.codeLigatures === "string"
    ? prev.codeLigatures !== "off"
    : (prev?.codeLigatures ?? true);
```

- [ ] **Step 3: UI auf Switch reduzieren**

Bisheriger 3-Option-Selector → `<GeneralSwitchInput checked={codeLigatures} onChange={...} />`.

- [ ] **Step 4: Sub-Label anpassen**

```json
"code_ligatures_sub": "Programmier-Ligaturen wie =>, !=, >= im Code anzeigen."
```

- [ ] **Step 5: Test + Commit**

Run: `yarn workspace @recrest/app test`

```bash
git add app/src
git commit -m "fix(settings): reduce code-ligatures to on/off switch"
```

---

## Task 4: Shortcuts-Sektion Audit + Fix

**Files:**

- Modify: Settings → Shortcuts-Sektion (suchen via `grep -rn "shortcuts" app/src/pages/app/Settings`)
- Modify: zugehörige Keybinding-Registrierung (suchen via `grep -rn "useHotkeys\\|useKeybinding\\|key:" app/src`)

- [ ] **Step 1: Jede Zeile gegen tatsächliche Bindung prüfen**

Workflow:

1. Liste alle in der Shortcuts-Sektion gezeigten Einträge auf
2. Für jeden: `grep -rn "<key-combo>" app/src` — gibt es eine tatsächliche Bindung? Macht sie das was die Beschreibung sagt?
3. Findings notieren: falsche Taste / nicht funktional / fehlt

- [ ] **Step 2: Falsche Tasten korrigieren oder Bindung anpassen**

Pro Finding: entweder die UI-Zeile korrigieren oder die fehlende/falsche Bindung implementieren.

- [ ] **Step 3: Platform-Mapping prüfen**

```tsx
const isMac = navigator.platform.toLowerCase().includes("mac"); // oder useDevice
const modKey = isMac ? "⌘" : "Ctrl";
```

Konsistente `<Kbd>`-Komponente für die Darstellung (`<Kbd>⌘</Kbd>` + `<Kbd>S</Kbd>`).

- [ ] **Step 4: Gruppierung**

Shortcuts gruppiert nach Bereich (Navigation, Aktionen, Suche, etc.) statt eine lange Liste.

- [ ] **Step 5: Smoke**

In `yarn dev`: 10 zufällige Shortcuts ausprobieren, jeder funktioniert wie beschrieben.

- [ ] **Step 6: Commit**

```bash
git add app/src
git commit -m "fix(shortcuts): audit and correct all keyboard shortcut entries"
```

---

## Task 5: macOS App-Icon-Audit

**Files:**

- Modify: `app/src/assets/logos/recrest-icon-mac-light.svg`, `-mac-dark.svg`, `-mac-dev-light.svg`, `-mac-dev-dark.svg`

- [ ] **Step 1: Visual-Inspektion der vier mac-SVGs**

Jede der vier Dateien öffnen (in Browser oder Vector-Editor). Prüfen:

- Sind beide Dreiecke sichtbar gegen heller UND dunkler Background-Material?
- Insbesondere `mac-dark.svg`: das dunkle Glyph ist nicht reines `#000`; es hat hellen Kontrast zum Haupt-Dreieck so dass beide gegen den Dock-Background sichtbar bleiben

- [ ] **Step 2: Anpassen wo nötig**

Falls ein Glyph zu schwarz ist: heller setzen (z.B. `#444` statt `#000` für sekundäres Dreieck im dark icon). Mainglyph kann unverändert bleiben.

- [ ] **Step 3: Icon-Re-Generation**

Run: `yarn workspace @recrest/app gen:prod-icons`

- [ ] **Step 4: Smoke**

`yarn tauri:build` (oder die generierten Icons in einer Vorab-Build-App installieren), Dock auf macOS-Dark UND Light prüfen, Finder „Get Info" Preview.

- [ ] **Step 5: Commit**

```bash
git add app/src/assets/logos app/src-tauri/icons
git commit -m "fix(icons): ensure both triangles visible against any macOS background"
```

---

## Task 6: Gefoldete Left-Navbar Time-Selector

**Files:**

- Modify: linke Sidebar / Time-Selector (suchen mit `grep -rn "TimeSelector\\|ActivityRange\\|range.selector" app/src`)

- [ ] **Step 1: Tooltip im collapsed-State**

```tsx
const collapsed = useSidebarCollapsed();
const rangeLabel = useAppSelector(selectCurrentRangeLabel);
return (
  <GeneralTooltip title={collapsed ? rangeLabel : ""} placement="right">
    <SelectorTrigger collapsed={collapsed}>
      {/* Icon im collapsed-State, Icon + Label sonst */}
    </SelectorTrigger>
  </GeneralTooltip>
);
```

- [ ] **Step 2: Visuelle Konsistenz**

Im collapsed-State: Selector hat dieselbe Icon-Größe, dasselbe Padding, denselben Hover-State wie die anderen Sidebar-Items darüber. Falls heute ein Label sich quetscht: nur Icon zeigen.

- [ ] **Step 3: Test + Smoke**

Run: `yarn workspace @recrest/app test` und Browser-Smoke: Sidebar collapsen, Hover über Time-Selector → Tooltip zeigt aktuellen Range.

- [ ] **Step 4: Commit**

```bash
git add app/src
git commit -m "fix(sidebar): tooltip and consistent styling for time selector in collapsed state"
```

---

## Verification

- [ ] `yarn test:ts && yarn workspace @recrest/app test && yarn lint`
- [ ] **Smoke (`yarn dev`)**:
  - Logo-Klick → Dashboard
  - Activity-Chart: 24-Marker rechts, Sun/Moon-Icons an Wochentag-Achsen
  - Code-Ligaturen: Switch an/aus, Effekt sichtbar in MonoFont
  - 10 Shortcuts funktionieren wie gelistet
  - Sidebar collapsed → Time-Selector hat Tooltip + sieht aus wie andere Items
- [ ] **macOS-Icon-Check**: Dock + Finder zeigen beide Dreiecke in Light + Dark
