import type { KeyboardEvent } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  PROVIDER_NAMES,
  PrState,
  type PullRequest,
  TauriCommand,
  routeToMr,
} from "@recrest/shared";

import {
  Code,
  Copy,
  ExternalLink,
  GitBranch,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  Maximize2,
  Type,
} from "lucide-react";
import { toast } from "sonner";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import ContextMenu from "@/components/molecules/menus/ContextMenu";
import { useContextMenu } from "@/hooks/useContextMenu";
import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgRise,
  prefersReducedMotionGuard,
  staggerNthOfType,
} from "@/lib/animations/pageAnimations";
import { type CiTone, ciFor } from "@/lib/constants/ciStates.constants";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { KEYBOARD_KEYS } from "@/lib/constants/keyboard.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
import { deriveDiffStats } from "@/lib/utils/diffStats.utils";
import { StatusTone, toneChip, toneText } from "@/lib/utils/toneColor.utils";
import { detailKey } from "@/store/actions/prs.actions";
import { useAppSelector } from "@/store/hooks";

export interface MrRowProps {
  pr: PullRequest;
  repoId?: string;
  repoName?: string;
  /** True while this row's drawer is open — drives the same orange outline
   *  the context-menu uses, so the visual selection state matches across
   *  click-and-drawer vs. right-click-and-menu interactions. */
  selected?: boolean;
  /** What the row shows on its right edge. `"ci"` renders the CI status pill;
   *  `"state"` (default) renders the MR-state badge (Open/Draft/Merged/Closed)
   *  with a per-state icon — "running" CI on the right read as a confusing MR
   *  status, so the state badge is the canonical right-edge meta everywhere. */
  rightMeta?: "ci" | "state";
  onClick?: (pr: PullRequest) => void;
}

type MrStateTone = "open" | "merged" | "closed" | "draft";

const STATE_TONE = {
  open: StatusTone.SUCCESS,
  merged: StatusTone.PRIMARY,
  closed: StatusTone.ERROR,
} as const satisfies Record<Exclude<MrStateTone, "draft">, StatusTone>;

const STATE_ICON = {
  open: GitPullRequest,
  draft: GitPullRequestDraft,
  merged: GitMerge,
  closed: GitPullRequestClosed,
} as const satisfies Record<MrStateTone, typeof GitMerge>;

const Row = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: "pointer",
  "&:hover": { backgroundColor: theme.palette.surface.interface.active },
  "&:last-child": { borderBottom: 0 },
  "&[data-selected='true'], &[data-context-menu-open='true']": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 10%, transparent)`,
  },
  // Mount stagger: each row rises in 30ms after the previous one.
  animation: `${pgRise} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...staggerNthOfType({ step: 30, count: 12 }),
  ...prefersReducedMotionGuard,
})) as typeof Box;

const PrIconCol = styled(Typography)(({ theme }) => ({
  color: theme.palette.success.main,
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
})) as typeof Typography;

const TextCol = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

const Title = styled(Box)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: 1.3,
})) as typeof Box;

const MetaRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 6,
  fontSize: 11.5,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
})) as typeof Box;

// Original mirrors `BranchChip` from src-old: compact rounded chip with a
// branch glyph + repo name, used as the row's primary anchor between title
// and the per-MR metadata.
const RepoChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "1px 7px 1px 6px",
  borderRadius: 8,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
  fontSize: 11,
  fontWeight: 500,
  lineHeight: "16px",
})) as typeof Box;

const Sep = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.informationLight,
  // The original uses a hair-thin middot — we keep a slightly smaller
  // glyph so the row reads as a single sentence rather than dotted chips.
  fontSize: 11,
})) as typeof Typography;

const Number = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.information,
})) as typeof Typography;

const AuthorWrap = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  color: theme.palette.text.information,
})) as typeof Typography;

const Diff = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  gap: 4,
  fontWeight: 500,
  // `success.main`/`error.main` are mode-independent light-mode hues, so on the
  // dark surfaces they landed at 3.18:1 / 2.57:1. `toneText` is the existing
  // mode-aware rule for exactly these diff counters.
  "& .add": { color: toneText(theme, StatusTone.SUCCESS) },
  "& .rem": { color: toneText(theme, StatusTone.ERROR) },
})) as typeof Box;

