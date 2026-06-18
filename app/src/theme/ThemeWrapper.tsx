import { type PropsWithChildren, useEffect, useMemo } from "react";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";

import { type FontSizeId, TauriCommand } from "@recrest/shared";

import { useGlassySupport } from "@/hooks/useGlassySupport";
import { THEME_NO_TRANSITIONS_CLASS, ThemeId } from "@/lib/constants/theme.constants";
import { safeInvoke } from "@/lib/tauri";
import { codeLigatureFeatureSettings, fontCssFamily } from "@/lib/utils/appearance.utils";
import { syncSystemTheme } from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getTheme } from "@/theme";

/**
 * Interface-size multiplier — values mirrored from src-old's tokens.scss so
 * existing layouts that were tuned at md (1×) keep their proportions at the
 * other steps. The four stops cover ~30% total range, enough to feel like a
 * meaningful change without forcing every layout decision to be fluid.
 *
 * Applied via CSS `zoom` on `#root` (not `<body>`/`<html>`) plus inline
 * `width: 100vw / scale` and `height: 100vh / scale` — see globals.css.
 * `zoom` re-rasterises text at the scaled pixel grid so the result stays
 * crisp at lg/xl; `transform: scale()` would blur sub-pixel hinting.
 */
function scaleForSize(id: FontSizeId): number {
  switch (id) {
    case "sm":
      return 0.94;
    case "md":
      return 1;
    case "lg":
      return 1.12;
    case "xl":
      return 1.25;
  }
}

/**
 * Reads the user's theme preferences from the Redux `settings` slice and
 * builds the MUI theme on the fly. Wraps children in `MuiThemeProvider` +
 * `CssBaseline` so every consumer below has the active palette + a reset
 * baseline applied.
 *
 * Also mirrors `font` / `fontSize` to root-level CSS — that way every
 * `styled()` rule that inherits `font-family` from the parent (and there
 * are many: every `BranchChip`, `Kbd`, native `<input>`, lucide-react
 * SVGs that use `font-family: inherit`) picks up the new face without
 * having to re-thread the value through every component tree.
 */
