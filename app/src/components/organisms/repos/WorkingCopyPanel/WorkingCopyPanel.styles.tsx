import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const Root = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12,
}) as typeof Box;

export const SectionBox = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflow: "hidden",
})) as typeof Box;

export const SectionHead = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "8px 12px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.backElevation,
  fontFamily: "inherit",
})) as typeof Box;

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.primary,
})) as typeof Typography;

export const SectionCount = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
  flex: 1,
  marginLeft: 4,
})) as typeof Typography;

export const SectionActions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexShrink: 0,
}) as typeof Box;

export const Row = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-child": { borderBottom: 0 },
  // Hover-reveal pattern: actions stay invisible until row is hovered or has
  // focus inside it, so the working-copy view doesn't read as a button wall.
  "& [data-row-actions]": {
    visibility: "hidden",
  },
  "&:hover [data-row-actions], &:focus-within [data-row-actions]": {
    visibility: "visible",
  },
})) as typeof Box;

export const RowPath = styled(Box)({
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 6,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}) as typeof Box;

export const RowActions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 4,
  flexShrink: 0,
}) as typeof Box;

/** Inline marker shown on a Staged row when the same file also has
 *  post-staging worktree changes (mirrors git's "Changes to be committed"
 *  + "Changes not staged for commit" duplicate view). */
export const AlsoUnstagedTag = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  padding: "1px 5px",
  borderRadius: 6,
  fontFamily: "inherit",
  fontSize: 9.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.warning.main,
  backgroundColor: `color-mix(in srgb, ${theme.palette.warning.main} 14%, transparent)`,
  flexShrink: 0,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- typed prop variant requires generic element form
export const KindBadge = styled("span", {
  shouldForwardProp: (p) => p !== "kind",
})<{ kind: string }>(({ theme, kind }) => {
  const infoColor = theme.palette.text.information ?? theme.palette.text.secondary;
  const palette: Record<string, { color: string; bg: string }> = {
    added: {
      color: theme.palette.success.dark,
      bg: `color-mix(in srgb, ${theme.palette.success.main} 14%, transparent)`,
    },
    modified: {
      color: theme.palette.primary.dark,
      bg: `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`,
    },
    deleted: {
      color: theme.palette.error.dark,
      bg: `color-mix(in srgb, ${theme.palette.error.main} 14%, transparent)`,
    },
    renamed: { color: infoColor, bg: theme.palette.surface.interface.backElevation },
  };
  const tone = palette[kind] ??
    palette.modified ?? { color: infoColor, bg: theme.palette.surface.interface.backElevation };
  return {
    fontFamily: "inherit",
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "1px 6px",
    borderRadius: 8,
    color: tone.color,
    backgroundColor: tone.bg,
    flexShrink: 0,
  };
});

export const Toolbar = styled(Box)({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 6,
  justifyContent: "space-between",
}) as typeof Box;

export const ToolbarLeft = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
}) as typeof Box;

export const ToolbarRight = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 6,
}) as typeof Box;

export const EmptyState = styled(Box)(({ theme }) => ({
  padding: 12,
  fontSize: 12,
  color: theme.palette.text.information,
  fontStyle: "italic",
})) as typeof Box;

export const StashList = styled(Box)({
  display: "flex",
  flexDirection: "column",
}) as typeof Box;

export const StashRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-child": { borderBottom: 0 },
})) as typeof Box;

export const StashMessage = styled(Box)({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 12,
}) as typeof Box;

export const StashIndex = styled(Box)(({ theme }) => ({
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 10,
  color: theme.palette.text.information,
  flexShrink: 0,
})) as typeof Box;
