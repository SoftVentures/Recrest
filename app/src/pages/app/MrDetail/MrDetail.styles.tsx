import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const Root = styled(Box)({
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  scrollbarGutter: "stable",
}) as typeof Box;

export const BackBar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(6),
  padding: pxToRems(12, 24, 0),
  color: theme.palette.text.information,
  fontSize: fontPxToRem(12),
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> required: ghost back-link with keyboard focus, no real <a>
export const BackButton = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  background: "transparent",
  border: 0,
  padding: pxToRem(4),
  color: "inherit",
  fontFamily: "inherit",
  fontSize: fontPxToRem(12),
  cursor: "pointer",
  borderRadius: 8,
  "&:hover": { color: theme.palette.text.primary },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

export const Content = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  padding: theme.spacing(3),
})) as typeof Box;

// Shared empty/placeholder text used by every part-level card (description,
// reviewers, diff, timeline). Kept here so parts don't need to depend on
// each other's style files.
export const Empty = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(12.5),
  color: theme.palette.text.information,
})) as typeof Box;

export const NotFoundRoot = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
})) as typeof Box;

export const LoadingRoot = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(4),
})) as typeof Box;
