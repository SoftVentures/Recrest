import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Button } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type BranchInfo, TauriCommand } from "@recrest/shared";

import { GitBranch as BranchIcon, Trash2 } from "lucide-react";

import GeneralIconButton, {
  IconButtonSize,
  IconButtonTone,
} from "@/components/atoms/buttons/GeneralIconButton";
import BranchFilterChip from "@/components/atoms/chips/BranchFilterChip";
import IconSlot from "@/components/atoms/layout/IconSlot";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";
import DeleteBranchDialog from "@/pages/app/Branches/parts/DeleteBranchDialog";

export interface BranchRowItemProps {
  repo: EnrichedRepo;
  branch: BranchInfo;
  busyKey: string | null;
  run: (key: string, cmd: string, args: Record<string, unknown>, okMsg: string) => Promise<void>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export function BranchRowItem({ repo, branch: b, busyKey, run, t }: BranchRowItemProps) {
  const { t: tRepos } = useTranslation(I18nNamespace.REPOS);
  const [deleteOpen, setDeleteOpen] = useState(false);
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
        <IconSlot size={16} tone="information">
          <BranchIcon size={13} aria-hidden />
        </IconSlot>
        <Box component="span">{b.isRemote ? `${b.remote}/${b.name}` : b.name}</Box>
        {b.isCurrent && (
          <BranchFilterChip tone="current">{t("branches.tag.current")}</BranchFilterChip>
        )}
        {b.isRemote && (
          <BranchFilterChip tone="remote">{t("branches.tag.remote")}</BranchFilterChip>
        )}
        {b.isCurrent && repo.status.dirty && (
          <BranchFilterChip tone="dirty">{t("branches.tag.dirty")}</BranchFilterChip>
        )}
        {b.clean && <BranchFilterChip tone="clean">{t("branches.tag.clean")}</BranchFilterChip>}
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
                void run(
                  pullKey,
                  TauriCommand.GIT_PULL,
                  { repoId: repo.id },
                  t("branches.actions.pulled"),
                )
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
                void run(
                  pushKey,
                  TauriCommand.GIT_PUSH,
                  { repoId: repo.id },
                  t("branches.actions.pushed"),
                )
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
                  t("branches.actions.checked_out", { branch: b.name }),
                )
              }
            >
              <BranchIcon size={10} aria-hidden />
              {t("branches.actions.checkout")}
            </RowBtn>
          )}
          {!b.isRemote && !b.isCurrent && (
            <GeneralIconButton
              size={IconButtonSize.SM}
              tone={IconButtonTone.DANGER}
              aria-label={t("branches.actions.delete")}
              data-testid={TEST_IDS.branches.delete}
              icon={<Trash2 size={13} aria-hidden />}
              onClick={() => setDeleteOpen(true)}
            />
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
                  t("branches.actions.checked_out", { branch: b.name }),
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
          {/* "in sync" only makes sense against an upstream — a branch with no
              upstream already says so in the middle column, so show nothing. */}
          {!b.isRemote && !!b.upstream && b.ahead === 0 && b.behind === 0 && (
            <Trk tone="even">{tRepos("branches.track_even")}</Trk>
          )}
        </Track>
      </Tail>
      {!b.isRemote && !b.isCurrent && (
        <DeleteBranchDialog
          open={deleteOpen}
          repoId={repo.id}
          branch={b}
          run={run}
          t={t}
          onClose={() => setDeleteOpen(false)}
        />
      )}
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
  // No per-row entrance animation: rows render instantly with their group's
  // fade. Animating every row (with a stagger cascade) janked on repos with
  // many branches and made the tab feel slow to settle.
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
  fontFamily: MONO_STACK,
  fontSize: 12.5,
  color: theme.palette.text.primary,
  "& > span:first-of-type": {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
})) as typeof Box;

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

const RowBtn = styled(Button, {
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
    minWidth: 0,
    height: 24,
    padding: "0 8px",
    border: "1px solid transparent",
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "inherit",
    textTransform: "none",
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
      ? toneText(theme, StatusTone.SUCCESS)
      : tone === "behind"
        ? toneText(theme, StatusTone.WARNING)
        : theme.palette.text.information,
}));
