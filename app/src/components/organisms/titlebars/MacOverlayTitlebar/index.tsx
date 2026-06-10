import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { isRealTauri } from "@/hooks/usePlatform";
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

// In pure-web / demo mode there is no OS to paint the traffic-lights into the
// reserved 84px gutter, so we draw faux ones — purely cosmetic, non-interactive
// — to keep marketing screenshots looking like the installed macOS app.
const FauxLights = styled(Box)({
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  gap: 8,
  pointerEvents: "none",
});

const Light = styled(Box, {
  shouldForwardProp: (prop) => prop !== "tone",
})<{ tone: "close" | "min" | "max" }>(({ tone }) => ({
  width: 12,
  height: 12,
  borderRadius: "50%",
  backgroundColor: tone === "close" ? "#ff5f57" : tone === "min" ? "#febc2e" : "#28c840",
  boxShadow: "inset 0 0 0 0.5px rgba(0, 0, 0, 0.2)",
}));

function MacOverlayTitlebar() {
  // No brand mark / name / version in the chrome itself — that bar is just
  // OS chrome + drag region; brand lives in the sidebar where it belongs.
  return (
    <Bar data-tauri-drag-region data-testid={TEST_IDS.titlebar.mac}>
      {!isRealTauri() && (
        <FauxLights aria-hidden>
          <Light tone="close" />
          <Light tone="min" />
          <Light tone="max" />
        </FauxLights>
      )}
    </Bar>
  );
}

export default MacOverlayTitlebar;
