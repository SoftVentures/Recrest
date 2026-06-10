import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import IconDev from "@/assets/logos/recrest-icon-dev.svg?react";
import IconTransparentDark from "@/assets/logos/recrest-icon-transparent-dark.svg?react";
import IconTransparentWhite from "@/assets/logos/recrest-icon-transparent-white.svg?react";
import { isDemoMode } from "@/lib/utils/demoMode.utils";

export interface LogoProps {
  className?: string;
  title?: string;
}

const Root = styled(Box)({
  position: "relative",
  display: "inline-block",
  lineHeight: 0,
}) as typeof Box;

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

// `import.meta.env.DEV` is true for both `yarn tauri:dev` and `yarn dev:web`,
// so the orange `</>` dev badge appears in every dev workflow — the favicon
// gate in `useFaviconSync` uses the same flag so tab + sidebar stay in sync.
// Demo mode (`?demoChrome=`) suppresses the dev badge so marketing captures
// taken from `dev:web` show the production brand mark.
function Logo({ className, title = "Recrest" }: LogoProps) {
  if (import.meta.env.DEV && !isDemoMode()) {
    return (
      <Root component="span" className={className} role="img" aria-label={title}>
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
