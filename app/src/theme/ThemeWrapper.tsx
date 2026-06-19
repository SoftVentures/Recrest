import { type PropsWithChildren, useEffect, useMemo } from "react";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";

import { type FontSizeId, TauriCommand } from "@recrest/shared";

import { Platform, usePlatform } from "@/hooks/usePlatform";
import {
  MAX_BLUR_PX,
  THEME_MODE_QUERY,
  THEME_NO_TRANSITIONS_CLASS,
  ThemeId,
} from "@/lib/constants/theme.constants";
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
  const translucencyEnabled = useAppSelector((s) => s.settings.translucency.enabled);
  const translucencyIntensity = useAppSelector((s) => s.settings.translucency.intensity);
  const blurIntensity = useAppSelector((s) => s.settings.translucency.blurIntensity);
  // macOS blurs via the OS material; only the CSS path (Windows/Chromium) reads
  // the blur slider, so the blur var + `data-css-blur` are non-macOS only.
  const isMac = usePlatform() === Platform.MAC;

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
        translucent: translucencyEnabled,
      }),
    [themeId, primaryColor, dyslexiaFont, font, fontSize, translucencyEnabled],
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
    // Translucency lives entirely in CSS — no OS NSVisualEffectView material
    // (so the blur slider can truly bottom out at 0). The glass effect is
    // painted by a `position: fixed` pseudo-element on <html> so it stays
    // on its own compositor layer; without that, WebKit drops the
    // `backdrop-filter` while the user is scrolling and re-applies it on
    // scroll-end, producing a visible blur "pop" the user reported.
    //
    // Layering:
    //   <html>::before  position: fixed; inset: 0; z-index: -1;
    //                   background-color: var(--translucency-bg);
    //                   backdrop-filter: blur(var(--translucency-blur-px));
    //   <html>          transparent (anti-flash + Tauri window)
    //   <body>          transparent (so ::before shows through)
    //   <#root>         transparent
    //   <AppFrame, MainSlot> palette.background.default → transparent
    //
    // Intensity slider (the tint alpha — applies on every platform; the blur
    // amount is the OS material's fixed radius on macOS, the CSS slider on
    // Windows):
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
    } else {
      document.body.style.backgroundColor = theme.palette.background.default as string;
      root.style.removeProperty("--translucency-bg");
    }
    root.dataset.translucent = transparentBg ? "true" : "false";
    // CSS blur path (Windows): drive the slider-controlled backdrop-filter. On
    // macOS the OS NSVisualEffectView material blurs instead, so we leave
    // `data-css-blur` off and set no blur var (a CSS backdrop-filter there
    // would scroll-flicker / shimmer).
    const cssBlur = transparentBg && !isMac;
    root.dataset.cssBlur = cssBlur ? "true" : "false";
    if (cssBlur) {
      root.style.setProperty(
        "--translucency-blur-px",
        `${Math.round((blurIntensity * MAX_BLUR_PX) / 100)}px`,
      );
    } else {
      root.style.removeProperty("--translucency-blur-px");
    }

    root.style.setProperty("--app-font-family", theme.typography.fontFamily ?? "");
    root.style.setProperty("--app-font-size", `${theme.typography.fontSize}px`);
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
    document.body.style.fontSize = `${theme.typography.fontSize}px`;
    // Interface-size scaling — CSS `zoom` scales every descendant uniformly
    // (font-size, padding, border-width, fixed-px widths in styled() rules,
    // SVG icons) without us having to convert every magic number to `em`.
    // We write the multiplier into a CSS custom property on `<html>`;
    // `globals.css` consumes it via:
    //   #root { zoom: var(--ui-scale); width: calc(100vw / var(--ui-scale)); ... }
    // so the visible rendered size always equals the real viewport while
    // every descendant length scales uniformly.
    root.style.setProperty("--ui-scale", String(scaleForSize(fontSize)));

    // Translucency is rendered entirely in CSS above (the rgba `::before`
    // tint + backdrop-filter blur) — there is no OS NSVisualEffectView
    // material. That material was dropped because its fixed blur radius
    // masked the blur slider (slider 0 still showed the material's baseline
    // blur) and it caused the #85 black flicker on focus regain. This IPC is
    // now only a defensive "ensure no stale vibrancy view" clear on the
    // native side; the blur the user sees is the CSS layer driven by the
    // settings above.
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
    highContrast,
    reducedMotion,
    underlineLinks,
    translucencyEnabled,
    translucencyIntensity,
    blurIntensity,
    isMac,
  ]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </MuiThemeProvider>
  );
}
