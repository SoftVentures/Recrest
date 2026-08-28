import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const Root = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(8),
}) as typeof Box;

export const CustomTable = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(6),
  containerType: "inline-size",
}) as typeof Box;

/**
 * Escape hatch for every `CustomRow` variant: below this width the row's column
 * floors (key + value + two action columns) no longer fit, so the cells stack
 * instead of pushing the settings panel into a sideways scroll. Each variant has
 * to spread this **after** its own `gridTemplateColumns`, because a subclass's
 * plain declaration outranks the base class's at-rule declaration.
 *
 * A container query, not a media query: the settings panel is narrower than the
 * viewport, so a `@media` threshold would fire at the wrong moment. The
 * threshold is in rem so it tracks `--ui-scale` — at a larger scale the cells
 * need to stack at a *wider* container width, because their own floors grew.
 */
export const GIT_CONFIG_ROW_STACK = {
  [`@container (max-width: ${pxToRem(560)})`]: {
    gridTemplateColumns: "minmax(0, 1fr)",
    rowGap: pxToRem(8),
  },
} as const;

export const CustomRow = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: `minmax(${pxToRem(140)}, 1fr) minmax(${pxToRem(220)}, 2.2fr) auto auto`,
  ...GIT_CONFIG_ROW_STACK,
  alignItems: "center",
  gap: pxToRem(12),
  padding: pxToRems(11, 14),
  minHeight: pxToRem(60),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
})) as typeof Box;

export const CustomCellKey = styled(Typography)(({ theme }) => ({
  fontFamily: MONO_STACK,
  fontSize: fontPxToRem(13),
  fontWeight: 500,
  color: theme.palette.text.primary,
  wordBreak: "break-all",
})) as typeof Typography;

export const CustomCellValue = styled(Typography)(({ theme }) => ({
  fontFamily: MONO_STACK,
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  wordBreak: "break-all",
})) as typeof Typography;

export const CustomRowActions = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: pxToRem(4),
}) as typeof Box;

export const CustomEmpty = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  padding: pxToRems(10, 14),
  fontStyle: "italic",
})) as typeof Typography;

export const InlineAddForm = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: pxToRem(10),
  padding: pxToRems(10, 14),
  borderRadius: 8,
  border: `1px dashed ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.backElevation,
  "& > .MuiFormControl-root": { flex: `1 1 ${pxToRem(140)}`, minWidth: 0 },
  "& > .MuiFormControl-root:nth-of-type(2)": { flex: `2 1 ${pxToRem(220)}` },
})) as typeof Box;

export const AddFormActions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  justifyContent: "flex-end",
  flex: "0 0 auto",
  marginLeft: "auto",
}) as typeof Box;

export const CustomFooter = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  paddingTop: pxToRem(4),
}) as typeof Box;

export const InlineErrorText = styled(Typography)(({ theme }) => ({
  gridColumn: "1 / -1",
  fontSize: fontPxToRem(11),
  color: theme.palette.error.main,
})) as typeof Typography;

export const LoadingText = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  fontStyle: "italic",
})) as typeof Typography;
