import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { TEST_IDS } from "@/lib/constants/testIds.constants";

/**
 * macOS "Overlay" titlebar. The OS draws traffic-lights at the configured
 * `trafficLightPosition`. We only render an empty drag region — the brand
 * mark / name / version intentionally don't live here.
 *
 * The container stays transparent so the native traffic-lights remain
 * visible (macOS greys them when inactive but doesn't move/hide them).
 */
const Bar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  // OS window chrome must look native regardless of the user's in-app font
  // choice — pin to the system stack so the bar always feels like part of
  // the desktop, not the application.
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
  height: 38,
  flex: "0 0 38px",
  // 84px left reservation so brand never collides with system traffic lights
  // (lights sit at x=14 with ~58px combined width → ~72px right edge).
  paddingLeft: 84,
  paddingRight: 12,
  background: "transparent",
  borderBottom: `1px solid ${theme.palette.border.separator ?? theme.palette.divider}`,
  WebkitUserSelect: "none",
  userSelect: "none",
  position: "relative",
  zIndex: 200,
}));

function MacOverlayTitlebar() {
  // No brand mark / name / version in the chrome itself — that bar is just
  // OS chrome + drag region; brand lives in the sidebar where it belongs.
  return <Bar data-tauri-drag-region data-testid={TEST_IDS.titlebar.mac} />;
}

export default MacOverlayTitlebar;
