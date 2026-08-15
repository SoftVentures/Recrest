import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { runWindow } from "@/lib/utils/window.utils";

const Bar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  // OS window chrome must look native regardless of the user's in-app font
  // choice — pin to the system stack so the bar always feels like part of
  // the desktop, not the application.
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
  // Window-chrome geometry stays in PX on purpose — it must line up with the
  // OS-drawn decoration next to it (traffic lights / caption buttons / native
  // shell), which does not follow the app's `--ui-scale`. Do NOT convert the
  // heights, widths or insets in this file to rem.
  height: 42,
  flex: "0 0 42px",
  paddingLeft: 12,
  paddingRight: 12,
  // Opaque chrome surface (not `background.paper`, which can sit behind the
  // translucency effect) so the window controls keep a solid strip.
  backgroundColor: theme.palette.surface.interface.chrome,
  borderBottom: `1px solid ${theme.palette.divider}`,
  WebkitUserSelect: "none",
  userSelect: "none",
  position: "relative",
  zIndex: 200,
}));

const TitleSlot = styled(Box)({
  // Empty drag region — brand mark/name/version live in the sidebar.
  flex: 1,
});

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const ClosePill = styled("button")(({ theme }) => ({
  width: 24,
  height: 24,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: 0,
  backgroundColor: theme.palette.surface.interface.active,
  color: theme.palette.text.secondary,
  cursor: "pointer",
  "&:hover": {
    backgroundColor: "#e01b24",
    color: "#fff",
  },
}));

/**
 * libadwaita-style GNOME titlebar: brand + version left, one round close pill
 * right. Minimize/Maximize intentionally omitted — GNOME convention expects
 * double-click on the drag region or keyboard shortcuts.
 */
function GnomeTitlebar() {
  const { t } = useTranslation(I18nNamespace.COMMON);
  const closeLabel = t("titlebar.close");
  return (
    <Bar data-tauri-drag-region data-testid={TEST_IDS.titlebar.gnome}>
      {/* Brand mark/name/version intentionally omitted — they live in the
       *  sidebar instead. */}
      <TitleSlot data-tauri-drag-region />
      <GeneralTooltip title={closeLabel}>
        <ClosePill
          type="button"
          aria-label={closeLabel}
          data-testid={TEST_IDS.titlebar.close}
          onClick={() => void runWindow((w) => w.close())}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </ClosePill>
      </GeneralTooltip>
    </Bar>
  );
}

export default GnomeTitlebar;
