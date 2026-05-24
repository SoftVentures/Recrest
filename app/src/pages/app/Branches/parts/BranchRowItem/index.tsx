import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type BranchInfo, TauriCommand } from "@recrest/shared";

import { GitBranch as BranchIcon } from "lucide-react";

import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgRise,
  prefersReducedMotionGuard,
  staggerNthOfType,
} from "@/lib/animations/pageAnimations";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";

export interface BranchRowItemProps {
  repo: EnrichedRepo;
  branch: BranchInfo;
  busyKey: string | null;
  run: (key: string, cmd: string, args: Record<string, unknown>, okMsg: string) => Promise<void>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export function BranchRowItem({ repo, branch: b, busyKey, run, t }: BranchRowItemProps) {
  const keyPrefix = `${repo.id}:${b.isRemote ? `${b.remote}/${b.name}` : b.name}`;
  const dotTone: "current" | "clean" | "remote" | "neutral" = b.isCurrent
    ? "current"
    : b.isRemote
      ? "remote"
      : b.clean
        ? "clean"
        : "neutral";
  const checkoutKey = `${keyPrefix}:checkout`;
  const pullKey = `${keyPrefix}:pull`;
  const pushKey = `${keyPrefix}:push`;
  const isCheckoutBusy = busyKey === checkoutKey;
  const isPullBusy = busyKey === pullKey;
  const isPushBusy = busyKey === pushKey;

  return (
    <Row>
      <Dot tone={dotTone} />
      <NameCell>
        <BranchIcon size={13} aria-hidden />
        <Box component="span">{b.isRemote ? `${b.remote}/${b.name}` : b.name}</Box>
        {b.isCurrent && <Tag tone="current">{t("branches.tag.current")}</Tag>}
        {b.isRemote && <Tag tone="remote">{t("branches.tag.remote")}</Tag>}
        {b.isCurrent && repo.status.dirty && <Tag tone="dirty">{t("branches.tag.dirty")}</Tag>}
        {b.clean && <Tag tone="clean">{t("branches.tag.clean")}</Tag>}
      </NameCell>
      <Meta>
        <MetaLine component="span">
          {b.isRemote
            ? " "
            : b.upstream
              ? t("branches.row.upstream_tracking", { upstream: b.upstream })
              : t("branches.row.no_upstream")}
        </MetaLine>
        <MetaLine component="span">
          {b.lastCommit ? t("branches.last_commit_by", { author: b.lastCommit.author }) : " "}
        </MetaLine>
      </Meta>
      <Tail>
        <Acts data-row-acts>
          {!b.isRemote && b.isCurrent && b.behind > 0 && (
            <RowBtn
              type="button"
              tone="ghost"
              disabled={isPullBusy}
              onClick={() =>
                void run(pullKey, "git_pull", { repoId: repo.id }, t("branches.actions.pull"))
              }
            >
              {t("branches.actions.pull")}
            </RowBtn>
          )}
          {!b.isRemote && b.isCurrent && b.ahead > 0 && (
            <RowBtn
              type="button"
              tone="ghost"
              disabled={isPushBusy}
              onClick={() =>
                void run(pushKey, "git_push", { repoId: repo.id }, t("branches.actions.push"))
              }
            >
              {t("branches.actions.push")}
            </RowBtn>
          )}
          {!b.isRemote && !b.isCurrent && (
            <RowBtn
              type="button"
              tone="primary"
              disabled={isCheckoutBusy}
              data-testid={TEST_IDS.branches.checkout}
              onClick={() =>
                void run(
                  checkoutKey,
                  TauriCommand.GIT_CHECKOUT,
                  { repoId: repo.id, branch: b.name },
                  t("branches.actions.checkout"),
                )
              }
            >
              <BranchIcon size={10} aria-hidden />
              {t("branches.actions.checkout")}
            </RowBtn>
          )}
          {b.isRemote && b.remote && (
            <RowBtn
              type="button"
              tone="primary"
              disabled={isCheckoutBusy}
              data-testid={TEST_IDS.branches.checkoutRemote}
              onClick={() =>
                void run(
                  checkoutKey,
                  TauriCommand.GIT_CHECKOUT_REMOTE,
                  { repoId: repo.id, remote: b.remote, branch: b.name },
                  t("branches.actions.checkout_remote"),
                )
              }
            >
              <BranchIcon size={10} aria-hidden />
              {t("branches.actions.checkout_remote")}
            </RowBtn>
          )}
        </Acts>
        <Track>
          {b.ahead > 0 && <Trk tone="ahead">↑{b.ahead}</Trk>}
          {b.behind > 0 && <Trk tone="behind">↓{b.behind}</Trk>}
          {b.ahead === 0 && b.behind === 0 && !b.isRemote && <Trk tone="even">even</Trk>}
        </Track>
      </Tail>
    </Row>
  );
}

export default BranchRowItem;

const Row = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "8px minmax(0, 1fr) minmax(0, 1.2fr) 280px",
  alignItems: "center",
  columnGap: 12,
  padding: "10px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderBottom: 0 },
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
  },
  "&:hover [data-row-acts]": {
    visibility: "visible",
  },
  "&:focus-within [data-row-acts]": {
    visibility: "visible",
  },
  animation: `${pgRise} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...staggerNthOfType({ step: 40, count: 10, base: 80 }),
  ...prefersReducedMotionGuard,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
const Dot = styled("span", {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "neutral" | "current" | "clean" | "remote" }>(({ theme, tone }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
  ...(tone === "neutral" && {
    backgroundColor: theme.palette.text.informationLight,
  }),
  ...(tone === "current" && {
    backgroundColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`,
  }),
  ...(tone === "clean" && {
    backgroundColor: theme.palette.text.information,
    opacity: 0.5,
  }),
  ...(tone === "remote" && {
    backgroundColor: "transparent",
    border: `1.5px dashed ${theme.palette.text.information}`,
  }),
}));

