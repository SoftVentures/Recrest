# Plan 05 — Separate UI / Code fonts, ligatures, custom font upload

## Goal

1. **Separate UI font and code font.** Today one setting (`font: FontId`) drives the
   whole UI. Introduce a second setting `codeFont: FontId` applied only to code /
   monospace surfaces. UI font picker keeps **all** fonts (sans + mono); a new
   **Code font** picker (mono ids) drives `codeFont`.
2. **Code ligatures.** Code surfaces render with `font-feature-settings: "liga" 1,
"calt" 1` so `=>`, `!=`, `>=`, `->`, `===` etc. ligate. JetBrains Mono + Fira
   Code (both already bundled via `@fontsource`) support this.
3. **Custom TTF upload.** User can upload a `.ttf/.otf/.woff2`; it is stored, an
   `@font-face` is registered at runtime, and it becomes selectable in **both** the
   UI and Code pickers.

Decisions (confirmed with user):

- Custom font usable for **UI + Code**.
- UI font picker keeps **all** fonts; Code picker is **added** alongside.
- `codeFont` default: `jetbrains-mono`. Ligatures: **always on** for code surfaces.

## Existing infrastructure (reuse, don't rebuild)

- `shared/src/constants/ui.ts` — `FONTS`, `SANS_FONT_IDS`, `MONO_FONT_IDS`,
  `FONT_LABELS`, `DEFAULT_FONT`.
- `shared/src/types/settings.ts` — `AppSettings.font: FontId`.
- `app/src/theme/index.ts::fontFamilyForId` + `lib/utils/appearance.utils.ts::fontCssFamily`
  — both map FontId → CSS family (duplicated; keep both in sync).
- `app/src/main.tsx` — all fonts bundled (`@fontsource/*`), incl. jetbrains-mono + fira-code.
- Settings font picker: `pages/app/Settings/components/GeneralTab/sections/AppearanceSection`.
- Rust settings: `config/settings.rs` (struct) + `commands/settings.rs` (get/update).

## Phase 1 — Separate code font + ligatures

### Shared

- `ui.ts`: add `DEFAULT_CODE_FONT: FontId = "jetbrains-mono"`.
- `types/settings.ts`: add `codeFont: FontId` to `AppSettings`.

### Rust (`config/settings.rs`)

- Add `code_font: String` (serde camelCase → `codeFont`) with `#[serde(default = "default_code_font")]`
  returning `"jetbrains-mono"`, mirroring how `font` is defined/migrated so existing
  `settings.json` files keep loading.

### Frontend — apply the code font as a CSS variable

- New `--recrest-font-mono` custom property set on `:root`/`<html>` from
  `fontFamilyForId(codeFont)` (wherever the UI font is applied — `ThemeWrapper`).
- Central mono style helper (new, in `appearance.utils.ts`):

  ```ts
  export const MONO_STACK =
    "var(--recrest-font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)";
  export const monoFont = {
    fontFamily: MONO_STACK,
    fontFeatureSettings: '"liga" 1, "calt" 1',
  } as const;
  ```

- **Sweep**: replace the ~30 hardcoded `fontFamily: 'ui-monospace, …'` occurrences with
  `...monoFont` (or `fontFamily: MONO_STACK`). Files (from grep on `ui-monospace`):
  MarkdownView, RichTextEditor, DiffView, GitConfigStyles, MergeMrModal, LeaderboardCard,
  ConnectProviderStep, PickFolderStep, OverallSearch, ChangedFilesList, CiCard,
  CommitDialog, FindAcrossReposDialog/SearchResultRow, RepoSshSettings, WorkingCopyPanel,
  SshKeyField, SshKeyGuideModal, BranchRowItem, RepoGroup, Changes, MrDetailPanel,
  MrDetailHeader, TargetBranchPopover, RepoDetail, DetailPane, RepoCard, RepoRow,
  AboutTab (+ LinkItem). `appearance.utils.fontCssFamily` stays the source for the var.

### Settings UI (`AppearanceSection`)

- Add a **Code font** select bound to `codeFont` (options = `MONO_FONT_IDS` + custom).
- UI font select unchanged (all fonts).

## Phase 2 — Custom TTF upload

### Rust (`commands/fonts.rs`, new)

- `upload_font(name, bytes) -> CustomFont` — validate extension (ttf/otf/woff2) + size cap,
  write to `<app_data>/fonts/<sanitized>.<ext>`, return `{ id, family, fileName }`.
- `list_custom_fonts() -> Vec<CustomFont>`; `delete_custom_font(id)`.
- Register in both `generate_handler!` blocks; mirror DTO in shared.

### Frontend

- Upload via the dialog plugin (file picker) → read bytes → `upload_font`.
- Register `@font-face` at runtime: read the stored file (asset protocol / base64) and
  inject a `<style>` / `FontFace` so the family is usable.
- Custom fonts appended to BOTH pickers (`font` and `codeFont`); a `FontId` becomes
  `FontId | string` (custom family name) — widen settings type to `string` and validate.
- `delete` affordance per custom font in Settings.

### Web (dev:web) fallback

- No FS: custom upload is Tauri-only; the picker hides the upload button (or no-ops)
  outside Tauri. Bundled fonts still work everywhere.

## Status

**Phase 1 — done.** Separate `codeFont` setting, `--recrest-font-mono` CSS var,
central `MONO_STACK`/`monoFont` helper, and the full sweep of every incidental
`ui-monospace` literal → `MONO_STACK` (only the canonical resolvers in
`theme/index.ts` + `appearance.utils.ts` and the palette story keep an explicit
stack).

**Phase 3 — done (ligatures as a separate control).** Ligatures are no longer
"always on" — a third setting `codeLigatures: LigatureMode` (`off` | `standard`
| `stylistic`) drives a dedicated **Code ligatures** picker next to the code
font. `off` → `"liga" 0, "calt" 0, "dlig" 0`; `standard` → `"liga" 1, "calt"
1`; `stylistic` → adds `ss01`–`ss20`. Resolved into the `--recrest-code-ligatures`
CSS var in `ThemeWrapper` and consumed via `monoFont` / the `CODE_LIGATURES`
constant. Real code surfaces (diff, markdown code, CI logs, snippets, commit,
merge, MR header, changed files) set `font-feature-settings: CODE_LIGATURES`
explicitly because the inherited `body` value tunes the UI font. Rust
`code_ligatures` field migrates older settings via `#[serde(default)]`.

**Phase 2 — done.** `commands/fonts.rs` (`list_custom_fonts` / `upload_font` /
`delete_custom_font`, file-backed under `<app_data>/fonts/`, bytes inlined
Base64), registered in both `generate_handler!` blocks. Shared `CustomFont`
DTO + `FontSelection` (`FontId | custom:<family>`) + `CUSTOM_FONT_PREFIX`.
`useCustomFonts` loads on boot and reconciles runtime `FontFace`s; both
resolvers handle `custom:` with sans/mono fallback. Settings: native font
picker (`pickFontFile`) + a `CustomFontRow` (upload + per-font delete chips);
custom fonts appear in a "Custom" optgroup in **both** the UI and Code pickers.
Web/dev:web + Playwright stubs return an empty list (upload is Tauri-only).

## Verification

- `cargo check` / settings round-trip test (old json without `codeFont` loads).
- `yarn test:ts`, `yarn lint`, targeted vitest (AppearanceSection, theme).
- Live (:3000): code surfaces show ligatures; switching Code font re-renders snippets/diff;
  UI font unchanged. Phase 2: upload a ttf, see it apply.
