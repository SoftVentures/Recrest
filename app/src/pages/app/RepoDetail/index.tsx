import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { AppRoute, type PullRequest, TauriCommand } from "@recrest/shared";

import {
  ArrowDown,
  ArrowLeft,
  ExternalLink,
  Folder,
  Plus,
  RefreshCw,
  Terminal as TerminalIcon,
} from "lucide-react";
import { toast } from "sonner";

import Mascot from "@/components/atoms/brand/Mascot";
import GeneralBrandIcon from "@/components/atoms/icons/BrandIcon";
import GeneralIdeIcon from "@/components/atoms/icons/IdeIcon";
import GeneralAuthorAvatar from "@/components/molecules/avatars/GeneralAuthorAvatar";
import GeneralRepoAvatar from "@/components/molecules/avatars/GeneralRepoAvatar";
import GeneralDrawer from "@/components/molecules/drawers/GeneralDrawer";
import EmptyStatePlaceholder from "@/components/molecules/placeholders/EmptyStatePlaceholder";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useRecentCommits } from "@/hooks/useRecentCommits";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
import { MrDetailPanel } from "@/pages/app/MergeRequests/components/MrDetailPanel";
import { MrRow } from "@/pages/app/MergeRequests/components/MrRow";
import { fetchPullRequests } from "@/store/actions/prs.actions";
import { loadRepos } from "@/store/actions/repos.actions";
import { bumpRefreshNonce } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const Root = styled(Box)({
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  // Reserve scrollbar gutter so width is identical whether the page
  // currently overflows or not — keeps page-swap horizontally stable.
  scrollbarGutter: "stable",
});

const BackBar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "12px 24px 0",
  color: theme.palette.text.information,
  fontSize: 12,
}));

const BackButton = styled("button")(({ theme }) => ({
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

const Content = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  padding: theme.spacing(3),
  flex: 1,
  minHeight: 0,
}));

const Header = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: 16,
  padding: 20,
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const HeaderBody = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const TitleRow = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 12,
});

const RepoName = styled(Typography)(({ theme }) => ({
  fontSize: 24,
  fontWeight: 700,
  lineHeight: "30px",
  color: theme.palette.text.primary,
  letterSpacing: "-0.02em",
}));

const LangPill = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 8px",
  borderRadius: 100,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: 11,
  fontWeight: 500,
  color: theme.palette.primary.main,
}));

const LangDot = styled("span")(({ theme }) => ({
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: theme.palette.primary.main,
}));

const PathText = styled(Typography)(({ theme }) => ({
  marginTop: 4,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 11,
  color: theme.palette.text.information,
}));

const MetaRow = styled(Box)({
  marginTop: 10,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
});

const Chip = styled("span", {
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
  fontWeight: tone === "branch" ? 500 : 500,
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

const HeaderActions = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  flexShrink: 0,
});

const PrimaryBtn = styled("button")(({ theme }) => ({
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

const SecondaryBtn = styled("button")(({ theme }) => ({
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

const IconOnlyBtn = styled(SecondaryBtn)({
  width: 32,
  padding: 0,
  justifyContent: "center",
});

const KpiGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
});

const KpiCard = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: 14,
  backgroundColor: theme.palette.background.paper,
  display: "flex",
  flexDirection: "column",
  gap: 4,
}));

const KpiLabel = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: theme.palette.text.information,
}));

const KpiValue = styled(Typography)(({ theme }) => ({
  fontSize: 26,
  lineHeight: "30px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: theme.palette.text.primary,
}));

const KpiSub = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
}));

const Grid2 = styled(Box)({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
});

const Card = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.paper,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 8,
}));

const CardHead = styled(Box)({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 8,
});

const CardTitle = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
}));

const CardMeta = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
}));

const ActivityBars = styled(Box)({
  height: 120,
  display: "flex",
  alignItems: "flex-end",
  gap: 6,
});

const ActivityBar = styled(Box, {
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

const ActivityAxis = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  fontSize: 10,
  color: theme.palette.text.information,
}));

const FileList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  maxHeight: 240,
  overflowY: "auto",
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12,
});

const FileRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "4px 0",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-child": { border: 0 },
}));

const FileKindBadge = styled("span", {
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

const CommitsList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 10,
  maxHeight: 320,
  overflowY: "auto",
});

const CommitRow = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
});

