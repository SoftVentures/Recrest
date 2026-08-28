import { type PropsWithChildren, useEffect, useMemo } from "react";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";

import { StorageKey, TauriCommand } from "@recrest/shared";

import { Platform, usePlatform } from "@/hooks/usePlatform";
import {
  THEME_MODE_QUERY,
  THEME_NO_TRANSITIONS_CLASS,
  ThemeId,
} from "@/lib/constants/theme.constants";
import { safeInvoke } from "@/lib/tauri";
import { codeLigatureFeatureSettings, fontCssFamily } from "@/lib/utils/appearance.utils";
import { syncSystemTheme } from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getTheme } from "@/theme";
import {
  CSS_VAR_TEXT_SCALE,
  CSS_VAR_UI_SCALE,
  baseFontSizeForId,
  clampUiScale,
  pxToRem,
  textScaleForFontSize,
} from "@/theme/scale";

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
  const uiScale = useAppSelector((s) => s.settings.uiScale);
  const highContrast = useAppSelector((s) => s.settings.highContrast);
  const reducedMotion = useAppSelector((s) => s.settings.reducedMotion);
  const underlineLinks = useAppSelector((s) => s.settings.underlineLinks);
  const translucencyEnabled = useAppSelector((s) => s.settings.translucency.enabled);
  const translucencyIntensity = useAppSelector((s) => s.settings.translucency.intensity);
  const isWindows = usePlatform() === Platform.WINDOWS;

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
    const mq = window.matchMedia(THEME_MODE_QUERY);
    let cancelled = false;
    let raf1: number | null = null;
    let raf2: number | null = null;

    // Validate any candidate dark-mode value against Rust's authoritative
    // `NSApp.effectiveAppearance` read before dispatching. WKWebView's
    // matchMedia for `prefers-color-scheme` is known to fire spurious "change"
    // events with the wrong value during focus regain (the WebView's effective
    // appearance briefly disagrees with the system on the wake-up frame). A
    // raw dispatch from the matchMedia listener would flip themeId to DARK
    // for one render — that, in turn, flips `--translucency-bg` to the dark
    // rgba (~11,13,18) and the user sees a near-black flicker on the glass
    // layer before matchMedia settles and we flip back. Routing every
    // candidate through Rust eliminates the bad frame.
    const dispatchOsTruth = async (candidate: boolean) => {
      const osDark = await safeInvoke<boolean | null>(TauriCommand.GET_SYSTEM_DARK_MODE);
      if (cancelled) return;
      const truth = osDark === null || osDark === undefined ? candidate : osDark;
      dispatch(syncSystemTheme(truth ? ThemeId.DARK : ThemeId.LIGHT));
    };

    // Initial reconcile at mount — handles stale themeId after OS change.
    // Suppress transitions for one frame so the anti-flash inline script's
    // painted value cross-fades cleanly into the OS-truth value.
    void safeInvoke<boolean | null>(TauriCommand.GET_SYSTEM_DARK_MODE).then((osDark) => {
      if (cancelled) return;
      const truth = osDark === null || osDark === undefined ? mq.matches : osDark;
      if (truth !== mq.matches) {
        const root = document.documentElement;
        root.classList.add(THEME_NO_TRANSITIONS_CLASS);
        dispatch(syncSystemTheme(truth ? ThemeId.DARK : ThemeId.LIGHT));
        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => {
            if (!cancelled) root.classList.remove(THEME_NO_TRANSITIONS_CLASS);
          });
        });
      } else {
        dispatch(syncSystemTheme(truth ? ThemeId.DARK : ThemeId.LIGHT));
      }
    });

    const onChange = () => {
      void dispatchOsTruth(mq.matches);
    };
    mq.addEventListener("change", onChange);
    return () => {
      cancelled = true;
      if (raf1 !== null) cancelAnimationFrame(raf1);
      if (raf2 !== null) cancelAnimationFrame(raf2);
      mq.removeEventListener("change", onChange);
    };
  }, [followsSystem, dispatch]);

  const theme = useMemo(
    () =>
      getTheme(themeId, {
        primaryColor,
        dyslexiaFont,
        font,
        fontSize,
        uiScale,
        translucent: translucencyEnabled,
      }),
    [themeId, primaryColor, dyslexiaFont, font, fontSize, uiScale, translucencyEnabled],
  );

  // Single root-element side-effect. Combining background + font + a11y +
  // translucency into one effect prevents the dark→transparent→dark race
  // that happened when independent effects raced to write `<html>.style`:
  // the translucency effect would set `background-color: transparent`, the
  // theme effect would immediately overwrite it with the opaque value, and
  // the next paint flipped back when the translucency effect re-ran.
  useEffect(() => {
    const root = document.documentElement;

    // Background: translucency wins over theme. When translucent, `<html>`
    // must stay transparent so the OS vibrancy layer composites through;
    // when opaque, paint the theme's solid backdrop so a brief reload
    // doesn't flash through the window. The anti-flash inline script
    // already painted the right initial value — this effect just keeps it
    // in sync as the user toggles settings at runtime.
    // The blur is an OS compositor material (NSVisualEffectView on macOS,
    // Acrylic on Windows — see `commands::theme`). CSS only paints the tint: a
    // `position: fixed` `::before` pseudo-element on <html> carrying the rgba
    // wash, on its own compositor layer so it doesn't repaint on scroll.
    //
    // Layering:
    //   <html>::before  position: fixed; inset: 0; z-index: -1;
    //                   background-color: var(--translucency-bg);
    //   <html>          transparent (anti-flash + Tauri window) → OS blur shows
    //   <body>          transparent (so ::before shows through)
    //   <#root>         transparent
    //   <AppFrame, MainSlot> palette.background.default → transparent
    //
    // Intensity slider drives the tint alpha (the OS blur radius is fixed, so
    // there is no blur slider on either platform):
    //   intensity 0   → alpha 1.0 → solid theme tint, no see-through.
    //   intensity 100 → alpha 0   → no tint, blurred wallpaper shows raw.
    const transparentBg = translucencyEnabled;
    root.style.backgroundColor = transparentBg
      ? "transparent"
      : (theme.palette.background.default as string);
    if (transparentBg) {
      // RGB mirrored from `theme.constants.ts` (dark APP_BG / light APP_BG).
      const rgb = theme.palette.mode === "dark" ? "11, 13, 18" : "250, 250, 250";
      const alpha = (100 - translucencyIntensity) / 100;
      // Body stays transparent so the fixed ::before glass layer is what
      // the user sees as the canvas tint.
      document.body.style.backgroundColor = "transparent";
      root.style.setProperty("--translucency-bg", `rgba(${rgb}, ${alpha})`);
      // Opaque app background used to mask the gray Acrylic-inactive fallback
      // when the Windows window loses focus (see the focus effect below).
      root.style.setProperty("--translucency-bg-opaque", `rgb(${rgb})`);
    } else {
      document.body.style.backgroundColor = theme.palette.background.default as string;
      root.style.removeProperty("--translucency-bg");
      root.style.removeProperty("--translucency-bg-opaque");
    }
    root.dataset.translucent = transparentBg ? "true" : "false";
    // The blur itself is done at the OS compositor level on every supported
    // platform — NSVisualEffectView on macOS, the Acrylic material on Windows
    // (see `commands::theme::apply_translucency`). A CSS `backdrop-filter` can't
    // blur the desktop behind a transparent window, so there is no CSS blur
    // path; this effect only drives the `::before` rgba tint + intensity.

    root.style.setProperty("--app-font-family", theme.typography.fontFamily ?? "");
    // Code-surface font + ligatures consumed by `MONO_STACK` / `CODE_LIGATURES`.
    root.style.setProperty("--recrest-font-mono", fontCssFamily(codeFont, "mono"));
    root.style.setProperty("--recrest-code-ligatures", codeLigatureFeatureSettings(codeLigatures));
    root.dataset.font = font;
    root.dataset.codeFont = codeFont;
    root.dataset.codeLigatures = codeLigatures;
    root.dataset.fontSize = fontSize;
    // Accessibility flags drive CSS rules in globals.css.
    root.dataset.highContrast = highContrast ? "true" : "false";
    root.dataset.reducedMotion = reducedMotion ? "true" : "false";
    root.dataset.underlineLinks = underlineLinks ? "true" : "false";
    // Drive a body-level font-family so children that don't read from MUI's
    // theme (raw <input>, <select>, lucide icons) still match.
    document.body.style.fontFamily = theme.typography.fontFamily ?? "";
    // Body text size in rem so it rides the root font size like everything
    // else. 13 px at `md` × scale 1 — exactly what this used to emit.
    document.body.style.fontSize = pxToRem(baseFontSizeForId(fontSize));
    // Interface scaling. `globals.css` consumes this as
    //   html { font-size: calc(16px * var(--ui-scale)) }
    // so every `rem` length in the app — including body-portalled overlays,
    // which the old `zoom` on `#root` could not reach — scales together while
    // the layout viewport (and therefore every media query) stays honest.
    //
    // This is driven by `settings.uiScale`, NOT by `settings.fontSize`. The
    // two controls are now genuinely orthogonal: `fontSize` moves the
    // typography scale only, `uiScale` moves the whole interface.
    // Clamped *and* snapped: `settings.uiScale` is only ever a slider step, so
    // this is a no-op for well-formed state and a repair for anything else.
    const resolvedUiScale = clampUiScale(uiScale);
    root.style.setProperty(CSS_VAR_UI_SCALE, String(resolvedUiScale));
    // Mirrored for the anti-flash script in `index.html`, which seeds the same
    // variable before the bundle loads. Written here rather than in
    // `settingsBackendSync` so it also covers the boot path, where the scale
    // arrives from `loadSettings` instead of a user action.
    try {
      window.localStorage.setItem(StorageKey.UI_SCALE, String(resolvedUiScale));
    } catch {
      /* localStorage blocked — non-fatal; one extra reflow next boot */
    }
    // Text-only multiplier consumed by `fontPxToRem`. Exactly 1 at `md`, so
    // the default rendering is untouched.
    root.style.setProperty(CSS_VAR_TEXT_SCALE, String(textScaleForFontSize(fontSize)));

    // Toggle the OS blur material (attach when translucent, detach otherwise).
    // The CSS `::before` rgba above only tints; the actual blur is this native
    // material. `dark` picks the macOS vibrancy view's appearance / the Windows
    // Acrylic tint so the frost matches the active theme.
    void safeInvoke<void>(TauriCommand.SET_TRANSLUCENCY, {
      enabled: translucencyEnabled,
      intensity: translucencyIntensity,
      dark: theme.palette.mode === "dark",
    }).catch((err) => {
      console.warn("[theme] set_translucency failed", err);
    });
  }, [
    theme.palette.background.default,
    theme.palette.mode,
    theme.typography.fontFamily,
    theme.typography.fontSize,
    themeId,
    font,
    codeFont,
    codeLigatures,
    fontSize,
    uiScale,
    highContrast,
    reducedMotion,
    underlineLinks,
    translucencyEnabled,
    translucencyIntensity,
  ]);

  // Windows-only: the OS deactivates the Acrylic system-backdrop whenever the
  // window loses focus and leaves a flat gray fallback behind it (a longstanding
  // Acrylic behaviour — see microsoft/terminal#3497). We mirror Windows
  // Terminal: while unfocused, mark `<html>` so the glass `::before` paints the
  // app's opaque background over the gray, making the inactive window read as a
  // normal solid window. macOS keeps its vibrancy view `Active`, so this is
  // Windows-only.
  useEffect(() => {
    if (!isWindows) return;
    const root = document.documentElement;
    const onBlur = () => {
      root.dataset.windowBlurred = "true";
    };
    const onFocus = () => {
      root.dataset.windowBlurred = "false";
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      delete root.dataset.windowBlurred;
    };
  }, [isWindows]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </MuiThemeProvider>
  );
}
