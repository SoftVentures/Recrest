# Plan 2 — Material UI Migration

## Context

Plan 1 hat die App stabilisiert (Cross-Platform-Bugs, UI-Polish, OS-Spezifika, UX-Verbesserungen). **Vor** Plan 3 (Repo Management & Git Actions) und Plan 4 (Activity / Stats / Settings) räumen wir die **Design-Schuld** auf: ein gewachsener Mix aus eigenem SCSS (`app/src/styles/{tokens,layout,views,page-anim}.scss`), Tailwind v4, Radix-Primitiven (Dropdown/Dialog/Select/Tabs/Tooltip/Checkbox/Switch/Separator/Label/Slot) und handgerollten Atoms/Molecules (`Button`, `Input`, `Checkbox`, `Switch`, `IconButton`, `Drawer`, `DropdownMenu` Wrapper, `Badge`, …). Jede neue UI braucht heute drei Layer (CSS-Variable → SCSS-Klasse → React-Wrapper) und es gibt keine durchgängige Component-API, keine konsistenten Props, fragmentierte Stories, fragmentierte Tests.

**Warum jetzt (vor Plan 3+4) statt am Ende?** Plan 3 baut ~6 große neue UI-Surfaces (Working-Copy-Panel, Commit-Dialog, CI-Tab, MR-Files-Tab, Deployments-Block, Provider-Integration). Plan 4 baut ~10 weitere (Insights-Cards, DateRangePicker, Terminal-Picker, Token-Help). Wenn die in alter Mixed-Stack-UI entstehen, migrieren wir sie später ein zweites Mal nach MUI. Migration jetzt = Plan 3+4-Komponenten werden von Beginn an in MUI gebaut und brauchen keinen Re-Refactor.

**Ziel:** Auf **Material UI v7** (Joy UI **nicht** — bleibt nicht weiter gepflegt; MUI Core ist die Linie die Anthropic intern und das MUI-Team aktiv weiterentwickelt) als Single-Source-of-Truth migrieren. Custom SCSS → MUI `sx`/`styled()`/Theme. Radix → MUI Komponenten. Eigene Atoms → MUI direkt oder dünne MUI-Wrapper mit Story + Unit-Test.

**Nicht-Ziele:**

- Keine funktionale Veränderung. Verhalten, IPC, Redux-Flows, i18n, Tauri-Stub bleiben identisch.
- Kein Wechsel weg von React 19, Vite, Vitest, Storybook 10, Tauri v2.
- Tailwind wird **entfernt** (nicht koexistieren — MUI `sx` ersetzt es). Begründung siehe §A.1.
- Joy UI wird **nicht** verwendet (MUI hat es eingefroren).
- Kein Wechsel zu CSS-in-JS-Build-Plugin (`@mui/styled-engine-sc` o.ä.) — wir bleiben bei MUI's Default emotion engine. Begründung: das CLAUDE.md-Verbot von PostCSS-Reintro greift nicht (emotion injectet zur Laufzeit), und der zweistufige Compiler von styled-components/PandaCSS/Linaria ist mehr Aufwand als Nutzen für eine Tauri-WebView-App.

**Source-of-Truth-Hinweis:** Bei Konflikt mit Plan 1 (Styling) gewinnt **dieser** Plan. **Funktionale** Anforderungen aus Plan 1 gewinnen über Styling-Entscheidungen hier. Plan 3 und Plan 4 **bauen direkt gegen das MUI-Theme dieses Plans** — keine Tailwind-Klassen, kein SCSS, kein Custom-Wrapper außer dem was hier in Phase B–D definiert ist.

---

## Phase 0 — Vorab-Entscheidungen (vor irgendeinem Code)

### 0.1 MUI-Paketwahl

- `@mui/material` (Core, Pin auf `^7.x` — neueste stable Linie zum Plan-Zeitpunkt).
- `@mui/icons-material` für Standard-Icons; **ergänzend** behalten wir `lucide-react` und `simple-icons` für brand-spezifische Icons (GitHub/GitLab/Bitbucket, IDEs). Die `Icon`/`BrandIcon`-Atoms werden dünne Adapter, die je nach `name` entweder MUI- oder Lucide-/Simple-Icons rendern (siehe §B.2).
- `@mui/lab` nur wenn explizit gebraucht (TreeView für späteren Repo-Tree?). Default: **nicht** installieren.
- `@emotion/react`, `@emotion/styled` (Peer-Deps von MUI).

**Verboten:**

- `@mui/joy` — eingefroren, kein Update-Pfad.
- `@mui/styles` — deprecated (JSS).
- `@mui/system` alleine ohne `@mui/material` — wir wollen die fertigen Components, nicht nur die `sx`-Engine.

### 0.2 Theming-Strategie

Heutige Token-Welt in `app/src/styles/tokens.scss` muss 1:1 in MUI-Theme abgebildet werden, damit Dark-Mode + Accent-Palette + Font-Scale weiterhin funktionieren:

```ts
// app/src/theme/createRecrestTheme.ts (NEU)
import { type Theme, createTheme } from "@mui/material/styles";

export type RecrestAccent = "default" | "blue" | "green" | "purple" | "pink" | "amber";
export type RecrestMode = "light" | "dark";

export function createRecrestTheme(opts: { mode: RecrestMode; accent: RecrestAccent }): Theme {
  const tokens = pickTokens(opts); // liefert dieselben Werte wie heute :root / [data-theme="dark"]
  return createTheme({
    palette: {
      mode: opts.mode,
      primary: { main: tokens.accent, contrastText: tokens.accentInk },
      secondary: { main: tokens.ink1 },
      background: { default: tokens.appBg, paper: tokens.surface },
      text: { primary: tokens.ink1, secondary: tokens.ink2, disabled: tokens.ink4 },
      divider: tokens.border,
      error: { main: tokens.red },
      warning: { main: tokens.amber },
      success: { main: tokens.green },
      info: { main: tokens.blue },
    },
    shape: { borderRadius: 8 }, // entspricht --radius-md
    typography: {
      fontFamily: "var(--font-sans)", // bleibt CSS-Var-getrieben (Font-Switch über data-font="…")
      fontSize: 13, // Body-Default
      htmlFontSize: 16, // MUI rem-Basis bleibt 16
      // …Heading-Stufen mit unseren bestehenden Sizes belegen
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: true, size: "small" } },
      MuiTextField: { defaultProps: { size: "small", variant: "outlined" } },
      MuiTooltip: { defaultProps: { arrow: false, enterDelay: 200 } },
      // …Defaults damit Calls knapp bleiben (Komponenten sehen MUI-Default sonst „bürokratisch" aus)
    },
  });
}
```

