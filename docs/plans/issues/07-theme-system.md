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

- [x] **Step 1: ThemeWrapper synchron auf Backend-Theme switchen**

  > **Done (anders gelöst):** `settingsReducer.applyBackend` leitet beim Boot `themeId` direkt aus `matchMedia('(prefers-color-scheme: dark)')` ab, wenn `followsSystem === true`. Damit kommt der erste Render bereits mit korrektem Theme aus dem Reducer — kein nachträglicher Sync-Switch nötig. `ThemeWrapper` reagiert zusätzlich auf live System-Wechsel via `matchMedia.addEventListener`. Anti-Flash-Script in `app/index.html` setzt das HTML-Background korrekt vor dem ersten Paint.

- [x] **Step 2: Manueller Smoke**

  > **Done:** macOS Dark Cold-Boot mit App-Data-Reset bestätigt korrekt durch User.

- [x] **Step 3: Commit**

  > **Done:** Teil von `9ad6a05 bugfix: phase 1 — quick wins, live system facts, native i18n plurals` bzw. nachfolgenden Phase-6/7-Commits.

---

## Task 2: HeroDemo synct Theme

**Files:**

- Modify: `landingpage/src/components/HeroDemo.tsx`
- Modify: `shared/src/constants/demo.ts` (Message-Contract — sicherstellen dass Theme-Message-Typ existiert)

- [x] **Step 1: Theme/Locale in iframe-URL injizieren**

  > **Done:** `HeroDemo.tsx` injiziert `?theme=&lng=` aus dem Landingpage-State; `shared/src/constants/demo.ts` definiert den Vertrag, `app/src/lib/demo/demoBridge.ts` konsumiert ihn.

- [x] **Step 2: PostMessage bei Toggle**

  > **Done:** Live-Toggle via `postMessage` (`DEMO_THEME_CHANGE`) implementiert.

- [x] **Step 3: App-Seite konsumiert Query + Message**

  > **Done:** `app/src/lib/demo/demoBridge.ts` handled beide Pfade.

- [x] **Step 4: Manueller Smoke**

  > **Done:** Build geprüft, Phase-1-Acceptance bestätigt.

- [x] **Step 5: Commit**

  > **Done:** Teil der Phase-1-Commits.

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

  > **Status:** Bisher nicht angefasst — bei Task-8-Sweep mit auditieren, gehört konzeptionell mit zur Theming-Revolution.

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

