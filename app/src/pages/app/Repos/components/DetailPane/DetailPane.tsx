import { useMemo } from "react";

import { useNavigate } from "react-router-dom";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { AppRoute, TauriCommand, type TauriCommandName, routeToRepo } from "@recrest/shared";

import {
  ArrowDown,
  ExternalLink,
  Folder,
  GitBranch,
  Maximize2,
  Plus,
  RefreshCw,
  Terminal as TerminalLucide,
  X,
} from "lucide-react";
import { toast } from "sonner";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import GeneralBrandIcon from "@/components/atoms/icons/BrandIcon";
import GeneralIdeIcon from "@/components/atoms/icons/IdeIcon";
import GeneralRepoAvatar from "@/components/molecules/avatars/GeneralRepoAvatar";
import { useRecentCommits } from "@/hooks/useRecentCommits";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
import { useAppSelector } from "@/store/hooks";

export interface DetailPaneProps {
  repo: EnrichedRepo;
  onClose?: () => void;
}

export function DetailPane({ repo, onClose }: DetailPaneProps) {
  const navigate = useNavigate();
  const prs = useAppSelector((s) => s.prs.items[repo.id] ?? []);
  const { commits } = useRecentCommits({ repoId: repo.id, days: 30, limit: 4 });
  const repoCommits = commits;
  const openPrs = useMemo(() => prs.filter((p) => p.state === "open"), [prs]);
  const brand = brandFromUrl(repo.remoteUrl);

  const run = async (cmd: TauriCommandName, label: string) => {
    if (!isTauri()) return;
    try {
      await invoke(cmd, { repoId: repo.id });
    } catch {
      toast.error(`${label} failed`);
    }
  };

  return (
    <Pane data-testid="detail-pane" data-repo-id={repo.id}>
      <Header>
        <HeaderTopRow>
          <GeneralRepoAvatar repo={repo} size={36} radius={8} />
          <HeaderTitleStack>
            <RepoName>{repo.name}</RepoName>
            <RepoPath>{repo.path}</RepoPath>
            {repo.lang && (
              <LangPill>
                <LangDot />
                <span>{repo.lang}</span>
              </LangPill>
            )}
          </HeaderTitleStack>
          {onClose && (
            <CloseBtn onClick={onClose} aria-label="Close detail pane">
              <X size={14} />
            </CloseBtn>
          )}
        </HeaderTopRow>

        <IconRow>
          <GeneralTooltip title="Open in VS Code" placement="top">
            <PrimaryIde
              type="button"
              onClick={() => void run(TauriCommand.OPEN_IN_IDE, "Open in IDE")}
            >
              <GeneralIdeIcon id="vscode" size={13} />
              <span>Open in VS Code</span>
            </PrimaryIde>
          </GeneralTooltip>
          <GeneralTooltip title="Open in Terminal" placement="top">
            <IconBtn
              type="button"
              aria-label="Open in Terminal"
              onClick={() => void run(TauriCommand.OPEN_TERMINAL, "Terminal")}
            >
              <TerminalLucide size={13} />
            </IconBtn>
          </GeneralTooltip>
          <GeneralTooltip title="Open in Explorer" placement="top">
            <IconBtn
              type="button"
              aria-label="Open in Explorer"
              onClick={() => void run(TauriCommand.OPEN_IN_EXPLORER, "Explorer")}
            >
              <Folder size={13} />
            </IconBtn>
          </GeneralTooltip>
          {repo.remoteUrl && (
            <GeneralTooltip title="Open on host" placement="top">
              <IconBtn
                type="button"
                aria-label="Open remote"
                onClick={() => void openExternal(repo.remoteUrl!)}
              >
                {brand ? <GeneralBrandIcon slug={brand} size={13} /> : <ExternalLink size={13} />}
              </IconBtn>
            </GeneralTooltip>
          )}
        </IconRow>
      </Header>

      <BranchCard>
        <BranchTop>
          <BranchChip>
            <GitBranch size={12} />
            <BranchText>{repo.status.branch ?? "—"}</BranchText>
          </BranchChip>
          <AheadBehind>
            <span>↑{repo.status.ahead}</span>
            <span>↓{repo.status.behind}</span>
          </AheadBehind>
        </BranchTop>
        <BranchQuick>
          <GhostBtn type="button">
            <ArrowDown size={11} /> Pull
          </GhostBtn>
          <GhostBtn type="button">
            <RefreshCw size={11} /> Fetch
          </GhostBtn>
          <GhostBtn type="button">
            <Plus size={11} /> Branch
          </GhostBtn>
        </BranchQuick>
      </BranchCard>

      <Section>
        <SectionHead>
          <SectionTitle>Recent commits</SectionTitle>
          <SectionAction type="button" onClick={() => navigate(AppRoute.ACTIVITY)}>
            Log →
          </SectionAction>
        </SectionHead>
        <SectionBody>
          {repoCommits.length === 0 ? (
            <SectionEmpty>No recent commits.</SectionEmpty>
          ) : (
            <CommitsList>
              {repoCommits.map((c) => (
                <CommitItem key={c.sha}>
                  <CommitAvatar>{c.author.slice(0, 1).toUpperCase() || "?"}</CommitAvatar>
                  <CommitText>
                    <CommitSubject>{c.summary}</CommitSubject>
                    <CommitMeta>
                      <CommitSha>{c.sha.slice(0, 7)}</CommitSha>
                      <span>·</span>
                      <span>{timeAgo(c.timestamp)}</span>
                    </CommitMeta>
                  </CommitText>
                </CommitItem>
              ))}
            </CommitsList>
          )}
        </SectionBody>
      </Section>

      <Section>
        <SectionHead>
          <SectionTitle>Open merge requests</SectionTitle>
          <Count>{openPrs.length}</Count>
        </SectionHead>
        <SectionBody>
          {openPrs.length === 0 ? (
            <SectionEmpty>No open requests.</SectionEmpty>
          ) : (
            <PrList>
              {openPrs.slice(0, 4).map((pr) => (
                <PrItem key={pr.id} type="button" onClick={() => void openExternal(pr.url)}>
                  <PrTitle>{pr.title}</PrTitle>
                  <PrMeta>{pr.author}</PrMeta>
                </PrItem>
              ))}
            </PrList>
          )}
        </SectionBody>
      </Section>

      <Footer>
        <FullView type="button" onClick={() => navigate(routeToRepo(repo.id))}>
          <Maximize2 size={13} /> Open full view
        </FullView>
      </Footer>
    </Pane>
  );
}

