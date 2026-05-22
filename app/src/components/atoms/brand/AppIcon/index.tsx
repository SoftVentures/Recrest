import { styled } from "@mui/material/styles";

import IconDark from "@/assets/recrest-icon-dark.svg?react";
import IconDevDark from "@/assets/recrest-icon-dev-dark.svg?react";
import IconDevLight from "@/assets/recrest-icon-dev-light.svg?react";
import IconLight from "@/assets/recrest-icon-light.svg?react";

export interface AppIconProps {
  className?: string;
  /** Visual label read by screen readers (defaults to "Recrest"). */
  title?: string;
}

const Root = styled("span")({
  position: "relative",
  display: "inline-block",
  lineHeight: 0,
});

const Light = import.meta.env.DEV ? IconDevLight : IconLight;
const Dark = import.meta.env.DEV ? IconDevDark : IconDark;

const LightVariant = styled(Light)({
  display: "block",
  width: "100%",
  height: "100%",
  'html[data-theme="dark"] &': {
    display: "none",
  },
});

const DarkVariant = styled(Dark)({
  display: "none",
  width: "100%",
  height: "100%",
  'html[data-theme="dark"] &': {
    display: "block",
  },
});

/**
 * Full app-icon tile (white/dark rounded square + chevrons), the same artwork
 * used for the macOS `.icns` / Windows `.ico` bundle. Unlike `Logo` (which
 * strips the tile and renders chevrons in `currentColor`), this component is
 * the literal icon a user sees in their dock, taskbar or window proxy —
 * required by the OS-native window-chrome conventions.
 *
 * Picks the dev-tagged variant automatically in dev builds; Vite drops the
 * unused imports under tree-shaking at production build time.
 */
function AppIcon({ className, title = "Recrest" }: AppIconProps) {
  return (
    <Root className={className} role="img" aria-label={title}>
      <LightVariant aria-hidden />
      <DarkVariant aria-hidden />
    </Root>
  );
}

export default AppIcon;