Provider in `main.tsx`:

```tsx
<ThemeProvider theme={theme}>
  <CssBaseline enableColorScheme />
  <App />
</ThemeProvider>
```

`theme` ist `useMemo`-driven aus `settings.theme` + `settings.accent` + `settings.font` + `settings.uiScale` (alle vier sind heute schon im Redux-Settings-Slice). Bei Änderung von Mode/Accent **wird `theme` neu erzeugt** — das ist der idiomatische MUI-Weg statt der heutigen `<html data-theme=…>`-Attribute. Die Attribute bleiben aber zusätzlich gesetzt, weil:

- Tailwind-Dark-Variant zog daraus → entfällt mit §A.1.
- **Tauri-Window-Chrome (`useWindowChrome`)** liest sie nicht; bleibt unverändert.
- E2E-Tests (`tests/`) verlassen sich nicht darauf (überprüfen via Snapshot).

**`--ui-scale` / `--ui-scale-pref`:** Bleiben CSS-Variablen auf `<html>` (heute in `useThemeEffect`). MUI's `theme.typography.fontSize` ist statisch zur Render-Zeit; UI-Scale muss weiterhin per `transform: scale()` auf `#root` laufen (steht so in `tokens.scss` mit detailliertem Begründungs-Kommentar). Wir migrieren nicht.

**`prefers-reduced-motion` / `data-high-contrast` / `data-underline-links`:** Bleiben als HTML-Attribute, da sie querschnittlich greifen (auch auf Tauri-Chrome).

**Begründung Theme-vs-CSS-Vars-Koexistenz:** Wir hätten alle Tokens als reine `palette.*`-Werte ablegen können. Dann müssten aber `Icon`-Atom-Color-Props (heute `var(--accent)`), SVG-Strokes, und die paar Stellen die `color-mix(in oklab, var(--ink-1) 5%, transparent)` brauchen, alle umgeschrieben werden. Stattdessen: **MUI-Theme ist Quelle**, generiert beim `createRecrestTheme`-Aufruf die `:root`-CSS-Var-Strings als Side-Effect (siehe `tokens.scss`-Inhalt wandert in `theme/cssVars.ts`). So bleibt `var(--accent)` in handgeschriebenem SCSS oder SVG legitim, und der Theme-Switch updated **eine** Quelle.

### 0.3 SCSS-Exit-Strategie

`app/src/styles/` heute:

- `tokens.scss` — wird zu `theme/cssVars.ts` (siehe 0.2). Bleibt als CSS-Datei, aber generiert.
- `layout.scss` — Layout-Klassen (`.app`, `.shell`, `.a-dp-*`, `.a-mr-*`, `.a-detail`, `.a-act-*`). **Schrittweise abbauen** während die Components migriert werden (siehe Phase-Reihenfolge §B). Letzte Reste in `layout-legacy.scss` umbenennen wenn nur noch <10% übrig sind, dann am Schluss von Phase D entfernen.
- `views.scss` — gleicher Plan. Die `.seg-group/.seg-btn/.seg-count`-Klassen werden zu `<ToggleButtonGroup>` (siehe §B.5), `.repo-card-actions` zu MUI-`<Stack>` mit `sx`.
- `page-anim.scss` — bleibt (Page-Mount-Animationen). MUI hat kein dediziertes Layout-Animations-System; das ist eine Vite/CSS-Sache.
- `globals.css` — minimal halten (Resets, scrollbars, body, html). Kann größtenteils zu MUI `CssBaseline` + `GlobalStyles` migrieren.

**SCSS-Build:** `sass` Dev-Dep bleibt **bis Ende Phase D** installiert, danach entfernen. Vite kompiliert `.scss` ohne Plugin solange `sass` im node_modules ist.

### 0.4 Tailwind-Exit-Strategie

Tailwind v4 in der App wird heute über `@tailwindcss/vite` plus Klassen-Usage in TSX genutzt (`className="ml-2"`, `"mr-2"`, `"capitalize"`, `"text-destructive"`, `"focus:text-destructive"`, `"w-56"`, `"h-2 w-2"`, `"rounded-full"`, `"bg-primary"`, `"bg-muted"`, `"inline-block"`).

**Migration:**

1. Inventur: `rg "className=\"[^\"]*\\b(ml-|mr-|p-|w-|h-|bg-|text-|rounded|flex|grid|gap-)" app/src` — Inventory ist <200 Lines (geschätzt). Jeder Hit wird zu `sx={{…}}` oder zu MUI-Komponente.
2. Tailwind-spezifische Tokens (`bg-primary`, `bg-muted`, `text-destructive`) sind in keiner `tailwind.config.*` definiert (Tailwind v4 nutzt CSS-Vars). Sie verweisen auf shadcn/Radix-Konventionen die wir partiell schon ersetzt haben — direkter Umstieg auf MUI-Theme-Tokens (`color="error"`, `bgcolor="action.hover"`).
3. Nach 100% Umzug: `@tailwindcss/vite`, `tailwindcss`, `tw-animate-css`, `tailwind-merge`, `class-variance-authority`, `clsx` aus `package.json` entfernen. **`clsx` bleibt** wenn anderswo verwendet (rg-Check vor Entfernen).
4. `app/src/styles/globals.css` Tailwind-Direktiven (`@tailwind base/components/utilities` oder v4-Äquivalent `@import "tailwindcss"`) entfernen.

