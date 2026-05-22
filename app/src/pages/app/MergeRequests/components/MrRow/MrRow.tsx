import type { KeyboardEvent } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { PullRequest } from "@recrest/shared";

import { GitBranch, GitMerge } from "lucide-react";

import GeneralAuthorAvatar from "@/components/molecules/avatars/GeneralAuthorAvatar";
import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgRise,
  prefersReducedMotionGuard,
  staggerNthOfType,
} from "@/lib/animations/pageAnimations";

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
}));

const PrIconCol = styled("span")(({ theme }) => ({
  color: theme.palette.success.main,
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
}));

const TextCol = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const Title = styled("div")(({ theme }) => ({
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: 1.3,
}));

const MetaRow = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 6,
  fontSize: 11.5,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));

// Original mirrors `BranchChip` from src-old: compact rounded chip with a
// branch glyph + repo name, used as the row's primary anchor between title
// and the per-MR metadata.
const RepoChip = styled("span")(({ theme }) => ({
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
}));

const Sep = styled("span")(({ theme }) => ({
  color: theme.palette.text.informationLight,
  // The original uses a hair-thin middot — we keep a slightly smaller
  // glyph so the row reads as a single sentence rather than dotted chips.
  fontSize: 11,
}));

const Number = styled("span")(({ theme }) => ({
  color: theme.palette.text.information,
}));

const AuthorWrap = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  color: theme.palette.text.information,
}));

const Diff = styled("span")(({ theme }) => ({
  display: "inline-flex",
  gap: 4,
  fontWeight: 500,
  "& .add": { color: theme.palette.success.main },
  "& .rem": { color: theme.palette.error.main },
}));

type CiState = "passing" | "failing" | "running" | null;

function ciFor(status: string | null | undefined): CiState {
  if (status === "success") return "passing";
  if (status === "failure") return "failing";
  if (status === "running" || status === "pending") return "running";
  return null;
}

const CiPill = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flexShrink: 0,
  fontSize: 11.5,
  color: theme.palette.text.primary,
  fontWeight: 500,
}));

const CiDot = styled("span", { shouldForwardProp: (p) => p !== "state" })<{
  state: CiState;
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

const CiEmpty = styled("span")(({ theme }) => ({
  color: theme.palette.text.informationLight,
  fontSize: 11,
  flexShrink: 0,
}));

export function MrRow({ pr, repoName, onClick }: MrRowProps) {
  const state = ciFor(pr.ciStatus);
  return (
    <Row
      role="button"
      tabIndex={0}
      data-testid="mr-row"
      data-mr-number={pr.number}
      onClick={() => onClick?.(pr)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(pr);
        }
      }}
    >
      <PrIconCol>
        <GitMerge size={14} />
      </PrIconCol>
      <TextCol>
        <Title>{pr.title}</Title>
        <MetaRow>
          {repoName && (
            <RepoChip>
              <GitBranch size={10} aria-hidden />
              {repoName}
            </RepoChip>
          )}
          <Number>#{pr.number}</Number>
          <Sep>·</Sep>
          <AuthorWrap>
            <GeneralAuthorAvatar name={pr.author} size={14} />
            {pr.author}
          </AuthorWrap>
          <Sep>·</Sep>
          <Diff>
            <span className="add">+{pr.additions}</span>
            <span className="rem">−{pr.deletions}</span>
          </Diff>
        </MetaRow>
      </TextCol>
      {state ? (
        <CiPill>
          <CiDot state={state} />
          {state}
        </CiPill>
      ) : (
        <CiEmpty>—</CiEmpty>
      )}
    </Row>
  );
}