export function ThemeWrapper({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const themeId = useAppSelector((s) => s.settings.themeId);
  const followsSystem = useAppSelector((s) => s.settings.followsSystem);
  const primaryColor = useAppSelector((s) => s.settings.primaryColor);
  const dyslexiaFont = useAppSelector((s) => s.settings.dyslexiaFont);
  const font = useAppSelector((s) => s.settings.font);
  const codeFont = useAppSelector((s) => s.settings.codeFont);
  const codeLigatures = useAppSelector((s) => s.settings.codeLigatures);
  const fontSize = useAppSelector((s) => s.settings.fontSize);
  const highContrast = useAppSelector((s) => s.settings.highContrast);
  const reducedMotion = useAppSelector((s) => s.settings.reducedMotion);
  const underlineLinks = useAppSelector((s) => s.settings.underlineLinks);

  // "Follow system" mode: subscribe to the OS appearance media query and
  // mirror its current value into the store via `syncSystemTheme` (which
  // updates themeId without flipping followsSystem off — that's the whole
  // point of the dedicated action).
  //
  // We ALSO ask the Rust side once at mount via `GET_SYSTEM_DARK_MODE`:
  // WKWebView on macOS has a documented quirk where the webview's effective
  // appearance lags the system appearance for the first JS tick(s) after
  // launch, so `matchMedia("(prefers-color-scheme: dark)")` returns `false`
  // on cold start even when the OS is in dark mode. The OS-level read goes
  // through NSApp.effectiveAppearance (macOS) / registry (Windows), which
  // is always authoritative, and overrides the matchMedia value when they
  // disagree. Linux returns `null` from the command — matchMedia wins there.
  useEffect(() => {
    if (!followsSystem) return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      dispatch(syncSystemTheme(mq.matches ? "dark" : "light"));
    };
    apply(); // re-assert at mount; handles stale themeId after OS change.

    let cancelled = false;
    let raf1: number | null = null;
    let raf2: number | null = null;
    void safeInvoke<boolean | null>(TauriCommand.GET_SYSTEM_DARK_MODE).then((osDark) => {
      if (cancelled || osDark === null || osDark === undefined) return;
      if (osDark !== mq.matches) {
        // Suppress transitions across the one-frame surface flip so the
        // anti-flash inline script's painted value cross-fades cleanly into
        // the OS-truth value (avoids a visible coloured frame on cold boot).
        const root = document.documentElement;
        root.classList.add(THEME_NO_TRANSITIONS_CLASS);
        dispatch(syncSystemTheme(osDark ? "dark" : "light"));
        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => {
            if (!cancelled) root.classList.remove(THEME_NO_TRANSITIONS_CLASS);
          });
        });
      }
    });

    mq.addEventListener("change", apply);
    return () => {
      cancelled = true;
      if (raf1 !== null) cancelAnimationFrame(raf1);
      if (raf2 !== null) cancelAnimationFrame(raf2);
      mq.removeEventListener("change", apply);
    };
  }, [followsSystem, dispatch]);

  // When the persisted theme is `glassy` but the host can't render vibrancy
  // (Linux without compositor support, or when the backend probe reports
  // false), the effective render falls back to plain `dark` so surfaces still
  // paint sensibly. We never mutate the stored `themeId` — only the value
  // that feeds `getTheme` — so re-launching on a supported host restores the
  // user's actual preference without any extra plumbing.
  const supportsGlassy = useGlassySupport();
  const effectiveThemeId = themeId === ThemeId.GLASSY && !supportsGlassy ? ThemeId.DARK : themeId;

  const theme = useMemo(
    () => getTheme(effectiveThemeId, { primaryColor, dyslexiaFont, font, fontSize }),
    [effectiveThemeId, primaryColor, dyslexiaFont, font, fontSize],
  );

  // Root-element side effects so non-MUI children (native inputs, our own
  // styled() rules that read `font-family: inherit`, the Kbd hint chip in
  // the header, etc.) cascade with the picked font too.
  useEffect(() => {
    const root = document.documentElement;
    // Reconcile the anti-flash inline-style background (set once at boot by
    // index.html before any module loads). Without this, switching to the
    // Glassy theme at runtime leaves <html> painted in the boot theme's solid
    // color, which sits ABOVE the NSVisualEffectView and hides the desktop
    // vibrancy entirely. For opaque themes we still want a solid backstop
    // (matches `palette.background.default`) so a brief reload doesn't flash
    // through the window.
    root.style.backgroundColor =
      effectiveThemeId === ThemeId.GLASSY
        ? "transparent"
        : (theme.palette.background.default as string);
    root.style.setProperty("--app-font-family", theme.typography.fontFamily ?? "");
    root.style.setProperty("--app-font-size", `${theme.typography.fontSize}px`);
    // Code-surface font (snippets, diffs, …) — consumed via `MONO_STACK` /
    // `monoFont` so every monospace component follows the user's code font.
    root.style.setProperty("--recrest-font-mono", fontCssFamily(codeFont, "mono"));
    // Code-ligature features (consumed via `monoFont` / `CODE_LIGATURES`).
    root.style.setProperty("--recrest-code-ligatures", codeLigatureFeatureSettings(codeLigatures));
    root.dataset.font = font;
    root.dataset.codeFont = codeFont;
    root.dataset.codeLigatures = codeLigatures;
    root.dataset.fontSize = fontSize;
    // Accessibility — `globals.css` keys CSS rules off these attributes so
    // every component (MUI, native, third-party) picks them up at once.
    root.dataset.highContrast = highContrast ? "true" : "false";
    root.dataset.reducedMotion = reducedMotion ? "true" : "false";
    root.dataset.underlineLinks = underlineLinks ? "true" : "false";
    // Also drive a body-level font-family so children that don't read from
    // MUI's theme (raw <input>, <select>, lucide icons) still match.
    document.body.style.fontFamily = theme.typography.fontFamily ?? "";
    document.body.style.fontSize = `${theme.typography.fontSize}px`;
    // Interface-size scaling — CSS `zoom` scales every descendant uniformly
    // (font-size, padding, border-width, fixed-px widths in styled() rules,
    // SVG icons) without us having to convert every magic number to `em`.
    //
    // CSS `zoom` does NOT change the layout box of the element it's applied
    // to in the parent's frame: `<body>` would visually grow past the
    // viewport. We work around this by scaling `#root` and reverse-sizing
    // its box (`100/scale%`) so its rendered footprint stays at viewport
    // dimensions. `globals.css` clamps `html/body/#root` to the viewport so
    // the document never gets browser-level scrollbars regardless of which
    // intermediate length wins.
    // Interface-size scaling — write the multiplier into a CSS custom
    // property on `<html>`. `globals.css` consumes it via:
    //   #root { zoom: var(--ui-scale); width: calc(100vw / var(--ui-scale)); ... }
    // so the visible rendered size always equals the real viewport while
    // every descendant length (font-size, padding, border, fixed-px width
    // in styled() rules, SVG icons) scales uniformly. Approach mirrored
    // from src-old's tokens.scss where it was battle-tested across all 4
    // size steps without breaking the outer viewport-lock.
    root.style.setProperty("--ui-scale", String(scaleForSize(fontSize)));
  }, [
    theme.palette.background.default,
    theme.typography.fontFamily,
    theme.typography.fontSize,
    effectiveThemeId,
    font,
    codeFont,
    codeLigatures,
    fontSize,
    highContrast,
    reducedMotion,
    underlineLinks,
  ]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </MuiThemeProvider>
  );
}
