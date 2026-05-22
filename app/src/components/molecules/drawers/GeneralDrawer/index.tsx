import { Drawer, type DrawerProps as MuiDrawerProps } from "@mui/material";
import type { Theme } from "@mui/material/styles";

export type GeneralDrawerSize = "sm" | "md" | "lg" | "xl";

export interface GeneralDrawerProps extends MuiDrawerProps {
  size?: GeneralDrawerSize;
}

/**
 * Per-size paper widths. Tuned to match the Recrest baseline mocks, where
 * the MR-detail pane reads as a sidebar (~360 px) rather than a half-screen
 * overlay. `lg` and `xl` cover the rare cases that genuinely need the extra
 * room (e.g. a future full-page diff drawer).
 */
const SIZE_PX: Record<GeneralDrawerSize, number> = {
  sm: 320,
  md: 360,
  lg: 420,
  xl: 560,
};

/**
 * Recrest's drawer style intentionally drops MUI's heavy elevation stack —
 * the original mocks pin the drawer to the viewport edge with a single
 * border-left + a barely-there ambient shadow, so adjacent UI keeps its
 * contrast. We also disable the backdrop so the MR list behind the panel
 * stays interactive (matches the original "inspect while browsing" flow).
 */
function GeneralDrawer({
  size = "md",
  anchor = "right",
  slotProps,
  hideBackdrop = true,
  ...rest
}: GeneralDrawerProps) {
  const width = SIZE_PX[size];
  const paperSlotProps = slotProps?.paper ?? {};
  return (
    <Drawer
      anchor={anchor}
      hideBackdrop={hideBackdrop}
      // The drawer sits below the 64 px global app header so the header
      // chrome (search, refresh, scope toggle, add-repo button) stays
      // visible AND interactive while the user inspects an MR. Mirrors
      // the original mocks: drawer reads as a sidebar inside the page
      // area, not as a viewport overlay.
      slotProps={{
        ...slotProps,
        root: {
          ...(slotProps?.root ?? {}),
          sx: {
            top: 64,
            // The MuiModal root still paints a full-viewport presentation
            // div behind the paper; lock its events to "none" so it
            // doesn't swallow header / sidebar clicks. Per-paper
            // pointerEvents is restored below.
            pointerEvents: "none",
            ...(((slotProps?.root ?? {}) as { sx?: unknown }).sx ?? {}),
          } as object,
        },
        paper:
          typeof paperSlotProps === "function"
            ? paperSlotProps
            : {
                ...paperSlotProps,
                sx: {
                  width,
                  maxWidth: "100vw",
                  top: 64,
                  height: "calc(100% - 64px)",
                  pointerEvents: "auto",
                  borderLeft: (theme: Theme) => `1px solid ${theme.palette.divider}`,
                  borderRight: 0,
                  boxShadow: "0 4px 12px -4px rgba(17,17,22,0.10), 0 1px 0 rgba(17,17,22,0.04)",
                  backgroundImage: "none",
                  ...((paperSlotProps as { sx?: unknown }).sx ?? {}),
                } as object,
              },
      }}
      {...rest}
    />
  );
}

export default GeneralDrawer;