const CommitMain = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const CommitMessage = styled(Typography)(({ theme }) => ({
  fontSize: 12.5,
  fontWeight: 500,
  color: theme.palette.text.primary,
}));

const CommitMeta = styled(Typography)(({ theme }) => ({
  fontSize: 10.5,
  color: theme.palette.text.information,
}));

const PrRowSlot = styled(Box)({
  cursor: "pointer",
});

const CleanState = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  padding: "16px 0 8px",
});

const CleanStateText = styled(Typography)(({ theme }) => ({
  marginTop: 8,
  fontSize: 14,
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

const CleanStateSub = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
}));

const MissingRoot = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
}));

export default function RepoDetailPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { repoId } = useParams<{ repoId: string }>();
  const repos = useEnrichedRepos();
  const repo = useMemo(() => repos.find((r) => r.id === repoId), [repos, repoId]);

  const prs = useAppSelector((s) => (repoId ? (s.prs.items[repoId] ?? []) : []));
  const connections = useAppSelector((s) => s.providers.connections);
  const repoProviderConnected = !!repo?.providerId && !!connections[repo.providerId]?.connected;

  const { commits } = useRecentCommits({ repoId, days: 30, limit: 8 });

  const [busy, setBusy] = useState<null | "pull" | "fetch">(null);
  const [selectedPr, setSelectedPr] = useState<PullRequest | null>(null);

  useEffect(() => {
    if (repoId && repoProviderConnected) void dispatch(fetchPullRequests(repoId));
  }, [dispatch, repoId, repoProviderConnected]);

  useEffect(() => {
    if (repo) document.title = `${repo.name} — Recrest`;
  }, [repo]);

  const goBack = useCallback(() => {
    if (repoId) navigate(`/repos/${repoId}`);
    else navigate(AppRoute.REPOS);
  }, [navigate, repoId]);

  const runCmd = useCallback(
    async (cmd: import("@recrest/shared").TauriCommandName, label: string) => {
      if (!isTauri() || !repo) return;
      try {
        await invoke(cmd, { repoId: repo.id });
      } catch (err) {
        toast.error((err as { message?: string })?.message ?? `${label} failed`);
      }
    },
    [repo],
  );

  const doFetch = useCallback(async () => {
    if (!repo) return;
    setBusy("fetch");
    try {
      await invoke(TauriCommand.GIT_FETCH, { repoId: repo.id });
      toast.success("Fetched");
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Fetch failed");
    } finally {
      setBusy(null);
    }
  }, [dispatch, repo]);

  const doPull = useCallback(async () => {
    if (!repo) return;
    setBusy("pull");
    try {
      await invoke(TauriCommand.GIT_PULL, { repoId: repo.id });
      toast.success("Pulled");
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Pull failed");
    } finally {
      setBusy(null);
    }
  }, [dispatch, repo]);

  if (!repo) {
    return (
      <MissingRoot data-testid="repo-detail-page">
        <EmptyStatePlaceholder
          title="Repository not found"
          description={`No repo with id "${repoId}".`}
        />
      </MissingRoot>
    );
  }

  const totalCommits = repo.activity.reduce((a, b) => a + b, 0);
  const maxBucket = Math.max(1, ...repo.activity);
  const openMrs = prs.filter((p) => p.state === "open");
  const draftMrs = openMrs.filter((p) => p.draft);
  const brand = brandFromUrl(repo.remoteUrl);

  return (
    <Root data-testid="repo-detail-page">
      <BackBar>
        <BackButton type="button" onClick={goBack} data-testid="repo-detail-back">
          <ArrowLeft size={14} />
          <span>Back to repositories</span>
        </BackButton>
      </BackBar>

      <Content>
        <Header>
          <GeneralRepoAvatar repo={repo} size={64} radius={14} />
          <HeaderBody>
            <TitleRow>
              <RepoName>{repo.name}</RepoName>
              <LangPill>
                <LangDot />
                <span>{repo.lang}</span>
              </LangPill>
            </TitleRow>
            <PathText>{repo.path}</PathText>
            <MetaRow>
              <Chip tone="branch">⎇ {repo.status.branch ?? "—"}</Chip>
              {repo.status.ahead > 0 && <Chip tone="ahead">↑{repo.status.ahead}</Chip>}
              {repo.status.behind > 0 && <Chip tone="behind">↓{repo.status.behind}</Chip>}
              {repo.status.dirty ? (
                <Chip tone="dirty">{repo.filesChanged} uncommitted</Chip>
              ) : (
                <Chip tone="clean">clean</Chip>
              )}
              {repo.remoteUrl && (
                <Box
                  component="span"
                  sx={{
                    fontFamily:
                      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                    fontSize: 11,
                    color: "text.secondary",
                  }}
                >
                  {repo.remoteUrl}
                </Box>
              )}
            </MetaRow>
          </HeaderBody>
          <HeaderActions>
            <PrimaryBtn type="button" onClick={() => void runCmd(TauriCommand.OPEN_IN_IDE, "IDE")}>
              <GeneralIdeIcon id="vscode" size={14} />
              <span>Open in VS Code</span>
            </PrimaryBtn>
            <IconOnlyBtn
              type="button"
              aria-label="Open terminal"
              onClick={() => void runCmd(TauriCommand.OPEN_TERMINAL, "Terminal")}
            >
              <TerminalIcon size={14} />
            </IconOnlyBtn>
            <IconOnlyBtn
              type="button"
              aria-label="Open folder"
              onClick={() => void runCmd(TauriCommand.OPEN_IN_EXPLORER, "Explorer")}
            >
              <Folder size={14} />
            </IconOnlyBtn>
            <IconOnlyBtn
              type="button"
              aria-label="Open on host"
              disabled={!repo.remoteUrl}
              onClick={() => repo.remoteUrl && void openExternal(repo.remoteUrl)}
            >
              {brand ? <GeneralBrandIcon slug={brand} size={14} /> : <ExternalLink size={14} />}
            </IconOnlyBtn>
            <SecondaryBtn type="button" disabled={busy !== null} onClick={() => void doPull()}>
              <ArrowDown size={13} />
              {busy === "pull" ? "Pulling…" : "Pull"}
            </SecondaryBtn>
            <SecondaryBtn type="button" disabled={busy !== null} onClick={() => void doFetch()}>
              <RefreshCw size={13} />
              {busy === "fetch" ? "Fetching…" : "Fetch"}
            </SecondaryBtn>
            <SecondaryBtn type="button" disabled>
              <Plus size={13} />
              Branch
            </SecondaryBtn>
          </HeaderActions>
        </Header>

        <KpiGrid>
          <KpiCard>
            <KpiLabel>Ahead / Behind</KpiLabel>
            <KpiValue>
              ↑{repo.status.ahead} / ↓{repo.status.behind}
            </KpiValue>
            <KpiSub>across origin</KpiSub>
          </KpiCard>
          <KpiCard>
            <KpiLabel>Changed lines</KpiLabel>
            <KpiValue>
              <Box component="span" sx={{ color: "success.dark" }}>
                +{repo.added}
              </Box>{" "}
              <Box component="span" sx={{ color: "error.dark" }}>
                −{repo.removed}
              </Box>
            </KpiValue>
            <KpiSub>
              {repo.filesChanged} file{repo.filesChanged === 1 ? "" : "s"}
            </KpiSub>
          </KpiCard>
          <KpiCard>
            <KpiLabel>Commits · last 14 days</KpiLabel>
            <KpiValue>{totalCommits}</KpiValue>
            <KpiSub>peak {maxBucket}/day</KpiSub>
          </KpiCard>
          {repoProviderConnected ? (
            <KpiCard>
              <KpiLabel>Open merge requests</KpiLabel>
              <KpiValue>{openMrs.length}</KpiValue>
              <KpiSub>{draftMrs.length} draft</KpiSub>
            </KpiCard>
          ) : (
            <KpiCard>
              <KpiLabel>Last commit</KpiLabel>
              <KpiValue>{repo.status.lastCommit ? "—" : "—"}</KpiValue>
              <KpiSub>{repo.status.lastCommit?.author ?? "no provider connected"}</KpiSub>
            </KpiCard>
          )}
        </KpiGrid>

        <Grid2>
          <Card>
            <CardHead>
              <CardTitle>Activity — 14 days</CardTitle>
              <CardMeta>
                {totalCommits} commit{totalCommits === 1 ? "" : "s"} · peak {maxBucket}
              </CardMeta>
            </CardHead>
            <ActivityBars>
              {repo.activity.map((v, i) => {
                const heightPct = v > 0 ? Math.max(6, (v / maxBucket) * 100) : 4;
                return (
                  <ActivityBar
                    key={i}
                    heightPct={heightPct}
                    hot={v >= maxBucket * 0.66}
                    aria-label={`${v} commit${v === 1 ? "" : "s"}, ${13 - i} day${13 - i === 1 ? "" : "s"} ago`}
                    data-testid="repo-detail-spark-cell"
                    data-index={i}
                  />
                );
              })}
            </ActivityBars>
            <ActivityAxis>
              <span>14d ago</span>
              <span>today</span>
            </ActivityAxis>
          </Card>

          <Card>
            <CardHead>
              <CardTitle>{repo.status.dirty ? "Uncommitted changes" : "Working tree"}</CardTitle>
              {repo.status.dirty && (
                <CardMeta>
                  +{repo.added} −{repo.removed} · {repo.filesChanged} file
                  {repo.filesChanged === 1 ? "" : "s"}
                </CardMeta>
              )}
            </CardHead>
            {repo.status.dirty ? (
              <FileList>
                {repo.status.changedFiles.map((f) => (
                  <FileRow key={f.path}>
                    <Box
                      component="span"
                      sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {f.path}
                    </Box>
                    <FileKindBadge kind={f.kind}>{f.kind}</FileKindBadge>
                  </FileRow>
                ))}
                {repo.status.changedFilesTruncated && (
                  <CommitMeta sx={{ textAlign: "center", paddingTop: 1 }}>
                    …more files truncated
                  </CommitMeta>
                )}
              </FileList>
            ) : (
              <CleanState>
                <Mascot variant="celebrating" size={96} title="Nothing to commit" />
                <CleanStateText>Nothing to commit.</CleanStateText>
                <CleanStateSub>Working tree is clean.</CleanStateSub>
              </CleanState>
            )}
          </Card>
        </Grid2>

        <Grid2>
          {repoProviderConnected && (
            <Card>
              <CardHead>
                <CardTitle>Merge requests</CardTitle>
                <SecondaryBtn type="button" onClick={() => navigate(AppRoute.MERGE_REQUESTS)}>
                  Open MRs view
                </SecondaryBtn>
              </CardHead>
              {prs.length === 0 ? (
                <EmptyStatePlaceholder
                  title="No merge requests"
                  description="This repository has no open merge requests."
                />
              ) : (
                <Box sx={{ maxHeight: 320, overflowY: "auto" }}>
                  {prs.map((pr) => (
                    <PrRowSlot
                      key={pr.number}
                      data-testid="repo-detail-pr-row"
                      onClick={() => setSelectedPr(pr)}
                    >
                      <MrRow pr={pr} onClick={() => setSelectedPr(pr)} />
                    </PrRowSlot>
                  ))}
                </Box>
              )}
            </Card>
          )}

          <Card>
            <CardHead>
              <CardTitle>Recent commits</CardTitle>
              <CardMeta>last 30 days</CardMeta>
            </CardHead>
            {commits.length === 0 ? (
              <EmptyStatePlaceholder
                title="No recent commits"
                description="Nothing landed in this window."
              />
            ) : (
              <CommitsList>
                {commits.map((c) => (
                  <CommitRow key={c.sha}>
                    <GeneralAuthorAvatar
                      name={c.author}
                      email={c.authorEmail ?? undefined}
                      size={20}
                    />
                    <CommitMain>
                      <CommitMessage>{c.summary}</CommitMessage>
                      <CommitMeta>
                        {c.author} ·{" "}
                        <Box
                          component="span"
                          sx={{
                            fontFamily:
                              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                          }}
                        >
                          {c.sha.slice(0, 7)}
                        </Box>
                      </CommitMeta>
                    </CommitMain>
                  </CommitRow>
                ))}
              </CommitsList>
            )}
          </Card>
        </Grid2>
      </Content>

      <GeneralDrawer
        open={!!selectedPr}
        onClose={() => setSelectedPr(null)}
        size="lg"
        data-testid="repo-detail-pr-drawer"
      >
        {selectedPr && (
          <MrDetailPanel
            pr={selectedPr}
            repoId={repo.id}
            repoName={repo.name}
            onClose={() => setSelectedPr(null)}
          />
        )}
      </GeneralDrawer>
    </Root>
  );
}
