import { type PropsWithChildren, useEffect, useMemo } from "react";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";

import type { FontSizeId } from "@recrest/shared";

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
  const fontSize = useAppSelector((s) => s.settings.fontSize);
  const highContrast = useAppSelector((s) => s.settings.highContrast);
  const reducedMotion = useAppSelector((s) => s.settings.reducedMotion);
  const underlineLinks = useAppSelector((s) => s.settings.underlineLinks);

  // "Follow system" mode: subscribe to the OS appearance media query and
  // mirror its current value into the store via `syncSystemTheme` (which
  // updates themeId without flipping followsSystem off — that's the whole
  // point of the dedicated action).
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
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [followsSystem, dispatch]);

  const theme = useMemo(
    () => getTheme(themeId, { primaryColor, dyslexiaFont, font, fontSize }),
    [themeId, primaryColor, dyslexiaFont, font, fontSize],
  );

  // Root-element side effects so non-MUI children (native inputs, our own
  // styled() rules that read `font-family: inherit`, the Kbd hint chip in
  // the header, etc.) cascade with the picked font too.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--app-font-family", theme.typography.fontFamily ?? "");
    root.style.setProperty("--app-font-size", `${theme.typography.fontSize}px`);
    root.dataset.font = font;
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
    theme.typography.fontFamily,
    theme.typography.fontSize,
    font,
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
