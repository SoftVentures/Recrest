import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const StepRoot = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  minHeight: pxToRem(340),
}));

export const StepHead = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(0.5),
}));

export const StepTitle = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(20),
  fontWeight: 700,
  letterSpacing: "-0.01em",
  lineHeight: 1.2,
  margin: 0,
  color: theme.palette.text.primary,
})) as typeof Typography;

export const StepBody = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(13),
  lineHeight: 1.5,
  color: theme.palette.text.information,
  margin: 0,
})) as typeof Typography;

export const StepContent = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1.5),
  flex: 1,
  minHeight: 0,
}));

export const StepFooter = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
  paddingTop: theme.spacing(1.5),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

/**
 * Container for the "tile row" pattern used inside Basics — each row is a
 * thin card with label + sub on the left and the input on the right. Mirrors
 * the SettingsRow/SettingsSection treatment from the Settings page so the
 * wizard feels like it's previewing the same surface.
 */
export const TileStack = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));

export const Tile = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
  padding: pxToRems(12, 14),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
}));

export const TileLeft = styled(Box)({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(2),
}) as typeof Box;

export const TileLabel = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(13),
  color: theme.palette.text.primary,
  fontWeight: 500,
})) as typeof Typography;

export const TileSub = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
})) as typeof Typography;

export const TileRight = styled(Box)({
  flexShrink: 0,
}) as typeof Box;