- [x] **Step 1: Crate hinzufügen**

  > **Done (zwischenzeitlich liquid-glass, final wieder `window-vibrancy`):** Wir verwendeten kurz `tauri-plugin-liquid-glass 0.1.6` (steuert auf macOS 26+ Apple's `NSGlassEffectView` an). Das wurde **rückgängig gemacht** — siehe Update-Block unter Task 8: NSGlassEffectView hat auf macOS Tahoe einen Apple-Bug (Schwarz-Flicker bei animierten Fenster-Übergängen / Stage Manager). Finaler Stand: `window-vibrancy = "0.7"` mit `NSVisualEffectMaterial::Sidebar` + `NSVisualEffectState::Active`. `macOSPrivateApi: true` + `transparent: true` in `tauri.conf.json` / `tauri.dev.conf.json` bleiben.

- [x] **Step 2: Bei Window-Create vibrancy anwenden, wenn Theme = Glassy**

  > **Done:** `commands/theme.rs` exportiert `apply_glassy` / `clear_glassy` / `set_theme_effect` / `supports_glassy`; `lib.rs` ruft `apply_glassy` beim Boot wenn das persistierte Theme `glassy` ist.

- [x] **Step 3: Smoke macOS**

  > **Done:** User bestätigt visuell dass Translucency funktioniert.

- [x] **Step 4: Commit**

  > **Done:** Teil der Phase-7-Arbeit (noch uncommitted, wird mit Phase-7-Commit gebündelt).

---

## Task 5: OLED → „OLED Black"

**Files:**

- Modify: `app/src/locales/{de,en}/settings.json`

- [x] **Step 1: Label ändern**

  > **Done:** Labels sind `theme.themes.oled = "OLED Black"` (EN) / „OLED Schwarz" (DE).

- [x] **Step 2: Commit**

  > **Done:** Teil der Phase-7-Arbeit.

---

## Task 6: Glassy auf Linux entweder funktional oder ausgeblendet

**Files:**

- Modify: `app/src/lib/utils/appearance.utils.ts` (oder Theme-Selector-Component)

- [x] **Step 1: Capability-Check**

  > **Done:** `commands/theme.rs::supports_glassy()` liefert `cfg!(target_os = "macos")` zurück. Wird in Task 8 zu `supports_translucency()` umbenannt.

- [x] **Step 2: Theme-Selector blendet Glassy aus falls nicht supported**

  > **Done:** Selector liest `supports_glassy` via IPC und filtert. In Task 8 obsolet, weil Glassy als eigenes Theme entfällt.

- [x] **Step 3: Commit**

  > **Done:** Teil der Phase-7-Arbeit.

---

## Task 7: Theme-Flicker-Audit

**Files:**

- Modify: alle Stellen die `settings.theme` schreiben (zu finden via grep)

- [x] **Step 1: Audit-Grep**

  > **Done:** Audit war Grundlage für den Fix in `applyBackend` (Boot-Override des Dark-Mode beim Backend-Sync) und für die `OnboardingWizard`-Selektor-Stabilisierung (`Object.keys(items)` → `Object.keys(items).length`).

- [x] **Step 2: `syncSystemTheme` darf nicht `theme`-Feld schreiben**

  > **Done:** Boot-Pfad in `applyBackend` derivt den effective `themeId` aus `matchMedia`, ohne den vom User gewählten `themeId` zu überschreiben, solange `followsSystem === true` ist.

- [ ] **Step 3: Reducer-Tests pro Toggle**

  ```ts
  it("Notifications-Toggle ändert theme nicht", () => {
    const initial = { theme: "system", notifications: false };
    const next = settingsReducer(initial, setNotifications(true));
    expect(next.theme).toBe(initial.theme);
  });
  ```

  Analog: Crash-Reports-Toggle, Tray-Toggles, jeder Setting-Toggle.

  > **Status:** Noch offen, wird mit Task 8 erledigt.

- [ ] **Step 4: Findings fixen**

  Pro gefundener Stelle, an der ein Toggle versehentlich `theme` resetet, Fix in einem Commit.

  > **Status:** Keine konkreten Findings über die in Step 1+2 abgedeckten hinaus.

- [ ] **Step 5: Smoke**

  In `yarn dev`: Theme manuell auf „Dunkel" stellen, dann zufällig 5 Toggles in Settings+Tray+Wizard klicken. Theme bleibt unverändert.

- [ ] **Step 6: Commit**

  ```bash
  git add app/src
  git commit -m "fix(theme): toggles never accidentally reset user theme"
  ```

---

## Task 8: Erscheinungsbild-Revolution (Glassy raus, Translucency als orthogonaler Effekt)

> **Trigger:** Nach explizitem User-„Go". Vorher nicht starten.

> ### ⚠️ Update (Implementierungs-Stand) — Translucency-Backend gewechselt + bekannter macOS-Bug
>
> Bei der Umsetzung von Task 8 stellte sich `tauri-plugin-liquid-glass` als ungeeignet heraus und wurde **komplett entfernt** (Plugin-Registrierung, Cargo-Dependency, Capability-Permission). Begründung & Endstand:
>
> - **Backend final:** Translucency läuft jetzt über die `window-vibrancy`-Crate (`NSVisualEffectView`, Material `Sidebar`, State `Active`), aufgerufen in `commands/theme.rs::apply_translucency` / `clear_translucency`. Das Plugin steuerte auf macOS 26 Apple's `NSGlassEffectView` an, das einen Apple-seitigen Render-Bug hat.
> - **Bekannter Bug — Stage-Manager-Schwarz-Flicker:** Beim Fokus-Zurückholen über Stage Manager blitzt die durchsichtige Fläche ~1 Frame schwarz (`blur → schwarz → blur`). Durch systematisches Ausschließen bewiesen, dass es das **OS-Vibrancy-Material** ist, das beim Swap-In-Übergang flackert — **OS-Ebene (macOS Tahoe), nicht app-fixbar**, solange der Desktop-Blur erhalten bleibt. Reproduziert mit NSGlassEffectView, NSVisualEffectView (beide States), WKWebView-Occlusion deaktiviert und NSWindow-Backing clear — verschwindet nur, wenn das OS-Material ganz weg ist (dann aber kein Blur). **Entscheidung: als bekannter macOS-Bug akzeptiert.** Tracking: [#85](https://github.com/SoftVentures/Recrest/issues/85).
> - **Nebenbefund (separat zu tracken):** CSS `backdrop-filter` kann den Desktop hinter einem transparenten Fenster **nicht** blurren (Window-Server kompositet außerhalb des Webinhalts). Der gesamte sichtbare Blur kommt vom OS-Material mit festem Radius → der Blur-Intensitäts-Slider (`--translucency-blur-px`) ist aktuell ein No-Op. Der CSS-`::before`-Blur-Layer ist totes Gewicht. Ebenfalls in [#85](https://github.com/SoftVentures/Recrest/issues/85) notiert.
> - **System-Theme-Fix (Teil dieser Arbeit):** Klick auf „System" löst jetzt via `followSystemTheme`-Thunk die OS-Wahrheit aus Rust (`get_system_dark_mode`) auf, statt WKWebViews unzuverlässigem `matchMedia` zu vertrauen; `applyBackend` überschreibt `themeId` bei `followsSystem` nicht mehr aus matchMedia; matchMedia-`change`-Events werden gegen Rust validiert. Damit folgt der „System"-Picker korrekt der OS-Appearance, und der frühere Dark-Blink beim Fokus ist weg.

**Goal:** Theme-System neu denken. Nur noch drei Basis-Themes: **System**, **Light**, **Dark**. Glassy fällt als eigenständiges Theme weg. Stattdessen wird **Translucency** ein orthogonaler Effekt, der sich on-top auf das aktive Theme (light/dark) legt — steuerbar über einen Toggle plus einen Intensitäts-Slider. Außerdem wird der aktuell beobachtete Switch-Flicker (beim Aktivieren von Translucency wechselt der Hintergrund kurz mehrfach zwischen dunkel und transparent) sauber beseitigt.

**Architecture:**

- `settings.appearance` bekommt zwei Achsen:
  - `themeId: "system" | "light" | "dark"` (kein `glassy` mehr)
  - `translucency: { enabled: boolean; intensity: number /* 0..100 */ }`
- `themeId === "system"` wird intern weiterhin über `matchMedia` auf `light`/`dark` aufgelöst — nichts ändert sich am palette-Mechanismus.
- Translucency ist ein orthogonaler **Effekt-Layer**:
  - Frontend: HTML-Root-Background steht nur dann auf `transparent`, wenn Translucency aktiv ist — sonst auf `theme.palette.background.default`. Dadurch ist das Umschalten zwischen Light↔Dark vom Translucency-Pfad entkoppelt und kann nicht mehr flackern.
  - Backend: `tauri-plugin-liquid-glass` setzt/clearet den Window-Effekt; `intensity` mappt auf `LiquidGlassConfig` (initial naiv: variant-step; mittelfristig auf `tint_alpha`/Material wenn die API es zulässt — sonst auf 2-3 abgestufte Presets gemapt).
- Flicker-Fix-Strategie:
  1. **Single-Source-of-Truth:** Genau ein Effekt in `ThemeWrapper` setzt HTML-Root-Background; er bekommt `(themeId, translucency.enabled)` als deps und schreibt **einmal** den finalen Wert, nicht zwei separate Effekte die nacheinander dunkel→transparent toggeln.
  2. **Plugin-Call vor sichtbarem Repaint:** Translucency-IPC (`set_translucency`) wird im **selben** Effect synchron getriggert (kein zusätzlicher Render-Roundtrip), aber als fire-and-forget ohne State-Roundtrip. Plugin ist intern `run_on_main_thread`-dispatched.
  3. **Anti-Flash-Script erweitern:** `app/index.html`-Snippet liest persistierte `translucency.enabled` aus localStorage und setzt HTML-Background **vor** dem ersten Paint korrekt (transparent oder Theme-Hintergrund), damit kein „erst dunkel, dann transparent"-Frame entsteht.
  4. **Keine doppelten IPC-Calls:** Aktuell rufen Boot-`apply_glassy` (Rust) und FE-`set_theme_effect` (auf themeId-change) beide den Plugin-Effekt — das kann unter ungünstigem Timing toggeln. Im neuen Modell ruft nur **ein** Pfad: FE-`set_translucency(enabled, intensity)`, beim Boot ein einziger Sync aus dem persistierten State.
- Glassy → Migration: persistierte `themeId === "glassy"` wird beim ersten Boot des neuen Schemas konvertiert zu `themeId = "dark"`, `translucency = { enabled: true, intensity: 70 }`. Migration ist idempotent.
- `supports_glassy` → `supports_translucency` (gleiche Implementierung, Rename).

**Tech Stack:** Tauri v2, `tauri-plugin-liquid-glass`, React 19 + MUI v9 styled() (kein `sx`), i18next (en+de).

**Files:**

- Modify: `shared/src/types/settings.ts` (oder analoges Shared-Modul, je nachdem wo `AppearanceSettings` lebt) — `themeId` auf `"system" | "light" | "dark"` einschränken, `translucency`-Block ergänzen
- Modify: `app/src-tauri/src/...` — Backend-Settings-Shape parallel updaten (camelCase via serde)
- Modify: `app/src/store/reducers/settingsReducer.ts` — Migration alter `glassy` themeId → `dark` + `translucency.enabled=true`, neuer Reducer-Pfad für `setTranslucencyEnabled` / `setTranslucencyIntensity`
- Modify: `app/src/store/actions/settingsActions.ts` (oder analog) — neue Action-Creators / Thunks
- Modify: `app/src/theme/themes/` — Glassy-Theme-Datei löschen / als Theme-Variante entfernen; `KNOWN_THEME_IDS` nur noch `light`, `dark`
- Modify: `app/src/theme/ThemeWrapper.tsx` — Single-Effect HTML-Bg + IPC-Call, deps `(effectiveThemeId, translucency.enabled, translucency.intensity)`
- Modify: `app/src-tauri/src/commands/theme.rs` — `set_translucency(enabled: bool, intensity: u8)` + `supports_translucency()`; alte `set_theme_effect` als Deprecated entfernen
- Modify: `app/src-tauri/src/lib.rs` — `generate_handler!` neu registrieren, Boot-Apply liest jetzt `translucency` statt `themeId === "glassy"`
- Modify: `app/index.html` — Anti-Flash-Script liest zusätzlich `translucency.enabled`-Flag und setzt HTML-Background korrekt vor first paint
- Modify: `app/src/pages/app/Settings/components/AppearanceTab/index.tsx` — neue UI: Theme-Picker (System/Light/Dark) + Translucency-Switch + Intensitäts-Slider (disabled wenn `supports_translucency() === false` oder Toggle off)
- Modify: `app/src/lib/utils/appearance.utils.ts` — Theme-Liste auf 3 Einträge reduzieren, Glassy-Helper raus
- Modify: `app/src/locales/{en,de}/settings.json` — neue Strings: `appearance.translucency.label`, `…intensity.label`, `…hint`, alter `theme.themes.glassy`-Key entfernen
- Modify: `app/src/lib/constants/` — Konstanten für `set_translucency` IPC-Name + neue testids
- Audit: ESLint `no-restricted-syntax`-Konformität (keine magic strings), Cargo-Tests grün, Vitest grün, `yarn test:ts` + `yarn lint` clean
- Modify: `landingpage/src/...` (falls Glassy als Theme-Choice in der Landingpage-Demo gespiegelt ist — Task 3 mit auditieren und zusammen erledigen)

### Steps

- [ ] **Step 1: Shared-Types + Backend-DTO updaten**

  In `shared/src/types/...` `themeId` auf das neue Union einschränken und `translucency`-Feld hinzufügen. Backend-DTO mit `#[serde(rename_all = "camelCase")]` mitziehen, sodass Rust und TS denselben Vertrag sprechen. `KNOWN_THEME_IDS` in `appearance.utils.ts` reduzieren.

- [ ] **Step 2: Reducer-Migration**

  In `settingsReducer.applyBackend` und initial-state-Mapper: alter `themeId === "glassy"` → `{ themeId: "dark", translucency: { enabled: true, intensity: 70 } }`. Migration ist idempotent (wenn `translucency` schon existiert: nichts tun).

- [ ] **Step 3: Backend-Commands umstellen**

  `commands/theme.rs`: `set_translucency(app, window, enabled: bool, intensity: u8)` mit Mapping intensity → LiquidGlassConfig-Variante (initial: 0..33 → low/none, 34..66 → mid, 67..100 → full). `supports_translucency()` als Rename von `supports_glassy()`. Alte `set_theme_effect` löschen. `lib.rs::generate_handler!` updaten. Boot-Apply in `lib.rs` liest `settings.appearance.translucency.enabled` und ruft `apply_glassy(&handle, &window)` bzw. `clear_glassy`.

- [ ] **Step 4: Frontend-IPC-Wrapper + Thunks**

  Neue `setTranslucency`-Thunks die `invoke<void>(IPC.SET_TRANSLUCENCY, { enabled, intensity })` rufen. Konstante in `app/src/lib/constants/` ergänzen.

- [ ] **Step 5: ThemeWrapper-Single-Effect**

  Ein einziger `useEffect` mit deps `[effectiveThemeId, translucency.enabled, translucency.intensity]`: setzt `document.documentElement.style.backgroundColor` (transparent vs Theme-Default) und ruft denselben Tick `setTranslucency`-Thunk auf. Kein zusätzlicher zweiter Effekt der getrennt toggelt. Damit verschwindet der dunkel→transparent→dunkel→transparent-Flicker.

- [ ] **Step 6: Anti-Flash-Script erweitern**

  `app/index.html`-`<script>` liest neben Theme auch `translucency.enabled` aus localStorage und entscheidet vor first paint, ob HTML-Root transparent ist. Bleibt die **einzige** sanktionierte Magic-String-Stelle (siehe CLAUDE.md).

- [ ] **Step 7: AppearanceTab UI**

  Theme-Picker auf drei Einträge: System / Light / Dark. Darunter ein eigener Block „Translucency" mit Switch + Slider (0..100). Slider/Switch sind disabled, wenn `supports_translucency` false ist (Linux/Windows) — Hint-Text erklärt warum. Alles via MUI `styled()`, kein `sx`.

- [ ] **Step 8: i18n**

  `settings.json` (en+de): neue Keys `appearance.translucency.label`, `appearance.translucency.intensity.label`, `appearance.translucency.unsupported`. Glassy-Keys löschen.

- [ ] **Step 9: Reducer-Tests**

  Vitest:
  - Glassy-Migration: `themeId: "glassy"` → `themeId: "dark"`, `translucency.enabled === true`.
  - 5 Toggles (Notifications, Crash-Reports, Tray-Toggles, Autostart, …) ändern `themeId` und `translucency` nicht.
  - `setTranslucencyIntensity` clampt auf [0, 100].

- [ ] **Step 10: Smoke + Playwright-Verify**

  - macOS: Translucency aus → dark Theme opaque. Translucency an → Wallpaper durchscheinend. Switch ist **ein** sichtbarer Übergang, kein Doppel-Flicker.
  - System-Theme folgt OS-Wechsel live.
  - Slider zeigt 3 unterscheidbare Intensitäten.
  - Per Playwright-Skript Settings öffnen, Translucency toggeln, Screenshots in `.screenshots/` ablegen.

- [ ] **Step 11: Landingpage (siehe Task 3)**

  Default = System, Toggle persistiert in `recrest:landingpage:theme`. Demo-iframe-URL spiegelt Translucency nicht (Demo läuft im Web, kein Plugin verfügbar) — nur Theme.

- [ ] **Step 12: Commit (User)**

  HARD RULE: einzeilige Commit-Message, kein AI-Footer, Prefix `bugfix:`. Beispiel:

  ```
  bugfix: replace glassy theme with orthogonal translucency toggle + slider
  ```

  Der User committed — wir nicht.

---

## Verification

- [x] **macOS-Dark Cold-Boot:** kein weißer Flash länger als 1 Frame (Phase-7 erledigt via `applyBackend` matchMedia)
- [x] **Landingpage-Demo:** Theme matcht beim Laden + bei Toggle (Phase-1 erledigt)
- [ ] **Landingpage default = System** ohne LocalStorage-Eintrag (in Task 8 / Task 3 mitziehen)
- [x] **Glassy auf macOS:** Vibrancy sichtbar (final via `window-vibrancy` / NSVisualEffectView — liquid-glass plugin entfernt, siehe Task-8-Update); auf Linux: Option nicht in Liste (`supports_translucency === false`)
- [x] **OLED-Label** zeigt „OLED Black" (EN) / „OLED Schwarz" (DE)
- [ ] **5 zufällige Toggles** in Settings/Tray/Wizard ändern Theme nicht (Task 8 Step 9 + Smoke)
- [ ] **Translucency-Switch flackert nicht** beim Aktivieren — exakt ein Übergang vom opaken zum transparenten Hintergrund (Task 8 Step 5 + 6)
- [~] **Stage-Manager-Fokus-Flicker:** bekannter macOS-Tahoe-Bug, akzeptiert — Tracking [#85](https://github.com/SoftVentures/Recrest/issues/85)
- [ ] **Translucency-Slider** verändert sichtbar die Intensität — ⚠️ aktuell No-Op für den Desktop-Blur (nur OS-Material mit festem Radius blurrt; CSS-backdrop-filter erreicht den Desktop nicht), siehe [#85](https://github.com/SoftVentures/Recrest/issues/85)
- [ ] **Glassy-Migration:** alter persistierter `themeId: "glassy"` wird zu `themeId: "dark"` + `translucency.enabled = true`
