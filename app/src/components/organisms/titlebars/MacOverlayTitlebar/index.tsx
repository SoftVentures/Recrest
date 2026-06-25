import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { Menu as MenuIcon } from "lucide-react";

import AppMenu from "@/components/organisms/titlebars/AppMenu";
import { isRealTauri } from "@/hooks/usePlatform";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
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
  paddingRight: 8,
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

// Empty, draggable middle so the whole strip moves the window — the menu
// button below opts out of the drag region so it stays clickable.
const Spacer = styled(Box)({ flex: 1, height: "100%" });

// eslint-disable-next-line no-restricted-syntax -- native <button> required: a focusable caption-bar control that must NOT be a tauri drag region
const MenuButton = styled("button")(({ theme }) => ({
  width: 28,
  height: 28,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: 0,
  // Circular hover/focus highlight (vertically centred in the 38px bar, clear
  // of the ~10px rounded window corner) — a rounded RECT here clashed with the
  // macOS window corner radius and read as two mismatched radii.
  borderRadius: "50%",
  background: "transparent",
  color: theme.palette.text.secondary,
  cursor: "pointer",
  flexShrink: 0,
  transition: "background-color 0.12s ease, color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    color: theme.palette.text.primary,
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1,
  },
}));

function MacOverlayTitlebar() {
  const { t } = useTranslation(I18nNamespace.COMMON);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const closeMenu = () => setMenuAnchor(null);

  // No brand mark / name / version in the chrome itself — that bar is just
  // OS chrome + drag region; brand lives in the sidebar. The only control is
  // the right-aligned app-menu button (mirrors the Windows titlebar's menu).
  return (
    <Bar data-tauri-drag-region data-testid={TEST_IDS.titlebar.mac}>
      {!isRealTauri() && (
        <FauxLights aria-hidden>
          <Light tone="close" />
          <Light tone="min" />
          <Light tone="max" />
        </FauxLights>
      )}
      <Spacer data-tauri-drag-region />
      <MenuButton
        type="button"
        aria-label={t("titlebar.app_menu")}
        title={t("titlebar.app_menu")}
        data-testid={TEST_IDS.titlebar.menu}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
      >
        <MenuIcon size={15} aria-hidden />
      </MenuButton>
      <AppMenu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu} />
    </Bar>
  );
}

export default MacOverlayTitlebar;
