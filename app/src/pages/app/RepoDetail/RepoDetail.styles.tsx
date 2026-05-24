import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const Root = styled(Box)({
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  // Reserve scrollbar gutter so width is identical whether the page
  // currently overflows or not — keeps page-swap horizontally stable.
  scrollbarGutter: "stable",
}) as typeof Box;

export const BackBar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "12px 24px 0",
  color: theme.palette.text.information,
  fontSize: 12,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const BackButton = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: 0,
  padding: 4,
  color: "inherit",
  fontFamily: "inherit",
  fontSize: 12,
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
  flex: 1,
  minHeight: 0,
})) as typeof Box;

export const Header = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: 16,
  padding: 20,
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
})) as typeof Box;

export const HeaderBody = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

export const TitleRow = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 12,
}) as typeof Box;

export const RepoName = styled(Typography)(({ theme }) => ({
  fontSize: 24,
  fontWeight: 700,
  lineHeight: "30px",
  color: theme.palette.text.primary,
  letterSpacing: "-0.02em",
})) as typeof Typography;

export const LangPill = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 8px",
  borderRadius: 100,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: 11,
  fontWeight: 500,
  color: theme.palette.primary.main,
})) as typeof Box;

export const LangDot = styled(Box)(({ theme }) => ({
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: theme.palette.primary.main,
})) as typeof Box;

export const PathText = styled(Typography)(({ theme }) => ({
  marginTop: 4,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 11,
  color: theme.palette.text.information,
})) as typeof Typography;

export const MetaRow = styled(Box)({
  marginTop: 10,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
export const Chip = styled("span", {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "branch" | "clean" | "dirty" | "ahead" | "behind" | "remote" }>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontFamily:
    tone === "branch"
      ? 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
      : "inherit",
  fontSize: tone === "branch" ? 11.5 : 11,
  padding: "2px 8px",
  borderRadius: 8,
  fontWeight: 500,
  textTransform: "none",
  letterSpacing: "normal",
  color:
    tone === "clean"
      ? theme.palette.success.main
      : tone === "dirty"
        ? theme.palette.warning.main
        : tone === "ahead"
          ? theme.palette.success.main
          : tone === "behind"
            ? theme.palette.warning.main
            : tone === "remote"
              ? theme.palette.text.information
              : theme.palette.text.primary,
  backgroundColor:
    tone === "clean" || tone === "ahead"
      ? `color-mix(in srgb, ${theme.palette.success.main} 12%, transparent)`
      : tone === "dirty" || tone === "behind"
        ? `color-mix(in srgb, ${theme.palette.warning.main} 14%, transparent)`
        : theme.palette.surface.interface.backElevation,
}));

export const HeaderActions = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  flexShrink: 0,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const PrimaryBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.text.primary}`,
  background: theme.palette.text.primary,
  color: theme.palette.background.paper,
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  "&:hover": { opacity: 0.92 },
  "&:disabled": { opacity: 0.55, cursor: "not-allowed" },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const SecondaryBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 10px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  "&:hover": { backgroundColor: theme.palette.surface.interface.active },
  "&:disabled": { opacity: 0.55, cursor: "not-allowed" },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

export const IconOnlyBtn = styled(SecondaryBtn)({
  width: 32,
  padding: 0,
  justifyContent: "center",
});

export const KpiGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
}) as typeof Box;

export const KpiCard = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: 14,
  backgroundColor: theme.palette.background.paper,
  display: "flex",
  flexDirection: "column",
  gap: 4,
})) as typeof Box;

export const KpiLabel = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: theme.palette.text.information,
})) as typeof Typography;

export const KpiValue = styled(Typography)(({ theme }) => ({
  fontSize: 26,
  lineHeight: "30px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: theme.palette.text.primary,
})) as typeof Typography;

export const KpiSub = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
})) as typeof Typography;

export const Grid2 = styled(Box)({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
}) as typeof Box;

export const Card = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.paper,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 8,
})) as typeof Box;

export const CardHead = styled(Box)({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 8,
}) as typeof Box;

export const CardTitle = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
})) as typeof Typography;

export const CardMeta = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
})) as typeof Typography;

export const ActivityBars = styled(Box)({
  height: 120,
  display: "flex",
  alignItems: "flex-end",
  gap: 6,
}) as typeof Box;

export const ActivityBar = styled(Box, {
  shouldForwardProp: (p) => p !== "heightPct" && p !== "hot",
})<{ heightPct: number; hot: boolean }>(({ theme, heightPct, hot }) => ({
  flex: 1,
  minWidth: 6,
  height: `${heightPct}%`,
  borderRadius: 8,
  backgroundColor: hot
    ? theme.palette.primary.main
    : `color-mix(in srgb, ${theme.palette.primary.main} 35%, transparent)`,
}));

export const ActivityAxis = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  fontSize: 10,
  color: theme.palette.text.information,
})) as typeof Box;

export const FileList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  maxHeight: 240,
  overflowY: "auto",
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12,
}) as typeof Box;

export const FileRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "4px 0",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-child": { border: 0 },
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
export const FileKindBadge = styled("span", {
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
    textTransform: "capitalize",
    padding: "1px 6px",
    borderRadius: 8,
    color: tone.color,
    backgroundColor: tone.bg,
  };
});

export const CommitsList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 10,
  maxHeight: 320,
  overflowY: "auto",
}) as typeof Box;

export const CommitRow = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
}) as typeof Box;

export const CommitMain = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

export const CommitMessage = styled(Typography)(({ theme }) => ({
  fontSize: 12.5,
  fontWeight: 500,
  color: theme.palette.text.primary,
})) as typeof Typography;

export const CommitMeta = styled(Typography)(({ theme }) => ({
  fontSize: 10.5,
  color: theme.palette.text.information,
})) as typeof Typography;

export const PrRowSlot = styled(Box)({
  cursor: "pointer",
}) as typeof Box;

export const CleanState = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  padding: "16px 0 8px",
}) as typeof Box;

export const CleanStateText = styled(Typography)(({ theme }) => ({
  marginTop: 8,
  fontSize: 14,
  fontWeight: 600,
  color: theme.palette.text.primary,
})) as typeof Typography;

export const CleanStateSub = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
})) as typeof Typography;

export const MissingRoot = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
})) as typeof Box;
