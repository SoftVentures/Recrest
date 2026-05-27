import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { CheckRunSummary, PrEvent, RecentCommit } from "@recrest/shared";

import { FeedEventKind } from "@/lib/constants/feedEventKinds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";

export type FeedEvent =
  | {
      kind: typeof FeedEventKind.COMMIT;
      at: string;
      repo: EnrichedRepo | undefined;
      data: RecentCommit;
    }
  | { kind: typeof FeedEventKind.PR; at: string; repo: EnrichedRepo | undefined; data: PrEvent }
  | {
      kind: typeof FeedEventKind.CHECK;
      at: string;
      repo: EnrichedRepo | undefined;
      data: CheckRunSummary;
    };

export { commitUrl } from "@/lib/utils/gitUrls.utils";

export const FeedItem = styled(Box, { shouldForwardProp: (p) => p !== "clickable" })<{
  clickable?: boolean;
}>(({ theme, clickable }) => ({
  display: "grid",
  gridTemplateColumns: "22px 24px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: clickable ? "pointer" : "default",
  "&:last-of-type": { borderBottom: 0 },
  "&:hover": {
    backgroundColor: clickable ? theme.palette.surface.interface.active : "transparent",
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
  },
}));

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
export const FeedIcon = styled("span", { shouldForwardProp: (p) => p !== "tone" })<{
  tone: "commit" | "opened" | "merged" | "closed" | "check-ok" | "check-fail";
}>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: "50%",
  flexShrink: 0,
  color:
    tone === "commit"
      ? theme.palette.text.information
      : tone === "opened"
        ? theme.palette.primary.main
        : tone === "merged"
          ? theme.palette.success.main
          : tone === "check-ok"
            ? theme.palette.success.main
            : tone === "check-fail"
              ? theme.palette.error.main
              : theme.palette.text.information,
  backgroundColor:
    tone === "commit"
      ? theme.palette.surface.interface.backElevation
      : tone === "opened"
        ? `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`
        : tone === "merged"
          ? `color-mix(in srgb, ${theme.palette.success.main} 14%, transparent)`
          : tone === "check-ok"
            ? `color-mix(in srgb, ${theme.palette.success.main} 14%, transparent)`
            : tone === "check-fail"
              ? `color-mix(in srgb, ${theme.palette.error.main} 14%, transparent)`
              : theme.palette.surface.interface.backElevation,
}));

export const FeedMsg = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.primary,
  fontWeight: 500,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
})) as typeof Typography;

export const FeedMeta = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  color: theme.palette.text.information,
  flexShrink: 0,
  whiteSpace: "nowrap",
})) as typeof Typography;
