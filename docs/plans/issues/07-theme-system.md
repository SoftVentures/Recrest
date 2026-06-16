# Phase 4a — Theme-System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Theme verhält sich vorhersagbar — korrekt beim ersten Boot, Landingpage-Demo synct mit Landingpage-Theme, Landingpage selbst folgt System, Glassy ist cross-platform funktional oder ausgeblendet, OLED heißt jetzt OLED Black, kein Theme-Flicker bei Toggle-Wechseln.

**Architecture:** Anti-Flash-Script bleibt, aber `ThemeWrapper` ruft `get_system_dark_mode` ohne Transition-Delay; HeroDemo injiziert Theme als Query-Param; Landingpage-Init liest `prefers-color-scheme`; Glassy nutzt `window-vibrancy` Crate; Reducer-Audit für unbeabsichtigte Theme-Resets.

**Tech Stack:** Tauri v2, `window-vibrancy` Crate, React Context.

---

## File Structure

- Modify: `app/src/theme/ThemeWrapper.tsx` — Boot-Sync ohne Transition
- Modify: `app/index.html` — Anti-Flash-Script Note (kein Funktionswechsel)
- Modify: `landingpage/src/components/HeroDemo.tsx` — Theme-Sync via Query + postMessage
- Modify: `landingpage/src/...` Theme-Init — System als Default
- Modify: `app/src-tauri/src/lib.rs` — Window-Vibrancy für macOS / Windows Glassy
- Modify: `app/src-tauri/Cargo.toml` — `window-vibrancy` Crate
- Modify: `app/src/lib/utils/appearance.utils.ts` + Theme-Selector — Glassy auf Linux ausblenden falls nicht supported
- Modify: `app/src/locales/{de,en}/settings.json` — `oled` → „OLED Black" / „OLED Schwarz"
- Audit: `app/src/store/reducers/settingsReducer.ts` + alle Stellen die `settings.theme` schreiben

---

## Task 1: Boot-Theme-Flash beseitigen

**Files:**

- Modify: `app/src/theme/ThemeWrapper.tsx`

- [ ] **Step 1: ThemeWrapper synchron auf Backend-Theme switchen**

Im `ThemeWrapper`-Effect der `get_system_dark_mode` ruft: Transition-CSS temporär abschalten beim ersten Sync.

```tsx
useEffect(() => {
  if (!isTauri()) return;
  invoke<boolean | null>("get_system_dark_mode").then((isDark) => {
    if (isDark === null) return;
    document.documentElement.classList.add("no-transitions");
    dispatch(syncSystemTheme(isDark));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("no-transitions");
      });
    });
  });
}, []);
```

Plus globale CSS-Regel `.no-transitions *, .no-transitions *::before, .no-transitions *::after { transition: none !important; }`.

- [ ] **Step 2: Manueller Smoke**

Auf macOS-Dark Frischinstallation simulieren (App-Data löschen → starten). Wenn weniger als 2 Frames weiß ist es ok.

- [ ] **Step 3: Commit**

```bash
git add app/src
git commit -m "fix(theme): suppress transition on first system-theme sync to avoid white flash"
```

---

## Task 2: HeroDemo synct Theme

**Files:**

- Modify: `landingpage/src/components/HeroDemo.tsx`
- Modify: `shared/src/constants/demo.ts` (Message-Contract — sicherstellen dass Theme-Message-Typ existiert)

- [ ] **Step 1: Theme/Locale in iframe-URL injizieren**

```tsx
const theme = useLandingpageTheme(); // existing or new hook reading current effective theme
const locale = useLandingpageLocale();
const src = `${DEMO_BASE}?theme=${theme}&lng=${locale}`;
```

- [ ] **Step 2: PostMessage bei Toggle**

```tsx
useEffect(() => {
  iframeRef.current?.contentWindow?.postMessage({ type: DEMO_THEME_CHANGE, theme }, "*");
}, [theme]);
```

`DEMO_THEME_CHANGE`-Konstante aus `shared/src/constants/demo.ts` benutzen (oder ergänzen).

- [ ] **Step 3: App-Seite konsumiert Query + Message**

`app/src/lib/demo/demoBridge.ts` prüfen — sollte Query-Params + postMessage bereits handhaben. Falls Lücke: ergänzen.

- [ ] **Step 4: Manueller Smoke**

Run: `yarn build:demo && yarn workspace @recrest/landingpage preview` → Landingpage öffnen, Theme togglen → Demo-iframe wechselt mit.

- [ ] **Step 5: Commit**

```bash
git add landingpage shared
git commit -m "feat(demo): hero-demo theme + locale follow landingpage state"
```

---

## Task 3: Landingpage Default-Theme = System

**Files:**

- Modify: `landingpage/src/...` Theme-Init

- [ ] **Step 1: Theme-Init prüft `prefers-color-scheme`**

```ts
const stored = localStorage.getItem("recrest:landingpage:theme");
const initial =
  stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
```

Sicherstellen dass das ohne `stored` System folgt; bei Toggle wird in `stored` geschrieben.

- [ ] **Step 2: Smoke**