// Muted placeholder when the provider didn't supply additions/deletions for
// this MR (GitLab's MR-list endpoint, fork PRs without full stats). Keeps
// the row's visual rhythm so the "next" position after `#42 · author ·` is
// never blank — a vanishing chip read as a layout bug, not a missing value.
const DiffUnknown = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.informationLight,
  fontVariantNumeric: "tabular-nums",
})) as typeof Typography;

const CiPill = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flexShrink: 0,
  fontSize: 11.5,
  color: theme.palette.text.primary,
  fontWeight: 500,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
const CiDot = styled("span", { shouldForwardProp: (p) => p !== "state" })<{
  state: CiTone | null;
}>(({ theme, state }) => ({
  width: 7,
  height: 7,
  borderRadius: "50%",
  background:
    state === "passing"
      ? theme.palette.success.main
      : state === "failing"
        ? theme.palette.error.main
        : state === "running"
          ? theme.palette.warning.main
          : theme.palette.text.informationLight,
}));

const CiEmpty = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.informationLight,
  fontSize: 11,
  flexShrink: 0,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed tone prop
const StateBadge = styled("span", { shouldForwardProp: (p) => p !== "tone" })<{
  tone: MrStateTone;
}>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  flexShrink: 0,
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: "2px 8px",
  borderRadius: 100,
  // Draft isn't a backend state — it's an open MR flagged WIP, so it reads as a
  // muted neutral badge rather than borrowing a status hue.
  ...(tone === "draft"
    ? {
        color: theme.palette.text.informationLight,
        backgroundColor: theme.palette.surface.interface.backElevation,
      }
    : toneChip(theme, STATE_TONE[tone])),
}));

