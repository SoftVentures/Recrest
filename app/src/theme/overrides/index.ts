import type { Components, Theme } from "@mui/material/styles";

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
        padding: "8px 10px",
        fontSize: 11.5,
        fontWeight: 500,
        lineHeight: 1.4,
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 4px 16px rgba(0, 0, 0, 0.45)"
            : "0 4px 16px rgba(17, 17, 22, 0.12)",
        maxWidth: 320,
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