**Während der Migration koexistieren Tailwind + MUI.** Das ist explizit unterstützt (MUI-Docs „Using MUI with Tailwind"). Phase-übergreifende Regel: **neue** Components nutzen nur MUI; **migrierte** Components verlieren Tailwind-Klassen mit ihrer Migration.

### 0.5 Radix-Exit-Strategie

Mapping Radix → MUI:

| Radix Paket           | MUI-Ersatz                                           | Anmerkung                                                                                                                                                                                                                             |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react-alert-dialog`  | `Dialog` + Buttons                                   | Wir haben unsere eigene `ConfirmDialog` (`molecules/compounds/ConfirmDialog`) — wird MUI-`Dialog`-Wrapper.                                                                                                                            |
| `react-checkbox`      | `Checkbox`                                           | 1:1.                                                                                                                                                                                                                                  |
| `react-dialog`        | `Dialog`                                             | 1:1, plus `Drawer` für Seiten-Panels.                                                                                                                                                                                                 |
| `react-dropdown-menu` | `Menu` + `MenuItem`                                  | MUI hat kein Sub-Menu out-of-the-box; falls heute genutzt → `nested-menus`-Plugin oder Custom. Inventur §B.4.                                                                                                                         |
| `react-label`         | `FormLabel` / `InputLabel`                           | 1:1 wo es um Form-Labels geht.                                                                                                                                                                                                        |
| `react-select`        | `Select` (+ `MenuItem`)                              | Achtung: MUI-`Select` nutzt portaled Popper — `useThemeEffect` Hinweis zu `transform: scale` auf `#root` bleibt relevant (Popper landet bei `document.body`, also außerhalb des Scaling — ok, dasselbe Argument wie heute für Radix). |
| `react-separator`     | `Divider`                                            | 1:1.                                                                                                                                                                                                                                  |
| `react-slot`          | `slotProps` / `asChild`-Pattern via `component` Prop | Wo wir heute `<Slot>` nutzen, geht oft MUI's `component` / `slots`-API. Edge-Case: `OpenInIdeButton` `variant="icon"` Pattern.                                                                                                        |
| `react-switch`        | `Switch`                                             | 1:1.                                                                                                                                                                                                                                  |
| `react-tabs`          | `Tabs` + `Tab`                                       | 1:1.                                                                                                                                                                                                                                  |
| `react-tooltip`       | `Tooltip`                                            | 1:1.                                                                                                                                                                                                                                  |

**Reihenfolge:** Komponente-für-Komponente migrieren (Plan §B), Radix-Paket entfernen **erst wenn 0 Imports übrig** (CI-Check siehe §E.2).

### 0.6 Storybook & Tests-Strategie

- Storybook 10 läuft schon (`yarn workspace @recrest/app storybook`). Jede migrierte Component bekommt **mindestens eine** Story die alle visuellen Varianten zeigt (Light/Dark, Accent-Switch via Decorator, States: default/hover/active/disabled/loading).
- **Decorator** für Theme: `app/.storybook/preview.tsx` bekommt ein `withRecrestTheme` Decorator das Theme aus `globalTypes.mode`/`accent` liest, MUI-`ThemeProvider` setzt, und `CssBaseline` mountet. Verifiziert: heute existiert `.storybook/` (das `storybook` Script ist im `package.json` Zeile 23). Wenn der Pfad oder die Preview-Datei nicht existiert, in Phase A.4 anlegen.
- **Unit-Tests** für jede migrierte Component:
  - Snapshot-Test ist **nicht** Pflicht (zu brittle für MUI-Output).
  - Mindestens: rendert ohne Crash, kritische ARIA-Properties (`role`, `aria-label`, `aria-pressed`), Click/Keydown-Handler-Spy, Visible-State-Transitions (open/closed via `userEvent`).
- Bestehende Tests (`*.test.tsx` in `molecules/`) bleiben grün, werden ggf. an neue Component-Interna angepasst (selectors wechseln von Klassen-basiert zu `getByRole`).

### 0.7 Phasen-Reihenfolge & Risiko

Wir migrieren **bottom-up**: Atoms zuerst, dann Molecules, dann Organisms, zuletzt Pages.

Begründung: jede Atom-Migration ist <50 LOC Änderung, leicht zu reviewen, leicht zu reverten. Pages am Schluss profitieren von schon-migrierten Bausteinen. Hätten wir Pages zuerst migriert, wären die Diffs riesig und jede neue Page würde unmigrierte Atoms „mitschleppen".

**Per-Atom-Migration ist atomar:** EINE Atom-Migration = ein PR-würdiger Commit:

1. Atom umschreiben.
2. Story aktualisieren.
3. Unit-Test grün.
4. `yarn test:ts` grün.
5. Visuelle Stichprobe (Storybook + 1 Page die das Atom konsumiert).

Erst wenn diese fünf grün sind → nächstes Atom.

---

## Phase A — Foundation (vor jeder Component-Migration)

### A.1 MUI installieren, Theme erstellen, Provider mounten

- **Vorgehen:**
  1. `yarn workspace @recrest/app add @mui/material @mui/icons-material @emotion/react @emotion/styled`.
  2. `app/src/theme/createRecrestTheme.ts` anlegen (Code-Skelett siehe §0.2). Theme-Werte mappen 1:1 aus `tokens.scss`.
  3. `app/src/theme/cssVars.ts` anlegen — Funktion `applyCssVars(theme: Theme)` schreibt CSS-Variablen auf `:root`/`[data-theme="dark"]` (so wie `tokens.scss` heute). Wird in `useThemeEffect` aufgerufen, ersetzt nicht aber **ergänzt** das heutige `data-theme="dark"`-Setzen.
  4. `app/src/main.tsx` umbauen: `<ThemeProvider>` + `<CssBaseline enableColorScheme />` außen um `<App />`.
  5. `useThemeEffect` (oder `AppShell`) erzeugt das Theme per `useMemo([settings.theme, settings.accent, settings.font])` und liefert es an `ThemeProvider`.
- **Test:**
  - Smoke: App startet, kein Theme-Crash, `data-theme` weiterhin gesetzt.
  - `yarn workspace @recrest/app test:ts` grün.
  - Visuell: Dark-Mode-Toggle in Settings-Seite zeigt MUI-Default-Komponenten (z.B. testweise ein `<Button>` einbauen) im richtigen Modus.

### A.2 Test-Setup für MUI

- **Vorgehen:**
  1. `app/src/test-setup.ts` ergänzen — keine Aktion nötig wenn keine MUI-internen Globals fehlen (Vitest+jsdom reicht).
  2. Helper `app/src/test/withTheme.tsx`:

     ```tsx
     export function renderWithTheme(ui: React.ReactElement, opts?: { mode?: RecrestMode }) {
       const theme = createRecrestTheme({ mode: opts?.mode ?? "light", accent: "default" });
       return render(
         <ThemeProvider theme={theme}>
           <CssBaseline />
           {ui}
         </ThemeProvider>,
       );
     }
     ```

  3. Bestehende Component-Tests die `render()` direkt nutzen schrittweise auf `renderWithTheme` umstellen — Pflicht sobald die Component MUI-Hooks verwendet (`useTheme`, `useMediaQuery`, `styled`).

- **Test:**
  - Ein bestehender Test (`KpiTile.test.tsx`) mit `renderWithTheme` ersetzt, läuft weiter grün.

### A.3 Storybook-Setup für MUI

- **Vorgehen:**
  1. `app/.storybook/preview.tsx` (anlegen wenn nicht vorhanden):

     ```tsx
     import { CssBaseline, ThemeProvider } from "@mui/material";
     import type { Preview } from "@storybook/react-vite";

     import {
       type RecrestAccent,
       type RecrestMode,
       createRecrestTheme,
     } from "../src/theme/createRecrestTheme";

     const preview: Preview = {
       globalTypes: {
         mode: { defaultValue: "light", toolbar: { items: ["light", "dark"] } },
         accent: {
           defaultValue: "default",
           toolbar: { items: ["default", "blue", "green", "purple", "pink", "amber"] },
         },
       },
       decorators: [
         (Story, ctx) => {
           const theme = createRecrestTheme({
             mode: ctx.globals.mode as RecrestMode,
             accent: ctx.globals.accent as RecrestAccent,
           });
           return (
             <ThemeProvider theme={theme}>
               <CssBaseline enableColorScheme />
               <Story />
             </ThemeProvider>
           );
         },
       ],
     };
     export default preview;
     ```

  2. `yarn workspace @recrest/app storybook` starten und durchklicken: alle bestehenden Stories rendern noch (Light-Mode-Default identisch). Accent/Mode-Toolbar funktioniert.

- **Test:** Manuell — Storybook startet ohne Errors, Mode-Switcher in Toolbar wechselt Backgrounds sichtbar.

### A.4 CI-Guard: kein neuer Radix/Tailwind/SCSS für migrierte Bereiche

- **Vorgehen:**
  1. ESLint-Rule `no-restricted-imports` für `@radix-ui/*` mit `allow`-Liste (anfangs alle, schrumpft mit Phase B fortschreitend).
  2. ESLint-Rule oder `package.json`-Script `check:no-tw` welches `rg "className=\"[^\"]*\\b(ml-|mr-|p-|w-|h-|bg-|text-)"` läuft und in `--migrated` Pfaden fehlerhaft ist. (Soft: warnung; hart wird erst Ende Phase D.)
  3. Migrierte Atoms tragen `// @migrated:mui` als top-of-file-Marker; ein optionales Script `check:migration` listet migrierte vs. offene Components.
- **Test:** Lint läuft grün auf aktuellem Stand; das Script druckt sinnvolle Liste.

---

## Phase B — Atoms (bottom-up Migration)

Reihenfolge so gewählt dass jedes Atom nur Atoms konsumiert die schon migriert sind.

### B.1 `Button`

- **Heute:** `app/src/components/atoms/Button/index.tsx` (CVA-basiert), Stories vorhanden.
- **Ziel:** Dünner Wrapper über `<Button>` aus MUI. Props-Surface bleibt rückwärtskompatibel (`variant`, `size`, `tone`, `disabled`, `loading`, `children`, `startIcon`, `endIcon`).
- **Vorgehen:**
  1. Mapping definieren: `variant="primary"` → MUI `variant="contained"`; `variant="ghost"` → `variant="text"`; `variant="outline"` → `variant="outlined"`; `tone="destructive"` → `color="error"`; `size="sm"` → MUI `size="small"`.
  2. `loading` Prop: kein MUI-Default → wir nutzen `@mui/lab/LoadingButton` **nicht** (Lab-Dep vermeiden), stattdessen `<Button disabled startIcon={loading ? <CircularProgress size={14}/> : startIcon}>`.
  3. Story aktualisieren: alle Varianten × beide Themes.
  4. Tests: gibt heute `Button.stories.tsx` aber **kein** `Button.test.tsx` (verifiziert per `ls`). Anlegen — minimal: rendert, klick-handler, disabled-Verhalten.
- **Aufräumen:** kein `r-btn`-Klassen mehr verwenden in migrierter Code-Stelle. `.r-btn`-Block in `tokens.scss` bleibt **vorerst** wegen anderer Konsumenten — wird erst in Phase D entfernt.

### B.2 `Icon`, `BrandIcon`, `IdeIcon`, `LangDot`, `StatusDot`, `CiDot`

- **Heute:** Eigene SVG/Lucide-Wrapper. Stories vorhanden für `Icon`, `StatusDot`.
- **Ziel:**
  - `Icon`: bleibt eigener Wrapper (Mappt `name`-Strings auf Lucide/Simple-Icons). **Keine MUI-Icon-Migration** — wir wollen unsere Namen-Map behalten.
  - `BrandIcon`/`IdeIcon`: bleiben — sind Brand-spezifisch.
  - `LangDot`, `StatusDot`, `CiDot`: bleiben CSS-driven, aber `className`/inline-Color → `sx={{ bgcolor: …, color: … }}`.
- **Vorgehen:**
  1. `StatusDot`: `<Box sx={{ width:8, height:8, borderRadius:"50%", bgcolor: dotColor(kind), boxShadow: t =>`0 0 0 2px ${t.palette.background.paper}`}} />`.
  2. `LangDot` analog.
  3. `CiDot` analog mit zusätzlichem pulse-Keyframe via `sx={{ "@keyframes pulseDot": { ... }, animation: ... }}`.
- **Tests:** Story-Snapshot reicht; Unit-Test optional.

### B.3 `Badge`

- **Heute:** `.r-badge` mit Tone-Modifiern (`blue/green/amber/red/purple/accent/solid`).
- **Ziel:** MUI `<Chip>` mit `size="small"`. Tone-Mapping über `color` Prop + custom `sx`-Backgrounds aus Theme.
- **Vorgehen:**
  1. Wrapper `<Badge tone="green">…` rendert `<Chip size="small" sx={{ bgcolor: "success.light", color: "success.dark" }} label={…} />`.
  2. `solid`-Variante: `<Chip color="primary" />` oder `sx` mit `bgcolor: text.primary, color: background.paper`.
  3. Story aktualisieren.
- **Tests:** `Badge.test.tsx` neu, rendert pro Tone.

### B.4 `Switch`, `Checkbox`

- **Heute:** Radix-Wrapper in `atoms/Switch`, `atoms/Checkbox`.
- **Ziel:** MUI `<Switch>`, MUI `<Checkbox>`. Props-API identisch lassen (`checked`, `onCheckedChange` → intern auf `onChange` mappen).
- **Vorgehen:** 1:1 ersetzen. Radix-Dep bleibt installiert bis kein Import mehr existiert.
- **Tests:** existieren teilweise — anpassen.

### B.5 `Input`, `Label`

- **Heute:** Eigene Wrapper mit Radix-Label.
- **Ziel:** MUI `<TextField size="small" />` für Combo aus Label+Input, oder `<OutlinedInput>` für reines Input + `<FormLabel>`.
- **Vorgehen:**
  1. Settings-Felder (`SettingsField` Molecule) konsumieren `Input` heute → wandert in B.5.
  2. Search-Input in Header → migriert in C.x.
- **Tests:** `Input.test.tsx` neu falls fehlt.

### B.6 Restliche Atoms

`AheadBehind`, `BranchChip`, `DiffStat`, `Kbd`, `Mascot`, `Separator`, `Skeleton`, `Sparkline`, `Spinner`:

- **Separator:** Radix → MUI `<Divider>`.
- **Skeleton:** Radix-frei? `rg` checken → MUI `<Skeleton>` 1:1.
- **Spinner:** → MUI `<CircularProgress size={…} />`.
- **Rest:** bleiben mit eigener Logik, aber CSS-Klassen → `sx`.

**Bestehende Stories** updaten, **fehlende** Tests neu anlegen.

---

## Phase C — Molecules

Reihenfolge (jedes nutzt nur migrierte Atoms):

1. `IconButton` → MUI `<IconButton>` + `<Tooltip>`-Wrapper. (Hoch-frequent verwendet — früh migrieren.)
2. `AuthorAvatar`, `RepoAvatar` → MUI `<Avatar>` mit gradient/initials-fallback (heute custom). Avatar-`sx` Variants in Theme.
3. `Drawer` → MUI `<Drawer>` (right-anchored, `variant="temporary"`). Achtung: heutige `Drawer`-Component hat `size="lg"` Prop → mappt zu `PaperProps.sx.width`.
4. `ConfirmDialog` (compound) → MUI `<Dialog>` + `<DialogTitle>` + `<DialogContent>` + `<DialogActions>`. `useConfirm` Hook-API bleibt.
5. `DropdownMenu` (compound, heute Radix) → MUI `<Menu>` + `<MenuItem>` + `<Divider>`. **Sub-Menu-Inventur (§0.5):**
   - `rg "DropdownMenuSubTrigger|DropdownMenuSubContent|DropdownMenuSub\b" app/src` — wenn `0` Treffer: trivial. Wenn >0: Custom-Lösung mit `<Menu>`-in-`<Menu>` via `anchorEl`-Verschachtelung; Plan-Item separat ausarbeiten falls relevant.
6. `EmptyState` → reines Layout, `Box`/`Stack`-`sx`.
7. `SettingsField`, `SettingsSectionHeader` → MUI `Typography` + `Box` + neue `Input`-Variante.
8. `KpiCard`, `KpiTile`, `InfoCard`, `InfoHint` → MUI `<Card>` / `<Paper>` mit `sx`. Tests existieren — beibehalten.
9. `OpenInIdeButton` (`variant="icon" | "button"`) → nutzt migrierten `IconButton`/`Button`.
10. `Drawer` + `DetailSection` → Layout-Combo, weiter Container-Logik in `<Box>`-stack.
11. `Sonner` (Toast) → **bleibt** (`sonner` ist eine eigene Lib, MUI hat `<Snackbar>` aber sonner ist UX-überlegen). **Ausnahme: behalten.**
12. `skeletons/*` → MUI `<Skeleton>` Compositions.
13. `MrChip`, `BranchFilterChip` → MUI `<Chip>` mit custom-`sx`.
14. `ExternalLinkButton` → MUI `<Button>` mit `startIcon`/`endIcon`.

Pro Molecule:

- Migrate, Story aktualisieren, Test grün, Konsumenten unverändert lassen (wir halten Public-API stabil).

---

## Phase D — Organisms + Pages + Cleanup

### D.1 Organism-Migration

Reihenfolge bottom-up:

1. `organisms/layout/Header` — Top-Bar mit Scope-Toggle (heute `seg-group`) → MUI `<ToggleButtonGroup>`. Window-Chrome (`.chrome-mac/.chrome-win11/.chrome-gnome`) bleibt **unverändert** in SCSS (OS-spezifische Geometrie, niedriger ROI für MUI).
2. `organisms/layout/Sidebar` — Liste/NavItems → MUI `<List>` + `<ListItemButton>`. Achtung: nested-interactive-Regel weiter beachten.
3. `organisms/layout/DetailPane` + `DetailSection` (shared) → reine `<Box>`-Stacks mit `sx`.
4. `organisms/repos/RepoCard` (heute frosted-glass Action-Overlay, siehe Kontext-Summary) → MUI `<Card>` + `<Stack direction="row" sx={{ position: "absolute", top: 8, right: 8 }}>` mit `IconButton`s. Test: `data-testid="repo-card"` bleibt.
5. `organisms/repos/*` — Reposliste/Filter.
6. `organisms/mergeRequests/MergeRequestDetailPanel` (Drawer-Body) → MUI Layout.
7. `organisms/prs/*`.
8. `organisms/activity/Timeline` — Filter (`seg-group` → MUI `<ToggleButtonGroup>`); Cards bleiben in `CardShell` (eigene Komponente, migriert in B oder C je nach Tiefe).
9. `organisms/onboarding/OnboardingWizard` → MUI `<Stepper>` ist tempting, aber zuerst prüfen ob Wizard-UX dazu passt (sonst eigener Wrapper).
10. `organisms/settings/*` → MUI `<Tabs>` + `<TabPanel>`.
11. `organisms/search/*` (cmdk-basiert) — **bleibt** auf `cmdk`. MUI hat keinen vergleichbaren Command-Palette-Primitiv und cmdk ist UX-überlegen. **Ausnahme: behalten.**
12. `organisms/brand/*`, `organisms/feedback/*` — restlicher Polish.

### D.2 Page-Migration

`app/src/pages/*` (DashboardPage, ReposPage, MergeRequestsPage, BranchesPage, ChangesPage, ActivityPage, SettingsPage, RepoDetailPage):

- Pro Page einen Commit.
- Tailwind-Klassen restlos entfernen.
- SCSS-Klassen entfernen wo Container/Layout durch MUI ersetzt sind.
- Bestehende `data-testid`-Attribute **alle behalten** (E2E hängt davon ab).

### D.3 Cleanup (am Schluss)

1. `yarn workspace @recrest/app remove @radix-ui/react-alert-dialog @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-tooltip`.
2. `yarn workspace @recrest/app remove tailwindcss @tailwindcss/vite tw-animate-css tailwind-merge class-variance-authority`.
3. `app/vite.config.ts` — `@tailwindcss/vite` Plugin entfernen.
4. `app/src/styles/{layout,views,tokens,globals}.css|scss` schrittweise leeren, dann löschen. `page-anim.scss` bleibt. `tokens.scss` wird durch generierte `theme/cssVars.css` ersetzt.
5. `yarn workspace @recrest/app remove sass` falls keine `.scss`-Dateien mehr.
6. `rg "@radix-ui|tailwind|@trivago"` über `app/src` — `0` Treffer (außer in `package.json`-History).
7. ESLint-Rule `no-restricted-imports` für `@radix-ui/*` auf `error` setzen (sperrt Reintroduktion).
8. Imports-Sortierung (`@trivago/prettier-plugin-sort-imports`) bleibt — Tool ist styling-agnostisch.

---

## Phase F — Ordnerstruktur konsolidieren (verworfen)

**Status: verworfen.** Die heutige `components/{atoms,molecules,organisms}` + `pages/app/<Page>/components/`-Struktur reicht aus. Ein zusätzlicher `features/<x>/`-Layer wurde geprüft und als nicht-tragender Overhead eingestuft (Domain-Slices liegen weiterhin in `store/reducers/`, Domain-Hooks in `hooks/`, Domain-Libs in `lib/`). Sollte sich später ein konkreter Schmerz zeigen, wird das in einem eigenen Plan adressiert.

---

## Phase G — Magic Strings → Konstanten

Wird **vor oder parallel zu Phase B** durchgezogen. Begründung: jede Komponente die wir migrieren liest String-Literale (`role="button"`, `kind="dirty"`, `tone="destructive"`, `data-testid="repo-card"`, Event-Namen `repo://status`, …). Wenn wir die Komponente sowieso umschreiben, sollen die Literale gleich aus zentralen Konstanten kommen, nicht inline.

### G.1 Bestehende Konstanten-Quellen

- `shared/src/constants/commands.ts` — `TauriCommand` (Frontend ↔ Backend IPC-Namen, **vollständig**). Gold-Standard.
- `shared/src/constants/` — laut `ls` weitere Dateien; vor G.3 inventarisieren ob dort schon EventNames, ErrorKinds etc. liegen.
- Kein zentrales Modul für: Event-Namen (`repo://status`), `data-testid`-Strings, Storage-Keys (`recrest:ui`), Theme-Modi (`"light"`/`"dark"`), Tone-Strings (`"destructive"`/`"ghost"`), Provider-Slugs (`"github"`/`"gitlab"`/`"bitbucket"`), CI-States (`"success"`/`"failure"`/`"pending"`/`"running"`), MR-States (`"open"`/`"draft"`/`"merged"`/`"closed"`), Storage-Namespaces, LocalStorage-Keys, Filter-Kinds in Activity Timeline (`"all"`/`"commits"`/`"prs"`/`"checks"`).

### G.2 Inventur-Schritt (vor irgendeiner Code-Änderung)

```bash
# 1) Event-Namen (Frontend listen + Backend emit)
rg -n '"[a-z]+://[a-z-]+"' app/src app/src-tauri/src --type-add 'rust:*.rs' -tts -tts

# 2) data-testid String-Literale
rg -n 'data-testid="[^"]+"' app/src

# 3) Storage Keys
rg -n '"recrest:[a-z-]+"|localStorage\.(getItem|setItem)\(' app/src

# 4) Tone/Variant Strings (heuristik)
rg -n '\btone="(destructive|ghost|primary|outline)"|\bvariant="(primary|ghost|outline|destructive)"' app/src

# 5) Provider/Brand Slugs
rg -n '"(github|gitlab|bitbucket)"' app/src

# 6) MR / CI States (Backend-API-Surface; muss mit shared/ deckungsgleich bleiben)
rg -n '"(open|draft|merged|closed)"' app/src
rg -n '"(success|failure|pending|running)"' app/src
```

Output der Inventur in `docs/plans/04-magic-strings-inventory.md` ablegen (Working-Doc, am Ende von Phase G löschbar).

### G.3 Ziel-Konstanten-Module

Neue Dateien in `shared/src/constants/` (Frontend + Backend teilen via `@recrest/shared`):

- `events.ts` — `TauriEvent = { RepoStatus: "repo://status", ActivityCommitsChunk: "activity://commits-chunk", ... } as const`.
- `providers.ts` — `ProviderSlug = { GitHub: "github", GitLab: "gitlab", Bitbucket: "bitbucket" } as const`. Plus `type ProviderSlugName = …`.
- `prStates.ts` — `PrState = { Open: "open", Draft: "draft", Merged: "merged", Closed: "closed" } as const`.
- `ciStates.ts` — `CiState = { Success: "success", Failure: "failure", Pending: "pending", Running: "running" } as const`.
- `storage.ts` — LocalStorage-Keys. `StorageKey = { Ui: "recrest:ui" } as const`.

In `app/src/` (nicht shared — Frontend-only):

- `app/src/lib/testIds.ts` — `TestId = { RepoCard: "repo-card", RepoCardName: "repo-card-name", MrRow: "mr-row", MrDrawer: "mr-drawer", MergeRequestsPage: "merge-requests-page", ... } as const`. Jedes neue `data-testid` darf nur aus diesem Modul kommen.
- `app/src/theme/types.ts` — `ThemeMode = { Light: "light", Dark: "dark" } as const` (heute Strings in `settings.theme`).
- `app/src/components/atoms/Button/variants.ts` — `ButtonVariant` / `ButtonTone` als `as const`-Maps (wird im Zuge B.1 sowieso angefasst).

**Konvention:** **`as const`-Objekte** statt TypeScript-`enum`s. Begründung: TypeScript-Enums generieren JS-Boilerplate, brechen `import type`-Tree-Shaking, und String-Enum-Werte sind nicht inline-friendly. `as const` + `type X = (typeof X)[keyof typeof X]` gibt identische Typ-Sicherheit ohne Runtime-Cost.

### G.4 Migrationsweg

1. **Inventur (G.2) → Doc.**
2. **Konstanten-Module anlegen (G.3).** Keine Code-Änderungen an Konsumenten in diesem Commit — nur neue Dateien + `index.ts`-Re-Exports in `shared/`.
3. **Konsumenten umstellen, pro Konzept ein Commit:**
   - Commit „events": alle `listen("repo://status", …)` und Backend-`emit("repo://status", …)` auf Konstante. Frontend nutzt `TauriEvent.RepoStatus`, Backend (Rust) bekommt **ein parallel-modul** in `src-tauri/src/constants.rs` (Rust kann nicht direkt aus `@recrest/shared` lesen; aber ein `build.rs`-Script könnte JSON aus shared lesen — **optional** als Stretch-Goal; default: zwei Quellen mit Sync-Doc).
   - Commit „testIds": alle `data-testid="…"` über `TestId.X`.
   - Commit „pr/ci states": Type-Annotations + alle `=== "open"`/`"merged"` etc.
   - Commit „provider slugs": `BrandIcon slug="github"` etc.
   - Commit „storage keys": `localStorage.setItem("recrest:ui", …)`.
   - Commit „tones/variants": Button/Badge.
4. **Lint-Rule** (am Ende): `no-restricted-syntax` ESLint-Regel, die String-Literale aus den geschützten Domänen verbietet (z.B. `Literal[value=/repo:\/\//]` als Selector blockiert). Erst aktivieren wenn 0 Treffer übrig sind.

### G.5 Edge-Cases

- **i18n-Keys (`t("mrs.drawer.open_on_host")`) sind KEINE Magic-Strings im Sinn dieser Phase.** Sie sind durch i18next-Type-Generation (wenn aktiviert) typisiert; pro-Key Konstanten lohnen sich nicht. Optional am Schluss: `i18next-typescript` aktivieren — separater Plan-Item, nicht Phase G.
- **CSS-Selector-Strings** (`.repo-card`, `.seg-btn`, …) sind in Phase D **eliminiert** durch MUI-`sx`. Nicht zusätzlich als Konstanten extrahieren.
- **Tauri-Command-Namen** sind schon konstanten-gestützt (`TauriCommand` in `@recrest/shared/constants/commands.ts`). Nur dafür sorgen dass kein neuer Roher-String dazukommt — ESLint-Regel siehe G.4.4.
- **Rust-Seite:** Wenn das `build.rs`-Sync-Script (G.4.3) nicht gewünscht ist, **zwingend** in `shared/src/constants/events.ts` Top-of-File einen Kommentar: „Backend mirror lebt in `src-tauri/src/constants.rs` — bei Änderungen beide Seiten anfassen". Sync-Drift ist sonst der wahrscheinlichste Bug-Quell.

### G.6 Gates Phase G

- `rg '"repo://[a-z-]+"' app/src` → `0` Treffer (außer in `constants/events.ts`).
- `rg 'data-testid="' app/src` → `0` Treffer (außer in `lib/testIds.ts`).
- `rg '"recrest:[a-z-]+"' app/src` → `0` Treffer (außer in `constants/storage.ts`).
- Tests grün, Lint grün, ESLint `no-restricted-syntax` aktiviert ohne Errors.

---

## Phase E — Quality Gates

### E.1 Visuelle Parität

- **Snapshot-Set:** Vor Phase A einen Playwright-Snapshot-Lauf über jede Page in Light+Dark machen, Bilder in `.screenshots/baseline/` parken (gitignored, lokal halten).
- Nach jeder Phase erneut snapshotten, diffen, **bewusste** visuelle Änderungen dokumentieren.
- Regel: **Funktionale UX (Hit-Targets, Keyboard, ARIA)** darf nicht regressieren. **Visuelles Polish** darf sich verbessern.

### E.2 CI-Gates

- `yarn test:ts` grün auf jedem Commit.
- `yarn test` grün auf jedem Commit (Unit + Component).
- `yarn test:e2e` grün am Ende jeder Phase (D ist riskant — pro Page-Commit lokal laufen lassen).
- `yarn lint` grün; ESLint-Migrations-Rules siehe §A.4 + §D.3.7.
- **Bundle-Size-Check:** vor Phase A messen (`yarn workspace @recrest/app build && du -sh app/dist`), nach Phase D erneut. **Akzeptanzschwelle:** +30% Bundle Size ist OK (MUI ist groß; Tree-Shaking durch `@mui/material` per-component imports). >50% → Investigation (sind alle Imports wirklich tree-shaken? `@mui/icons-material` Star-Imports sind ein bekannter Fallstrick).

### E.3 Storybook-Gate

- Jede migrierte Component hat ≥1 Story.
- `yarn build-storybook` grün — Vorhandenes Script; Output unter `app/storybook-static/`. Wird **nicht** deployed (Plan-Hinweis falls je gewünscht).

---

## Risiken & Trade-offs

- **Bundle Size:** MUI v7 ist ~80–120 kB gzipped (ohne Icons). Heutiger Stack: Radix-Komponenten ~30 kB + Tailwind-Runtime ~10 kB + eigene CSS minimal. Erwarteter Netto-Zuwachs: +50–80 kB gzipped. Für eine Tauri-Desktop-App **unkritisch** (kein Cold-Network-Load), aber im Auge behalten weil `dev:web`-Modus durchaus per Browser geöffnet wird (Onboarding-Demos).
- **Theme-Plumbing-Aufwand:** Token-Mapping in `createRecrestTheme` ist die einzige nicht-mechanische Arbeit. ~1 Tag.
- **Page-Layout-Drift:** Beim Übergang von SCSS-Layout-Klassen (`.a-mr`, `.a-detail`, `.repo-card`, …) auf MUI-Stacks kann Spacing/Alignment minimal driften. Phase E.1 fängt das.
- **`transform: scale(#root)` + MUI-Portale:** Heutiger Kommentar in `tokens.scss` (Zeile 158–183) erklärt warum `transform: scale` statt `zoom`. Gilt für MUI gleichermaßen — Popper/Menu/Dialog portalen zu `document.body`, also außerhalb des Scaling. Keine Migration nötig.
- **Joy UI?** Explizit verworfen — eingefroren, kein Update-Pfad. Notiz in Plan, damit Future-Claude nicht versucht zu wechseln.
- **Radix-Sub-Menus** wenn `>0` (siehe §C.5): wenn die Inventur Sub-Menus zeigt, ist die MUI-Migration für `DropdownMenu` deutlich aufwändiger. Plan dann splitten in „flat menus" zuerst, „nested menus" als eigener Item.

---

## Reihenfolge zusammenfassend

1. **Phase 0** — Pakete fix, Verbote fix, Storybook-Decorator-Skelett.
2. **Phase A** — Theme + Provider + Test/Storybook-Helper. App rendert mit MUI-Provider, nichts visuell geändert.
3. **Phase G** — Magic-Strings-Inventur (G.2) + Konstanten-Module anlegen (G.3). Konsumenten-Umstellung läuft **gemischt mit B/C/D** — wenn wir eine Component sowieso anfassen, ziehen wir ihre Strings gleich auf Konstanten.
4. **Phase B** — Atoms (`Button` → `Icon`-Wrapper → `Badge` → `Switch`/`Checkbox` → `Input`/`Label` → Rest).
5. **Phase C** — Molecules (`IconButton` → `Avatar` → `Drawer` → `ConfirmDialog` → `DropdownMenu` → Rest).
6. **Phase D** — Organisms + Pages + Cleanup (Radix/Tailwind/SCSS raus).
7. **Phase E** — Quality-Gates kontinuierlich; finale Bundle-/Snapshot-/E2E-Verifikation.

**Verzahnung B↔G konkret:** Pro Atom/Molecule/Organism EIN Commit, der beides macht:

- Component auf MUI umstellen (B/C/D).
- Inline-Strings auf Konstanten ziehen (G).

So wird jede Datei nur einmal statt zweimal angefasst.

Jeder Phase-Schritt **commit-fähig grün**: `test:ts`, `test`, Lint, Storybook bauen, visuelle Stichprobe. So bleibt der Rollback-Pfad an jedem Punkt klein.
