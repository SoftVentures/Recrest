import { Box, Typography } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const Keys = styled(Box)({
  display: "inline-flex",
  gap: pxToRem(4),
}) as typeof Box;

export const RowActions = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(8),
}) as typeof Box;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
`;

/** Stand-in for the keycap shown while the user is recording a new combo. The
 *  soft pulse signals "listening" without needing a spinner. */
export const RecordingChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  minHeight: pxToRem(22),
  padding: pxToRems(0, 10),
  borderRadius: 8,
  border: `1px dashed ${theme.palette.primary.main}`,
  color: theme.palette.primary.main,
  backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 12%, transparent)`,
  fontSize: fontPxToRem(11),
  fontWeight: 600,
  whiteSpace: "nowrap",
  animation: `${pulse} 1.4s ease-in-out infinite`,
})) as typeof Box;

export const FeedbackText = styled(Typography)(({ theme }) => ({
  display: "block",
  marginTop: pxToRem(6),
  fontSize: fontPxToRem(11.5),
  color: theme.palette.error.main,
})) as typeof Typography;

export const ResetAllBar = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  marginTop: pxToRem(4),
}) as typeof Box;
