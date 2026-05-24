import { useEffect, useRef } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { TauriCommand } from "@recrest/shared";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri } from "@/lib/tauri";
import { runWindow } from "@/lib/utils/window.utils";

export interface Win11TitlebarProps {
  isMaximized: boolean;
}

const Bar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  // OS window chrome must look native regardless of the user's in-app font
  // choice — pin to the system stack so the bar always feels like part of
  // the desktop, not the application.
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
  height: 32,
  flex: "0 0 32px",
  paddingLeft: 12,
  paddingRight: 0,
  backgroundColor: theme.palette.background.paper,
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

const Controls = styled(Box)({
  display: "flex",
  gap: 0,
});

interface CtrlButtonProps {
  closeVariant?: boolean;
}

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const CtrlButton = styled("button", {
  shouldForwardProp: (p) => p !== "closeVariant",
})<CtrlButtonProps>(({ theme, closeVariant }) => ({
  width: 46,
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: 0,
  background: "transparent",
  color: theme.palette.text.secondary,
  cursor: "pointer",
  "&:hover": closeVariant
    ? { backgroundColor: "#c42b1c", color: "#fff" }
    : {
        backgroundColor: theme.palette.surface.interface.active,
        color: theme.palette.text.primary,
      },
}));

/**
 * Windows-11 chrome. Three mini-buttons right (46×32), close-hover red.
 * Brand + version left. Uses native browser tooltips (no Radix) so they
 * don't double-stack with the OS-level tooltips Windows shows when our
 * Win32 subclass returns `HTMINBUTTON` / `HTMAXBUTTON` / `HTCLOSE` from
 * `WM_NCHITTEST`. Same `HTMAXBUTTON` answer is what makes Windows 11
 * surface its Snap-Layouts flyout — the Rust subclass needs pixel rects.
 */
function Win11Titlebar({ isMaximized }: Win11TitlebarProps) {
  const { t } = useTranslation("common");
  const minimizeLabel = t("titlebar.minimize");
  const maximizeLabel = isMaximized ? t("titlebar.restore") : t("titlebar.maximize");
  const closeLabel = t("titlebar.close");

  const minRef = useRef<HTMLButtonElement | null>(null);
  const maxRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    const min = minRef.current;
    const max = maxRef.current;
    const close = closeRef.current;
    if (!min || !max || !close) return;

    const rectOf = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };

    const push = () => {
      void invoke(TauriCommand.SET_CAPTION_BUTTON_BOUNDS, {
        min: rectOf(min),
        max: rectOf(max),
        close: rectOf(close),
      }).catch(() => {
        /* command may be a no-op on non-Windows builds */
      });
    };

    push();
    const observer = new ResizeObserver(push);
    observer.observe(min);
    observer.observe(max);
    observer.observe(close);
    window.addEventListener("resize", push);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", push);
    };
  }, []);

  return (
    <Bar data-tauri-drag-region data-testid={TEST_IDS.titlebar.win11}>
      {/* Brand mark/name/version intentionally omitted — they live in the
       *  sidebar instead, freeing the title bar for future Snap-Layouts /
       *  workspace switcher tooling. The empty drag region keeps the bar
       *  draggable in Tauri. */}
      <TitleSlot data-tauri-drag-region />
      <Controls>
        <CtrlButton
          ref={minRef}
          type="button"
          aria-label={minimizeLabel}
          title={minimizeLabel}
          data-testid={TEST_IDS.titlebar.min}
          onClick={() => void runWindow((w) => w.minimize())}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M1 5h8" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </CtrlButton>
        <CtrlButton
          ref={maxRef}
          type="button"
          aria-label={maximizeLabel}
          title={maximizeLabel}
          data-testid={TEST_IDS.titlebar.max}
          onClick={() => void runWindow((w) => w.toggleMaximize())}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <rect
                x="0.5"
                y="2.5"
                width="6"
                height="6"
                stroke="currentColor"
                strokeWidth="1.1"
                fill="none"
              />
              <rect
                x="3.5"
                y="0.5"
                width="6"
                height="6"
                stroke="currentColor"
                strokeWidth="1.1"
                fill="none"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <rect
                x="1.5"
                y="1.5"
                width="7"
                height="7"
                stroke="currentColor"
                strokeWidth="1.1"
                fill="none"
              />
            </svg>
          )}
        </CtrlButton>
        <CtrlButton
          ref={closeRef}
          closeVariant
          type="button"
          aria-label={closeLabel}
          title={closeLabel}
          data-testid={TEST_IDS.titlebar.close}
          onClick={() => void runWindow((w) => w.close())}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </CtrlButton>
      </Controls>
    </Bar>
  );
}

export default Win11Titlebar;
