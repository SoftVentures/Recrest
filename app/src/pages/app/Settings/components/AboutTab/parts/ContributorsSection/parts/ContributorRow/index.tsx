import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { ExternalLink } from "lucide-react";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { Contributor } from "@/lib/contributors";
import { useNumberFormat } from "@/lib/utils/format.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

type Medal = "gold" | "silver" | "bronze" | null;

const MEDAL_COLORS: Record<Exclude<Medal, null>, readonly [string, string]> = {
  gold: ["#caa024", "#f4d35e"],
  silver: ["#8d949e", "#c7ccd4"],
  bronze: ["#a96a33", "#cd853f"],
};

function medalFor(rank: number): Medal {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return null;
}

// eslint-disable-next-line no-restricted-syntax -- whole-row trigger; native <button> keeps the click + keyboard activation accessible without nested interactives
const Row = styled("button", { shouldForwardProp: (p) => p !== "leader" })<{ leader: boolean }>(
  ({ theme, leader }) => ({
    display: "flex",
    alignItems: "center",
    gap: pxToRem(13),
    width: "100%",
    padding: pxToRems(12, 16),
    border: "none",
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: leader
      ? theme.palette.mode === "dark"
        ? "rgba(244, 211, 94, 0.06)"
        : "rgba(202, 160, 36, 0.08)"
      : "transparent",
    color: theme.palette.text.primary,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
    transition: "background-color 120ms ease",
    "&:last-of-type": { borderBottom: 0 },
    "&:hover": { backgroundColor: theme.palette.surface.interface.active },
    "&:hover .contributor-open": { opacity: 1 },
    "&:focus-visible": {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: -2,
    },
  }),
);

const Rank = styled(Box, { shouldForwardProp: (p) => p !== "medal" })<{ medal: Medal }>(
  ({ theme, medal }) => ({
    flexShrink: 0,
    width: pxToRem(26),
    height: pxToRem(26),
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    // Chrome glyph in a fixed circle — see the containment policy in theme/scale.
    fontSize: pxToRem(12),
    fontWeight: 700,
    ...(medal
      ? {
          color: "#1a1a1a",
          background: `linear-gradient(135deg, ${MEDAL_COLORS[medal][0]} 0%, ${MEDAL_COLORS[medal][1]} 100%)`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
        }
      : {
          color: theme.palette.text.information,
          backgroundColor: theme.palette.surface.interface.base,
          border: `1px solid ${theme.palette.divider}`,
        }),
  }),
);

const Identity = styled(Box)({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(5),
});

const Login = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(13),
  fontWeight: 600,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const ShareTrack = styled(Box)(({ theme }) => ({
  height: pxToRem(4),
  width: "100%",
  borderRadius: 2,
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  overflow: "hidden",
}));

const ShareFill = styled(Box, { shouldForwardProp: (p) => p !== "pct" && p !== "medal" })<{
  pct: number;
  medal: Medal;
}>(({ theme, pct, medal }) => ({
  height: "100%",
  width: `${pct}%`,
  borderRadius: 2,
  background: medal
    ? `linear-gradient(90deg, ${MEDAL_COLORS[medal][0]} 0%, ${MEDAL_COLORS[medal][1]} 100%)`
    : theme.palette.primary.main,
}));

const Commits = styled(Box)(({ theme }) => ({
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "baseline",
  gap: pxToRem(4),
  padding: pxToRems(3, 9),
  borderRadius: 999,
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
}));

const CommitsCount = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(12.5),
  fontWeight: 700,
  color: theme.palette.text.primary,
  fontVariantNumeric: "tabular-nums",
}));

const CommitsLabel = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(10.5),
  color: theme.palette.text.information,
  textTransform: "lowercase",
}));

const OpenHint = styled(Box)(({ theme }) => ({
  flexShrink: 0,
  display: "inline-flex",
  color: theme.palette.text.information,
  opacity: 0,
  transition: "opacity 120ms ease",
}));

interface ContributorRowProps {
  rank: number;
  contributor: Contributor;
  /** Highest commit count in the list — drives the relative share bar. */
  topContributions: number;
  onOpen: () => void;
}

function ContributorRow({ rank, contributor, topContributions, onOpen }: ContributorRowProps) {
  const { t } = useTranslation();
  const { formatNumber } = useNumberFormat();
  const medal = medalFor(rank);
  // Floor at 4% so even a one-commit contributor shows a visible sliver.
  const pct =
    topContributions > 0
      ? Math.max(4, Math.round((contributor.contributions / topContributions) * 100))
      : 0;

  return (
    <Row
      type="button"
      leader={rank === 1}
      onClick={onOpen}
      aria-label={contributor.login}
      data-testid={TEST_IDS.settings.about.contributorRow(contributor.login)}
    >
      <Rank medal={medal}>{rank}</Rank>
      <AuthorAvatar name={contributor.login} avatarUrl={contributor.avatarUrl} size={32} />
      <Identity>
        <Login>{contributor.login}</Login>
        <ShareTrack>
          <ShareFill pct={pct} medal={medal} />
        </ShareTrack>
      </Identity>
      <Commits>
        <CommitsCount data-testid={TEST_IDS.settings.about.contributorCommits(contributor.login)}>
          {formatNumber(contributor.contributions)}
        </CommitsCount>
        <CommitsLabel>
          {t("settings.about.contributors_commit_unit", { count: contributor.contributions })}
        </CommitsLabel>
      </Commits>
      <OpenHint className="contributor-open">
        <ExternalLink size={pxToRem(13)} />
      </OpenHint>
    </Row>
  );
}

export default ContributorRow;