export function MrRow({
  pr,
  repoId,
  repoName,
  selected,
  rightMeta = "state",
  onClick,
}: MrRowProps) {
  const state = ciFor(pr.ciStatus);
  const navigate = useNavigate();
  const { t: tPrs } = useTranslation(I18nNamespace.PRS);
  const { t } = useTranslation();

  const isDraft = pr.draft && pr.state === PrState.OPEN;
  const stateTone: MrStateTone = isDraft ? "draft" : pr.state;
  const stateLabel = tPrs(isDraft ? "state.draft" : `state.${pr.state}`);
  const StateIcon = STATE_ICON[stateTone];
  const { position, onContextMenu, onClose } = useContextMenu();
  const brand = brandFromUrl(pr.url);

  // Provider stats first; otherwise derive from the preloaded diff cache
  // (MergeRequests page fires `loadPrDiff` for every visible MR on mount,
  // so by the time most rows hover into view the cache is populated).
  const cachedDiff = useAppSelector((s) =>
    repoId ? s.prs.diff[detailKey(repoId, pr.number)] : undefined,
  );
  const providerStats = pr.additions != null && pr.deletions != null;
  const stats = providerStats
    ? { additions: pr.additions ?? 0, deletions: pr.deletions ?? 0 }
    : cachedDiff
      ? deriveDiffStats(cachedDiff)
      : null;
  const hasChangeStats = stats !== null;

  const openDetail = () => {
    if (repoId) navigate(routeToMr(repoId, pr.number));
  };

  // Open the full detail page with a query param that auto-pops the merge
  // modal — keeps the modal's state ownership on the detail page (where it
  // already lives) while letting the row deep-link straight into the action.
  const openMerge = () => {
    if (repoId) navigate(`${routeToMr(repoId, pr.number)}?merge=open`);
  };

  const onCheckout = async () => {
    if (!isTauri() || !repoId) return;
    try {
      await invoke(TauriCommand.GIT_CHECKOUT, { repoId, branch: pr.sourceBranch });
      toast.success(t("context_menu.checkout_done", { branch: pr.sourceBranch }));
    } catch {
      toast.error(t("context_menu.checkout_failed"));
    }
  };

  const onCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(pr.url);
      toast.success(t("context_menu.copy_url_done"));
    } catch {
      toast.error(t("context_menu.copy_failed"));
    }
  };

  const onCopyTitle = async () => {
    try {
      await navigator.clipboard.writeText(pr.title);
      toast.success(t("context_menu.copy_title_done"));
    } catch {
      toast.error(t("context_menu.copy_failed"));
    }
  };

  const onCopyBranch = async () => {
    try {
      await navigator.clipboard.writeText(pr.sourceBranch);
      toast.success(t("context_menu.copy_branch_done"));
    } catch {
      toast.error(t("context_menu.copy_failed"));
    }
  };

  return (
    <Row
      role="button"
      tabIndex={0}
      data-testid={TEST_IDS.mr.row}
      data-mr-number={pr.number}
      data-mr-state={pr.state}
      data-mr-author={pr.author || undefined}
      data-selected={selected ? "true" : undefined}
      data-context-menu-open={position !== null ? "true" : undefined}
      onClick={() => onClick?.(pr)}
      onContextMenu={onContextMenu}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === KEYBOARD_KEYS.ENTER || e.key === KEYBOARD_KEYS.SPACE) {
          e.preventDefault();
          onClick?.(pr);
        }
      }}
    >
      <PrIconCol component="span" variant="caption">
        <GitMerge size={14} />
      </PrIconCol>
      <TextCol>
        <Title>{pr.title}</Title>
        <MetaRow>
          {repoName && (
            <RepoChip component="span">
              <GitBranch size={10} aria-hidden />
              {repoName}
            </RepoChip>
          )}
          <Number component="span" variant="caption">
            #{pr.number}
          </Number>
          <Sep component="span" variant="caption">
            ·
          </Sep>
          <AuthorWrap component="span" variant="caption">
            <AuthorAvatar name={pr.author} avatarUrl={pr.authorAvatarUrl ?? null} size={14} />
            {pr.author}
          </AuthorWrap>
          <Sep component="span" variant="caption">
            ·
          </Sep>
          {hasChangeStats && stats ? (
            <Diff component="span">
              <Box component="span" className="add">
                +{stats.additions}
              </Box>
              <Box component="span" className="rem">
                −{stats.deletions}
              </Box>
            </Diff>
          ) : (
            <DiffUnknown component="span" variant="caption">
              —
            </DiffUnknown>
          )}
        </MetaRow>
      </TextCol>
      {rightMeta === "state" ? (
        <StateBadge tone={stateTone} data-testid={TEST_IDS.mr.stateBadge} data-mr-state={pr.state}>
          <StateIcon size={11} aria-hidden />
          {stateLabel}
        </StateBadge>
      ) : state ? (
        <CiPill component="span" variant="caption">
          <CiDot state={state} />
          {state}
        </CiPill>
      ) : (
        <CiEmpty component="span" variant="caption">
          —
        </CiEmpty>
      )}
      <ContextMenu
        position={position}
        onClose={onClose}
        data-testid={TEST_IDS.mr.contextMenu}
        sections={[
          {
            items: [
              {
                key: "open-detail",
                label: tPrs("detail.open_full"),
                icon: <Maximize2 size={13} />,
                variant: "primary",
                disabled: !repoId,
                onSelect: openDetail,
              },
            ],
          },
          {
            items: [
              {
                key: "merge",
                label: t("context_menu.merge"),
                icon: <GitMerge size={13} />,
                disabled: !repoId || pr.draft,
                onSelect: openMerge,
              },
              {
                key: "checkout",
                label: t("context_menu.checkout_branch"),
                icon: <Code size={13} />,
                disabled: !repoId,
                onSelect: () => void onCheckout(),
              },
              {
                key: "open-host",
                label: brand
                  ? t("context_menu.open_on_provider", { provider: PROVIDER_NAMES[brand] })
                  : t("context_menu.open_on_host"),
                icon: <ExternalLink size={13} />,
                onSelect: () => void openExternal(pr.url),
              },
            ],
          },
          {
            items: [
              {
                key: "copy-url",
                label: t("context_menu.copy_url"),
                icon: <Copy size={13} />,
                onSelect: () => void onCopyUrl(),
              },
              {
                key: "copy-title",
                label: t("context_menu.copy_title"),
                icon: <Type size={13} />,
                onSelect: () => void onCopyTitle(),
              },
              {
                key: "copy-branch",
                label: t("context_menu.copy_branch"),
                icon: <GitBranch size={13} />,
                onSelect: () => void onCopyBranch(),
              },
            ],
          },
        ]}
      />
    </Row>
  );
}
