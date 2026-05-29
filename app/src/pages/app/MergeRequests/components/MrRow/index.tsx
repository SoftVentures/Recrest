import type { KeyboardEvent } from "react";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { PullRequest } from "@recrest/shared";

import { GitBranch, GitMerge } from "lucide-react";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgRise,
  prefersReducedMotionGuard,
  staggerNthOfType,
} from "@/lib/animations/pageAnimations";
import { type CiTone, ciFor } from "@/lib/constants/ciStates.constants";
import { KEYBOARD_KEYS } from "@/lib/constants/keyboard.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

export interface MrRowProps {
  pr: PullRequest;
  repoName?: string;
  onClick?: (pr: PullRequest) => void;
}

const Row = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: "pointer",
  "&:hover": { backgroundColor: theme.palette.surface.interface.active },
  "&:last-child": { borderBottom: 0 },
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
  "& .add": { color: theme.palette.success.main },
  "& .rem": { color: theme.palette.error.main },
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

export function MrRow({ pr, repoName, onClick }: MrRowProps) {
  const state = ciFor(pr.ciStatus);
  // Skip the diff chip entirely when the provider couldn't compute the totals
  // (GitLab's MR-list endpoint returns no per-MR additions/deletions). The
  // sub-row used to render "+ −" with the signs but no numbers, which read as
  // a bug — silent omission is the lesser evil.
  const hasChangeStats = pr.additions != null && pr.deletions != null;
  return (
    <Row
      role="button"
      tabIndex={0}
      data-testid={TEST_IDS.mr.row}
      data-mr-number={pr.number}
      onClick={() => onClick?.(pr)}
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
          {hasChangeStats ? (
            <Diff component="span">
              <Box component="span" className="add">
                +{pr.additions}
              </Box>
              <Box component="span" className="rem">
                −{pr.deletions}
              </Box>
            </Diff>
          ) : (
            <DiffUnknown component="span" variant="caption">
              —
            </DiffUnknown>
          )}
        </MetaRow>
      </TextCol>
      {state ? (
        <CiPill component="span" variant="caption">
          <CiDot state={state} />
          {state}
        </CiPill>
      ) : (
        <CiEmpty component="span" variant="caption">
          —
        </CiEmpty>
      )}
    </Row>
  );
}
