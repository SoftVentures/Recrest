import type { Components, Theme } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

const MuiOverrides: Components<Omit<Theme, "components">> = {
  MuiButton: {
    defaultProps: {
      disableElevation: true,
      size: "small",
    },
  },
  MuiTextField: {
    defaultProps: {
      size: "small",
      variant: "outlined",
    },
  },
  MuiTooltip: {
    defaultProps: {
      arrow: true,
      enterDelay: 200,
    },
    styleOverrides: {
      // Override the MUI default (dark grey blob, white text) — match the
      // baseline tooltip styling: surface-1 background, border-default ring,
      // ink-0 text, soft shadow, slightly larger padding. Same recipe in
      // light + dark mode (`palette.surface.interface.base` and
      // `palette.text.primary` flip with the theme automatically).
      tooltip: ({ theme }) => ({
        backgroundColor: theme.palette.surface.interface.base,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 8,
        padding: pxToRems(8, 10),
        fontSize: fontPxToRem(11.5),
        fontWeight: 500,
        lineHeight: 1.4,
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 4px 16px rgba(0, 0, 0, 0.45)"
            : "0 4px 16px rgba(17, 17, 22, 0.12)",
        maxWidth: pxToRem(320),
      }),
      arrow: ({ theme }) => ({
        color: theme.palette.surface.interface.base,
        "&::before": {
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.surface.interface.base,
        },
      }),
    },
  },
  // MUI hard-codes the menu/list box metrics in px (`padding: '6px 16px'` on
  // MenuItem, `8px 0` on List), which would leave body-portalled menus with
  // scaled text inside unscaled padding. Restated in rem — byte-identical at
  // scale 1, correct at every other scale.
  MuiMenuItem: {
    styleOverrides: {
      root: {
        paddingTop: pxToRem(6),
        paddingBottom: pxToRem(6),
        paddingLeft: pxToRem(16),
        paddingRight: pxToRem(16),
      },
    },
  },
  MuiList: {
    styleOverrides: {
      padding: {
        paddingTop: pxToRem(8),
        paddingBottom: pxToRem(8),
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundImage: "none",
        ...(theme.effects.backdropBlur !== "blur(0)" && {
          backdropFilter: theme.effects.backdropBlur,
        }),
      }),
    },
  },
  MuiCssBaseline: {
    styleOverrides: {
      html: {
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      },
      body: {
        fontFeatureSettings: '"cv11", "ss01", "ss03"',
      },
      // Scrollbar metrics stay in px: they are chrome the user reads as part
      // of the window, not as part of the content, and 4 px is already at the
      // lower bound of a usable hit target.
      "*::-webkit-scrollbar": {
        width: 4,
        height: 4,
        background: "transparent",
      },
      "*::-webkit-scrollbar-thumb": {
        background: "currentColor",
        borderRadius: 8,
        opacity: 0.3,
      },
    },
  },
};

export default MuiOverrides;