const NameCell = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12.5,
  color: theme.palette.text.primary,
  "& > svg": {
    color: theme.palette.text.information,
    flexShrink: 0,
  },
  "& > span:first-of-type": {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
const Tag = styled("span", {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "current" | "dirty" | "clean" | "remote" }>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  fontSize: 9.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  padding: "2px 7px",
  borderRadius: 100,
  ...(tone === "current" && {
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`,
    color: theme.palette.primary.dark,
  }),
  ...(tone === "dirty" && {
    backgroundColor: `color-mix(in srgb, ${theme.palette.warning.main} 18%, transparent)`,
    color: theme.palette.warning.dark,
  }),
  ...(tone === "clean" && {
    backgroundColor: theme.palette.surface.interface.backElevation,
    color: theme.palette.text.information,
  }),
  ...(tone === "remote" && {
    backgroundColor: theme.palette.surface.interface.backElevation,
    color: theme.palette.text.secondary,
  }),
}));

const Meta = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  fontSize: 11,
  color: theme.palette.text.information,
  minWidth: 0,
})) as typeof Box;

const MetaLine = styled(Box)({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minHeight: 14,
}) as typeof Box;

const Tail = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
  justifyContent: "flex-end",
}) as typeof Box;

const Acts = styled(Box)({
  display: "flex",
  gap: 4,
  visibility: "hidden",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const RowBtn = styled("button", {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone?: "primary" | "ghost" }>(({ theme, tone = "ghost" }) => {
  const isDark = theme.palette.mode === "dark";
  const primaryBg = isDark ? "#0f1115" : theme.palette.text.primary;
  const primaryFg = isDark ? "#ffffff" : theme.palette.background.paper;
  const primaryHover = isDark ? "#1a1d24" : theme.palette.text.secondary;
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    height: 24,
    padding: "0 8px",
    border: "1px solid transparent",
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
    ...(tone === "primary"
      ? {
          backgroundColor: primaryBg,
          borderColor: primaryBg,
          color: primaryFg,
          "&:hover": { backgroundColor: primaryHover, borderColor: primaryHover },
        }
      : {
          backgroundColor: "transparent",
          color: theme.palette.text.secondary,
          "&:hover": {
            backgroundColor: theme.palette.surface.interface.active,
            color: theme.palette.text.primary,
          },
        }),
    "&:disabled": { opacity: 0.55, cursor: "default" },
  };
});

const Track = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11.5,
  fontVariantNumeric: "tabular-nums",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
const Trk = styled("span", {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "ahead" | "behind" | "even" }>(({ theme, tone }) => ({
  fontWeight: tone === "even" ? 400 : 600,
  color:
    tone === "ahead"
      ? theme.palette.success.dark
      : tone === "behind"
        ? theme.palette.warning.dark
        : theme.palette.text.information,
}));
