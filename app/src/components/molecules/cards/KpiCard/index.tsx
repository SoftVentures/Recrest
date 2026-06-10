import { type ReactNode } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

export type KpiCardSize = "md" | "lg";

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Highlight the value in `primary.main` (large summary KPIs only). */
  accent?: boolean;
  size?: KpiCardSize;
  onClick?: () => void;
  "data-testid"?: string;
}

interface ButtonProps {
  size: KpiCardSize;
  clickable: boolean;
}

const FORWARD = (p: PropertyKey) => p !== "size" && p !== "clickable";

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const Root = styled("button", { shouldForwardProp: FORWARD })<ButtonProps>(
  ({ theme, size, clickable }) => ({
    textAlign: "left",
    backgroundColor:
      size === "lg" ? theme.palette.surface.interface.base : theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    padding: size === "lg" ? "20px 22px" : 14,
    cursor: clickable ? "pointer" : "default",
    display: "flex",
    flexDirection: "column",
    gap: size === "lg" ? 0 : 4,
    fontFamily: "inherit",
    color: "inherit",
    width: "100%",
    transition:
      "transform 0.16s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.16s ease, border-color 0.12s ease, background 0.12s ease",
    "&:disabled": { cursor: "default" },
    ...(clickable && {
      "&:not(:disabled):hover": {
        borderColor: theme.palette.border.hover,
        backgroundColor: theme.palette.surface.interface.active,
        transform: "translateY(-1px)",
        boxShadow: `0 4px 14px -8px ${theme.palette.common.black}`,
      },
      "&:not(:disabled):active": {
        transform: "translateY(0)",
      },
    }),
    'html[data-reduced-motion="true"] &': {
      transition: "none",
      "&:not(:disabled):hover": { transform: "none", boxShadow: "none" },
    },
  }),
);

const Label = styled(Box)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
})) as typeof Box;

interface ValueProps {
  accent: boolean;
  size: KpiCardSize;
}

const Value = styled(Box, {
  shouldForwardProp: (p) => p !== "accent" && p !== "size",
})<ValueProps>(({ theme, accent, size }) => ({
  fontSize: size === "lg" ? 44 : 26,
  fontWeight: size === "lg" ? 700 : 600,
  lineHeight: size === "lg" ? 1 : "30px",
  letterSpacing: size === "lg" ? "-0.03em" : "-0.01em",
  color: accent ? theme.palette.primary.main : theme.palette.text.primary,
  margin: size === "lg" ? "12px 0 6px" : 0,
  fontVariantNumeric: "tabular-nums",
}));

const Sub = styled(Box)(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
})) as typeof Box;

/**
 * Compact KPI surface: uppercase label, large value, optional sub-line. The
 * `lg` size matches the Dashboard's clickable summary tiles (44px value,
 * lifted hover); the `md` size matches RepoDetail's static stat grid (26px
 * value, no hover). Pass `onClick` to make the whole tile a button with the
 * lifted-hover treatment.
 */
function KpiCard({
  label,
  value,
  sub,
  accent = false,
  size = "lg",
  onClick,
  "data-testid": testId,
}: KpiCardProps) {
  const clickable = Boolean(onClick);
  return (
    <Root
      type="button"
      size={size}
      clickable={clickable}
      onClick={onClick}
      disabled={!clickable}
      data-testid={testId}
    >
      <Label>{label}</Label>
      <Value accent={accent} size={size}>
        {value}
      </Value>
      {sub && <Sub>{sub}</Sub>}
    </Root>
  );
}

export default KpiCard;
