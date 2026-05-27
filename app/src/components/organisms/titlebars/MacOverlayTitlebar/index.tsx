import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { TEST_IDS } from "@/lib/constants/testIds.constants";

/**
 * macOS "Overlay" titlebar. The OS draws traffic-lights at the configured
 * `trafficLightPosition` above the WebView; we paint the chrome strip behind
 * them. The background is intentionally a touch darker than the sidebar so
 * macOS' inactive traffic-lights (faint outlined gray circles) keep enough
 * contrast to stay visible when the window loses focus.
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
  backgroundColor: theme.palette.mode === "dark" ? "#1c1e26" : "#f4f6f8",
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