Browser auf dark stellen → `localStorage.removeItem(...)` → reload → dunkel.

- [ ] **Step 3: Commit**

```bash
git add landingpage
git commit -m "fix(landingpage): default to system theme when no preference stored"
```

---

## Task 4: Glassy auf macOS via window-vibrancy

**Files:**

- Modify: `app/src-tauri/Cargo.toml`
- Modify: `app/src-tauri/src/lib.rs`

- [ ] **Step 1: Crate hinzufügen**

Run: `cd app/src-tauri && cargo add window-vibrancy`

- [ ] **Step 2: Bei Window-Create vibrancy anwenden, wenn Theme = Glassy**

```rust
#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

fn maybe_apply_glassy(window: &tauri::WebviewWindow) {
    #[cfg(target_os = "macos")]
    {
        let _ = apply_vibrancy(window, NSVisualEffectMaterial::Sidebar, None, None);
    }
    #[cfg(target_os = "windows")]
    {
        let _ = window_vibrancy::apply_acrylic(window, None);
    }
    // Linux: nicht universell supported → siehe Task 6
}
```

Den Aufruf an passende Stelle im Window-Setup-Flow oder als Tauri-Command `apply_theme_window_effect(theme)` der bei Theme-Wechsel gerufen wird.

- [ ] **Step 3: Smoke macOS**

`yarn dev` → Theme „Glassy" → Sidebar zeigt vibrancy.

- [ ] **Step 4: Commit**

```bash
git add app/src-tauri
git commit -m "feat(theme): glassy uses NSVisualEffect on macOS, acrylic on Windows"
```

---

## Task 5: OLED → „OLED Black"

**Files:**

- Modify: `app/src/locales/{de,en}/settings.json`

- [ ] **Step 1: Label ändern**

```json
"theme.themes.oled": "OLED Black"      // EN
"theme.themes.oled": "OLED Schwarz"    // DE
```

- [ ] **Step 2: Commit**

```bash
git add app/src/locales
git commit -m "fix(theme): label OLED theme as 'OLED Black'"
```

---

## Task 6: Glassy auf Linux entweder funktional oder ausgeblendet

**Files:**

- Modify: `app/src/lib/utils/appearance.utils.ts` (oder Theme-Selector-Component)

- [ ] **Step 1: Capability-Check**

Backend-Command `system::supports_glassy() → bool`:

```rust
#[tauri::command]
pub fn supports_glassy() -> bool {
    #[cfg(any(target_os = "macos", target_os = "windows"))] return true;
    #[cfg(target_os = "linux")] return false; // konservativ
}
```

- [ ] **Step 2: Theme-Selector blendet Glassy aus falls nicht supported**

```tsx
const supportsGlassy = useGlassySupport();
const themes = ["light", "dark", "oled", ...(supportsGlassy ? ["glassy"] : [])];
```

- [ ] **Step 3: Commit**

```bash
git add app/src app/src-tauri
git commit -m "fix(theme): hide glassy option on platforms without vibrancy support"
```

---

## Task 7: Theme-Flicker-Audit

**Files:**

- Modify: alle Stellen die `settings.theme` schreiben (zu finden via grep)

- [ ] **Step 1: Audit-Grep**

Run: `grep -rn "settings\\.theme\\b\\|setTheme\\|theme:\\s*[\"']" app/src/store app/src/components app/src/hooks`

- [ ] **Step 2: `syncSystemTheme` darf nicht `theme`-Feld schreiben**

Sicherstellen: `syncSystemTheme` setzt nur `effectiveTheme` (oder analoges Render-Feld), nicht das User-gewählte `theme`-Setting.

- [ ] **Step 3: Reducer-Tests pro Toggle**

```ts
it("Notifications-Toggle ändert theme nicht", () => {
  const initial = { theme: "system", notifications: false };
  const next = settingsReducer(initial, setNotifications(true));
  expect(next.theme).toBe(initial.theme);
});
```

Analog: Crash-Reports-Toggle, Tray-Toggles, jeder Setting-Toggle.

- [ ] **Step 4: Findings fixen**

Pro gefundener Stelle, an der ein Toggle versehentlich `theme` resetet, Fix in einem Commit.

- [ ] **Step 5: Smoke**

In `yarn dev`: Theme manuell auf „Dunkel" stellen, dann zufällig 5 Toggles in Settings+Tray+Wizard klicken. Theme bleibt unverändert.

- [ ] **Step 6: Commit**

```bash
git add app/src
git commit -m "fix(theme): toggles never accidentally reset user theme"
```

---

## Verification

- [ ] **macOS-Dark Cold-Boot:** kein weißer Flash länger als 1 Frame
- [ ] **Landingpage-Demo:** Theme matcht beim Laden + bei Toggle
- [ ] **Landingpage default = System** ohne LocalStorage-Eintrag
- [ ] **Glassy auf macOS:** Vibrancy sichtbar; auf Linux: Option nicht in Liste
- [ ] **OLED-Label** zeigt „OLED Black" (EN) / „OLED Schwarz" (DE)
- [ ] **5 zufällige Toggles** in Settings/Tray/Wizard ändern Theme nicht
