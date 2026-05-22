import { styled } from "@mui/material/styles";

import IconDev from "@/assets/recrest-icon-dev.svg?react";
import IconTransparentDark from "@/assets/recrest-icon-transparent-dark.svg?react";
import IconTransparentWhite from "@/assets/recrest-icon-transparent-white.svg?react";

export interface LogoProps {
  className?: string;
  /** Visual label read by screen readers (defaults to "Recrest"). */
  title?: string;
}

const Root = styled("span")({
  position: "relative",
  display: "inline-block",
  lineHeight: 0,
});

const DevMark = styled(IconDev)({
  display: "block",
  width: "100%",
  height: "100%",
});

const LightVariant = styled(IconTransparentDark)({
  display: "block",
  width: "100%",
  height: "100%",
  'html[data-theme="dark"] &': {
    display: "none",
  },
});

const DarkVariant = styled(IconTransparentWhite)({
  display: "none",
  width: "100%",
  height: "100%",
  'html[data-theme="dark"] &': {
    display: "block",
  },
});

const IS_VITE_DEV = import.meta.env.DEV;

/**
 * Recrest mark used in the left sidebar's brand row.
 *
 * Variant matrix:
 *   prod, any theme → transparent wordmark, chevron colour follows theme
 *                     (dark chevrons in light mode, white chevrons in dark)
 *   dev,  any theme → `recrest-icon-dev.svg` (orange chevrons + `</>` badge).
 *                     The dev mark is already theme-neutral (orange reads on
 *                     both surfaces), so we don't need a per-theme split.
 *
 * "Dev" means **Vite dev build** (`import.meta.env.DEV`) — covers both
 * `yarn tauri:dev` and `yarn dev:web`, because both run the dev bundle.
 * The previous gating (real-Tauri only) was overly defensive and meant the
 * dev badge silently disappeared in `dev:web`, where most UI iteration
 * actually happens. The favicon (`useFaviconSync`) uses the same `DEV`
 * gate, so tab + sidebar stay in lockstep.
 */
function Logo({ className, title = "Recrest" }: LogoProps) {
  if (IS_VITE_DEV) {
    return (
      <Root className={className} role="img" aria-label={title}>
        <DevMark aria-hidden />
      </Root>
    );
  }
  return (
    <Root className={className} role="img" aria-label={title}>
      <LightVariant aria-hidden />
      <DarkVariant aria-hidden />
    </Root>
  );
}

export default Logo;