function timeAgo(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "—";
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`;
  return `${Math.round(diff / 86400)} d ago`;
}

const Pane = styled(Box)(({ theme }) => ({
  width: 360,
  flexShrink: 0,
  borderLeft: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  "@media (max-width: 1180px)": {
    width: 320,
  },
}));

const Header = styled(Box)({
  padding: "16px 16px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

const HeaderTopRow = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
});

const HeaderTitleStack = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const RepoName = styled("div")(({ theme }) => ({
  fontSize: 17,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.3px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const RepoPath = styled("div")(({ theme }) => ({
  marginTop: 3,
  fontSize: 11,
  color: theme.palette.text.information,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const LangPill = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  marginTop: 6,
  fontSize: 11,
  color: theme.palette.text.secondary,
}));

const LangDot = styled("span")(({ theme }) => ({
  width: 7,
  height: 7,
  borderRadius: "50%",
  backgroundColor: theme.palette.primary.main,
}));

const CloseBtn = styled("button")(({ theme }) => ({
  width: 24,
  height: 24,
  borderRadius: 8,
  border: 0,
  background: "transparent",
  color: theme.palette.text.information,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    color: theme.palette.text.primary,
  },
}));

const IconRow = styled(Box)({
  display: "flex",
  gap: 5,
  alignItems: "center",
});

const PrimaryIde = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  flex: 1,
  minWidth: 0,
  height: 30,
  padding: "0 10px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.button.ctaHover,
  },
}));

const IconBtn = styled("button")(({ theme }) => ({
  width: 30,
  height: 30,
  flexShrink: 0,
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.secondary,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
    color: theme.palette.text.primary,
  },
}));

const BranchCard = styled(Box)(({ theme }) => ({
  margin: "0 16px 14px",
  padding: "12px 14px",
  backgroundColor:
    theme.palette.mode === "dark"
      ? theme.palette.background.default
      : theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  display: "flex",
  flexDirection: "column",
  gap: 10,
}));

const BranchTop = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
});

const BranchQuick = styled(Box)({
  display: "flex",
  gap: 5,
});

const BranchChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  fontSize: 12.5,
  fontWeight: 500,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  color: theme.palette.text.primary,
  maxWidth: 200,
  minWidth: 0,
}));

const BranchText = styled("span")({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
});

const AheadBehind = styled("div")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));

const GhostBtn = styled("button")(({ theme }) => ({
  flex: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  height: 26,
  padding: "0 8px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 11.5,
  fontWeight: 500,
  cursor: "pointer",
  transition: "background-color 0.12s ease, border-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
}));

const Section = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
  display: "flex",
  flexDirection: "column",
}));

const SectionHead = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  gap: 8,
});

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: 11.5,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.secondary,
})) as typeof Typography;

const SectionAction = styled("button")(({ theme }) => ({
  background: "transparent",
  border: 0,
  fontFamily: "inherit",
  fontSize: 11,
  fontWeight: 600,
  color: theme.palette.primary.main,
  cursor: "pointer",
  padding: 0,
  "&:hover": { textDecoration: "underline" },
}));

const Count = styled("span")(({ theme }) => ({
  fontSize: 11,
  fontWeight: 500,
  color: theme.palette.text.information,
}));

const SectionBody = styled(Box)({
  padding: "0 16px 14px",
});

const SectionEmpty = styled("div")(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.informationLight,
  fontStyle: "italic",
}));

const CommitsList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

const CommitItem = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
});

const CommitAvatar = styled(Box)(({ theme }) => ({
  width: 24,
  height: 24,
  borderRadius: "50%",
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.primary,
  fontSize: 11,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  marginTop: 1,
}));

const CommitText = styled(Box)({ flex: 1, minWidth: 0 });

const CommitSubject = styled("div")(({ theme }) => ({
  fontSize: 12,
  fontWeight: 500,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const CommitMeta = styled("div")(({ theme }) => ({
  fontSize: 10.5,
  color: theme.palette.text.information,
  marginTop: 2,
  display: "flex",
  gap: 5,
  alignItems: "center",
  fontVariantNumeric: "tabular-nums",
}));

const CommitSha = styled("span")(({ theme }) => ({
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  color: theme.palette.text.secondary,
}));

const PrList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

const PrItem = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.backElevation,
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 600,
  color: theme.palette.text.primary,
  cursor: "pointer",
  textAlign: "left",
  transition: "background-color 0.12s ease, border-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
}));

const PrTitle = styled("span")({
  flex: 1,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const PrMeta = styled("span")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
}));

const Footer = styled(Box)(({ theme }) => ({
  marginTop: "auto",
  flex: "0 0 auto",
  padding: "12px 16px 16px",
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
}));

const FullView = styled("button")(({ theme }) => ({
  width: "100%",
  height: 36,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 8,
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.button.ctaHover,
  },
}));
