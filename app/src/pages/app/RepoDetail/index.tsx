import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { AppRoute, PrState, type PullRequest, TauriCommand } from "@recrest/shared";

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

import BrandIcon from "@/assets/icons/BrandIcon";
import IdeIcon from "@/assets/icons/IdeIcon";
import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import Mascot from "@/components/atoms/brand/Mascot";
import MrDetailDrawer from "@/components/molecules/drawers/MrDetailDrawer";
import EmptyState from "@/components/molecules/feedback/EmptyState";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useRecentCommits } from "@/hooks/useRecentCommits";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
import { MrRow } from "@/pages/app/MergeRequests/components/MrRow";
import {
  ActivityAxis,
  ActivityBar,
  ActivityBars,
  BackBar,
  BackButton,
  Card,
  CardHead,
  CardMeta,
  CardTitle,
  Chip,
  CleanState,
  CleanStateSub,
  CleanStateText,
  CommitMain,
  CommitMessage,
  CommitMeta,
  CommitRow,
  CommitsList,
  Content,
  FileKindBadge,
  FileList,
  FileRow,
  Grid2,
  Header,
  HeaderActions,
  HeaderBody,
  IconOnlyBtn,
  KpiCard,
  KpiGrid,
  KpiLabel,
  KpiSub,
  KpiValue,
  LangDot,
  LangPill,
  MetaRow,
  MissingRoot,
  PathText,
  PrRowSlot,
  PrimaryBtn,
  RepoName,
  Root,
  SecondaryBtn,
  TitleRow,
} from "@/pages/app/RepoDetail/RepoDetail.styles";
import { fetchPullRequests } from "@/store/actions/prs.actions";
import { loadRepos } from "@/store/actions/repos.actions";
import { bumpRefreshNonce } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export default function RepoDetailPage() {
  const { t: tAria } = useTranslation(I18nNamespace.ARIA);
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
      <MissingRoot data-testid={TEST_IDS.repoDetail.page}>
        <EmptyState
          mascot="shrugging"
          title="Repository not found"
          description={`No repo with id "${repoId}".`}
        />
      </MissingRoot>
    );
  }

  const totalCommits = repo.activity.reduce((a, b) => a + b, 0);
  const maxBucket = Math.max(1, ...repo.activity);
  const openMrs = prs.filter((p) => p.state === PrState.OPEN);
  const draftMrs = openMrs.filter((p) => p.draft);
  const brand = brandFromUrl(repo.remoteUrl);

  return (
    <Root data-testid={TEST_IDS.repoDetail.page}>
      <BackBar>
        <BackButton type="button" onClick={goBack} data-testid={TEST_IDS.repoDetail.back}>
          <ArrowLeft size={14} />
          <Box component="span">Back to repositories</Box>
        </BackButton>
      </BackBar>

      <Content>
        <Header>
          <RepoAvatar repo={repo} size={64} radius={14} />
          <HeaderBody>
            <TitleRow>
              <RepoName>{repo.name}</RepoName>
              <LangPill component="span">
                <LangDot component="span" />
                <Box component="span">{repo.lang}</Box>
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
              <IdeIcon id="vscode" size={14} />
              <Box component="span">Open in VS Code</Box>
            </PrimaryBtn>
            <IconOnlyBtn
              type="button"
              aria-label={tAria("repo.open_terminal")}
              onClick={() => void runCmd(TauriCommand.OPEN_TERMINAL, "Terminal")}
            >
              <TerminalIcon size={14} />
            </IconOnlyBtn>
            <IconOnlyBtn
              type="button"
              aria-label={tAria("repo.open_folder")}
              onClick={() => void runCmd(TauriCommand.OPEN_IN_EXPLORER, "Explorer")}
            >
              <Folder size={14} />
            </IconOnlyBtn>
            <IconOnlyBtn
              type="button"
              aria-label={tAria("repo.open_on_host")}
              disabled={!repo.remoteUrl}
              onClick={() => repo.remoteUrl && void openExternal(repo.remoteUrl)}
            >
              {brand ? <BrandIcon slug={brand} size={14} /> : <ExternalLink size={14} />}
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
                    aria-label={`${tAria("repo.heatmap_commits", { count: v })}, ${tAria("repo.heatmap_days_ago", { count: 13 - i })}`}
                    data-testid={TEST_IDS.repoDetail.sparkCell}
                    data-index={i}
                  />
                );
              })}
            </ActivityBars>
            <ActivityAxis>
              <Box component="span">14d ago</Box>
              <Box component="span">today</Box>
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
                <EmptyState
                  mascot="snoozing"
                  mascotSize={88}
                  title="No merge requests"
                  description="This repository has no open merge requests."
                />
              ) : (
                <Box sx={{ maxHeight: 320, overflowY: "auto" }}>
                  {prs.map((pr) => (
                    <PrRowSlot
                      key={pr.number}
                      data-testid={TEST_IDS.repoDetail.prRow}
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
              <EmptyState
                mascot="snoozing"
                mascotSize={88}
                title="No recent commits"
                description="Nothing landed in this window."
              />
            ) : (
              <CommitsList>
                {commits.map((c) => (
                  <CommitRow key={c.sha}>
                    <AuthorAvatar name={c.author} email={c.authorEmail ?? undefined} size={20} />
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

      <MrDetailDrawer
        pr={selectedPr}
        repoId={repo.id}
        repoName={repo.name}
        size="lg"
        onClose={() => setSelectedPr(null)}
        data-testid={TEST_IDS.repoDetail.prDrawer}
      />
    </Root>
  );
}
