import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const MetaGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
}) as typeof Box;

export const MetaCell = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "10px 12px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
})) as typeof Box;

export const MetaLabel = styled(Typography)(({ theme }) => ({
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.informationLight,
})) as typeof Typography;

export const MetaValue = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 500,
  color: theme.palette.text.primary,
})) as typeof Box;
