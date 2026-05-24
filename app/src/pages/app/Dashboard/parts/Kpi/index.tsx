import { type ReactNode } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

export interface KpiProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
  onClick?: () => void;
}

export function Kpi({ label, value, sub, accent, onClick }: KpiProps) {
  return (
    <KpiButton type="button" onClick={onClick} disabled={!onClick}>
      <KpiLabel>{label}</KpiLabel>
      <KpiValue accent={accent}>{value}</KpiValue>
      {sub && <KpiSub>{sub}</KpiSub>}
    </KpiButton>
  );
}

export default Kpi;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const KpiButton = styled("button")(({ theme }) => ({
  textAlign: "left",
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "20px 22px",
  cursor: "pointer",
  transition:
    "transform 0.16s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.16s ease, border-color 0.12s ease, background 0.12s ease",
  fontFamily: "inherit",
  color: "inherit",
  "&:disabled": { cursor: "default" },
  "&:not(:disabled):hover": {
    borderColor: theme.palette.border.hover,
    backgroundColor: theme.palette.surface.interface.active,
    transform: "translateY(-1px)",
    boxShadow: `0 4px 14px -8px ${theme.palette.common.black}`,
  },
  "&:not(:disabled):active": {
    transform: "translateY(0)",
  },
  'html[data-reduced-motion="true"] &': {
    transition: "none",
    "&:not(:disabled):hover": { transform: "none", boxShadow: "none" },
  },
}));

const KpiLabel = styled(Box)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
})) as typeof Box;

interface KpiValueProps {
  accent?: boolean;
}

const KpiValue = styled(Box, {
  shouldForwardProp: (p) => p !== "accent",
})<KpiValueProps>(({ theme, accent }) => ({
  fontSize: 44,
  fontWeight: 700,
  color: accent ? theme.palette.primary.main : theme.palette.text.primary,
  letterSpacing: "-0.03em",
  margin: "12px 0 6px",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1,
}));

const KpiSub = styled(Box)(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
})) as typeof Box;
