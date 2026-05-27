import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

export type AheadBehindSize = "sm" | "md";
export type AheadBehindVariant = "compact" | "separated";

export interface AheadBehindProps {
  ahead: number;
  behind: number;
  size?: AheadBehindSize;
  variant?: AheadBehindVariant;
  /** When `true` and one side is `0`, hide that side entirely. Defaults to
   *  `false` for the `separated` variant (Dashboard KPI), `true` for the
   *  `compact` variant (Repo rows). */
  hideZero?: boolean;
  className?: string;
}

interface RootProps {
  size: AheadBehindSize;
  variant: AheadBehindVariant;
}

const FORWARD = (p: PropertyKey) => p !== "size" && p !== "variant";

const Root = styled(Box, { shouldForwardProp: FORWARD })<RootProps>(({ theme, size, variant }) => ({
  display: "inline-flex",
  alignItems: variant === "separated" ? "baseline" : "center",
  gap: variant === "separated" ? 4 : size === "md" ? 10 : 5,
  fontSize: size === "md" ? 13 : 11,
  fontWeight: variant === "separated" ? 600 : size === "md" ? 700 : 400,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
  lineHeight: variant === "separated" ? 1 : undefined,
  flexShrink: 0,
}));

const Arrow = styled(Box)(({ theme }) => ({
  fontSize: 22,
  fontWeight: 600,
  color: theme.palette.text.information,
})) as typeof Box;

const Sep = styled(Box)(({ theme }) => ({
  fontWeight: 400,
  color: theme.palette.text.informationLight,
  margin: "0 6px",
})) as typeof Box;

/**
 * Renders the ↑ahead / ↓behind glyph pair that summarises a branch's
 * relationship to its upstream. Replaces three near-identical inline copies
 * (Dashboard KPI, RepoRow, RepoCard, DetailPane). The `separated` variant
 * mimics the Dashboard's display ("↑ 5 / ↓ 3" with a centred slash); the
 * `compact` variant is the inline form used inside narrow cells.
 */
function AheadBehind({
  ahead,
  behind,
  size = "sm",
  variant = "compact",
  hideZero = variant === "compact",
  className,
}: AheadBehindProps) {
  const showAhead = !hideZero || ahead > 0;
  const showBehind = !hideZero || behind > 0;
  if (!showAhead && !showBehind) return null;

  if (variant === "separated") {
    return (
      <Root size={size} variant={variant} className={className}>
        <Arrow component="span">↑</Arrow>
        {ahead}
        <Sep component="span">/</Sep>
        <Arrow component="span">↓</Arrow>
        {behind}
      </Root>
    );
  }

  return (
    <Root size={size} variant={variant} className={className}>
      {showAhead && <Box component="span">↑{ahead}</Box>}
      {showBehind && <Box component="span">↓{behind}</Box>}
    </Root>
  );
}

export default AheadBehind;
