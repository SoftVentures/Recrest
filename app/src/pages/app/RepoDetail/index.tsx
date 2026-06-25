import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { AppRoute, PROVIDER_NAMES, PrState, type PullRequest, TauriCommand } from "@recrest/shared";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Folder,
  KeyRound,
  Plus,
  RefreshCw,
  Terminal as TerminalIcon,
} from "lucide-react";
import { toast } from "sonner";

import BrandIcon from "@/assets/icons/BrandIcon";
import IdeIcon from "@/assets/icons/IdeIcon";
import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import Mascot from "@/components/atoms/brand/Mascot";
import ActionFeedbackIcon from "@/components/atoms/feedback/ActionFeedbackIcon";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import MrDetailDrawer from "@/components/molecules/drawers/MrDetailDrawer";
import EmptyState from "@/components/molecules/feedback/EmptyState";
import EditableRepoAvatar from "@/components/molecules/repos/EditableRepoAvatar";
import CiCard from "@/components/organisms/repos/CiCard";
import CommitDialog from "@/components/organisms/repos/CommitDialog";
import CreateBranchDialog from "@/components/organisms/repos/CreateBranchDialog";
import DeploymentsCard from "@/components/organisms/repos/DeploymentsCard";
import RepoGitConfigCard from "@/components/organisms/repos/RepoGitConfigCard";
import RepoSshModal from "@/components/organisms/repos/RepoSshModal";
import RepoStats from "@/components/organisms/repos/RepoStats";
import WorkingCopyPanel from "@/components/organisms/repos/WorkingCopyPanel";
import { useRangeActivity } from "@/hooks/useActivityCommits";
import { useDefaultIde } from "@/hooks/useDefaultIde";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useOpenHost } from "@/hooks/useOpenHost";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri, revealPathInSystem } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
import { useActionFeedback } from "@/lib/utils/useActionFeedback";
import ActivityChart from "@/pages/app/Dashboard/parts/ActivityChart";
import { MrRow } from "@/pages/app/MergeRequests/components/MrRow";
import {
  BackBar,
  BackButton,
  Card,
  CardGrid,
  CardHead,
  CardMeta,
  CardSlot,
  CardTitle,
  Chip,
  CleanState,
  CleanStateSub,
  CleanStateText,
  CommitMain,
  CommitMessage,
  CommitMeta,
  CommitRow,
  CommitSha,
  CommitsList,
  Content,
  Header,
  HeaderActions,
  HeaderBody,
  IconOnlyBtn,
  LangDot,
  LangPill,
  MetaRow,
  MissingRoot,
  PathText,
  PrRowSlot,
  PrScroller,
  PrimaryBtn,
  RemoteUrlText,
  RepoName,
  Root,
  SecondaryBtn,
  TitleRow,
  WorkingCopyScroll,
} from "@/pages/app/RepoDetail/RepoDetail.styles";
import { detailKey, fetchPullRequests, loadPrDiff } from "@/store/actions/prs.actions";
import { loadRepos } from "@/store/actions/repos.actions";
import { bumpRefreshNonce, setSelectedRepo } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

// Shared spring for the card grid: cells animate to their new size/slot when
// the grid reflows (window resize) or the card set changes (provider connects).
const CARD_TRANSITION = {
  type: "spring" as const,
  stiffness: 420,
  damping: 36,
  mass: 0.7,
};

// Stable empty-array reference so the `prs` selector keeps the same value when
// a repo has no cached PRs — an inline `[]` makes react-redux warn about an
// unstable selector result.
const NO_PRS: readonly PullRequest[] = [];

export default function RepoDetailPage() {
  const { t: tAria } = useTranslation(I18nNamespace.ARIA);
  const { t } = useTranslation(I18nNamespace.COMMON);
  const ide = useDefaultIde();
  const ideLabel = ide.name
    ? tAria("actions.open_in_named_ide", { ns: I18nNamespace.COMMON, ide: ide.name })
    : tAria("actions.open_in_ide", { ns: I18nNamespace.COMMON });
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { repoId } = useParams<{ repoId: string }>();
  const repos = useEnrichedRepos();
  const repo = useMemo(() => repos.find((r) => r.id === repoId), [repos, repoId]);

  const prs = useAppSelector((s) => (repoId ? (s.prs.items[repoId] ?? NO_PRS) : NO_PRS));
  const cachedDiffs = useAppSelector((s) => s.prs.diff);
  const diffsLoading = useAppSelector((s) => s.prs.diffLoading);
  const connections = useAppSelector((s) => s.providers.connections);
  const repoProviderConnected = !!repo?.providerId && !!connections[repo.providerId]?.connected;

  const { commits: rangeCommits, byRepo, windowDays, unit } = useRangeActivity();
  const commits = useMemo(
    () => rangeCommits.filter((c) => c.repoId === repoId).slice(0, 8),
    [rangeCommits, repoId],
  );
  const activitySeries = useMemo(
    () => (repoId ? (byRepo.get(repoId) ?? []) : []),
    [byRepo, repoId],
  );

  const pull = useActionFeedback();
  const push = useActionFeedback();
  const fetch = useActionFeedback();
  const busy = pull.state === "loading" || push.state === "loading" || fetch.state === "loading";
  const [selectedPr, setSelectedPr] = useState<PullRequest | null>(null);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [sshOpen, setSshOpen] = useState(false);

  const openHost = useOpenHost(repo?.remoteUrl ?? null);
  const openHostLabel = openHost.provider
    ? tAria("repo.open_on_provider", { provider: PROVIDER_NAMES[openHost.provider] })
    : tAria("repo.open_on_host");

  // Reflect the repo being viewed as the app-wide "selected repo" so cross-page
  // consumers (e.g. the search palette's "Repo" tab) target it — visiting this
  // page via a deep link, not just clicking a repo row, must set it too.
  useEffect(() => {
    if (repoId) dispatch(setSelectedRepo(repoId));
  }, [dispatch, repoId]);

  useEffect(() => {
    if (repoId && repoProviderConnected) void dispatch(fetchPullRequests(repoId));
  }, [dispatch, repoId, repoProviderConnected]);

  // Preload each MR's diff so the row can show real +/− stats even when the
  // provider's PR-list endpoint omits them (GitLab, fork PRs). Mirrors the
  // MergeRequests page; dispatch is idempotent so we guard on cache + in-flight.
  useEffect(() => {
    if (!isTauri() || !repoId || !repoProviderConnected) return;
    for (const pr of prs) {
      const key = detailKey(repoId, pr.number);
      if (!cachedDiffs[key] && !diffsLoading[key]) {
        void dispatch(loadPrDiff({ repoId, prNumber: pr.number }));
      }
    }
  }, [dispatch, repoId, repoProviderConnected, prs, cachedDiffs, diffsLoading]);

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

  const doFetch = async () => {
    if (!repo) return;
    try {
      await fetch.run(() => invoke(TauriCommand.GIT_FETCH, { repoId: repo.id }));
      toast.success(t("detail.toast_fetched", { ns: I18nNamespace.REPOS }));
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message ??
          t("detail.toast_fetch_failed", { ns: I18nNamespace.REPOS }),
      );
    }
  };

  const doPull = async () => {
    if (!repo) return;
    try {
      await pull.run(() => invoke(TauriCommand.GIT_PULL, { repoId: repo.id }));
      toast.success(t("detail.toast_pulled", { ns: I18nNamespace.REPOS }));
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message ??
          t("detail.toast_pull_failed", { ns: I18nNamespace.REPOS }),
      );
    }
  };

  const doPush = async () => {
    if (!repo) return;
    try {
      await push.run(() => invoke(TauriCommand.GIT_PUSH, { repoId: repo.id }));
      toast.success(t("detail.toast_pushed", { ns: I18nNamespace.REPOS }));
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message ??
          t("detail.toast_push_failed", { ns: I18nNamespace.REPOS }),
      );
    }
  };

  if (!repo) {
    return (
      <MissingRoot data-testid={TEST_IDS.repoDetail.page}>
        <EmptyState
          mascot="shrugging"
          title={t("detail.not_found_title", { ns: I18nNamespace.REPOS })}
          description={t("detail.not_found_desc", { ns: I18nNamespace.REPOS, id: repoId })}
        />
      </MissingRoot>
    );
  }

  const totalCommits = activitySeries.reduce((a, b) => a + b, 0);
  const maxBucket = Math.max(1, ...activitySeries);
  const openMrs = prs.filter((p) => p.state === PrState.OPEN);
  const draftMrs = openMrs.filter((p) => p.draft);
  const brand = brandFromUrl(repo.remoteUrl);

  const workingTreeCard = (
    <Card>
      <CardHead>
        <CardTitle>
          {repo.status.dirty
            ? t("status.dirty", { ns: I18nNamespace.REPOS })
            : t("detail.changes_title", { ns: I18nNamespace.REPOS })}
        </CardTitle>
        {repo.status.dirty && (
          <CardMeta>
            {t("detail.working_meta", {
              ns: I18nNamespace.REPOS,
              added: repo.added,
              removed: repo.removed,
              count: repo.filesChanged,
            })}
          </CardMeta>
        )}
      </CardHead>
      {repo.status.dirty ? (
        <WorkingCopyScroll>
          <WorkingCopyPanel repoId={repo.id} onCommitClick={() => setCommitDialogOpen(true)} />
        </WorkingCopyScroll>
      ) : (
        <CleanState>
          <Mascot
            variant="celebrating"
            size={96}
            title={t("detail.nothing_to_commit", { ns: I18nNamespace.REPOS })}
          />
          <CleanStateText>
            {t("detail.nothing_to_commit", { ns: I18nNamespace.REPOS })}
          </CleanStateText>
          <CleanStateSub>
            {t("detail.working_tree_clean", { ns: I18nNamespace.REPOS })}
          </CleanStateSub>
        </CleanState>
      )}
    </Card>
  );

  const mergeRequestsCard = (
    <Card>
      <CardHead>
        <CardTitle>{t("detail.merge_requests", { ns: I18nNamespace.REPOS })}</CardTitle>
        <SecondaryBtn type="button" onClick={() => navigate(AppRoute.MERGE_REQUESTS)}>
          {t("detail.open_mrs_view", { ns: I18nNamespace.REPOS })}
        </SecondaryBtn>
      </CardHead>
      {prs.length === 0 ? (
        <EmptyState
          mascot="snoozing"
          mascotSize={88}
          title={t("detail.no_mrs_title", { ns: I18nNamespace.REPOS })}
          description={t("detail.no_mrs_desc", { ns: I18nNamespace.REPOS })}
        />
      ) : (
        <PrScroller>
          {prs.map((pr) => (
            <PrRowSlot
              key={pr.number}
              data-testid={TEST_IDS.repoDetail.mrRow}
              data-mr-number={pr.number}
              data-mr-state={pr.state}
              data-mr-author={pr.author || undefined}
              onClick={() => setSelectedPr(pr)}
            >
              <MrRow pr={pr} repoId={repo.id} rightMeta="state" onClick={() => setSelectedPr(pr)} />
            </PrRowSlot>
          ))}
        </PrScroller>
      )}
    </Card>
  );

  const gitConfigCard = (
    <Card>
      <CardHead>
        <CardTitle>{t("settings.git.repo_card_title")}</CardTitle>
      </CardHead>
      <RepoGitConfigCard repoId={repo.id} />
    </Card>
  );

  const activityCard = (
    <ActivityChart
      agg={activitySeries}
      maxDay={maxBucket}
      unit={unit}
      title={t("detail.activity_title", { ns: I18nNamespace.REPOS, days: windowDays })}
      meta={t("detail.activity_meta", {
        ns: I18nNamespace.REPOS,
        count: totalCommits,
        peak: maxBucket,
      })}
    />
  );

  const recentCommitsCard = (
    <Card>
      <CardHead>
        <CardTitle>{t("detail.recent_title", { ns: I18nNamespace.REPOS })}</CardTitle>
        <CardMeta>{t("detail.recent_sub", { ns: I18nNamespace.REPOS, days: windowDays })}</CardMeta>
      </CardHead>
      {commits.length === 0 ? (
        <EmptyState
          mascot="snoozing"
          mascotSize={88}
          title={t("detail.no_commits_title", { ns: I18nNamespace.REPOS })}
          description={t("detail.no_commits_desc", { ns: I18nNamespace.REPOS })}
        />
      ) : (
        <CommitsList>
          {commits.map((c) => (
            <CommitRow key={c.sha}>
              <AuthorAvatar name={c.author} email={c.authorEmail ?? undefined} size={20} />
              <CommitMain>
                <CommitMessage>{c.summary}</CommitMessage>
                <CommitMeta>
                  {c.author} · <CommitSha component="span">{c.sha.slice(0, 7)}</CommitSha>
                </CommitMeta>
              </CommitMain>
            </CommitRow>
          ))}
        </CommitsList>
      )}
    </Card>
  );

  // Order cards so similar-height siblings pair up in the two-up grid (the grid
  // stretches each row to equal height). When a provider is connected we have 7
  // cards: tall pair (working + MRs), medium pair (CI + git config), short pair
  // (deployments + activity), and the tall commits list takes a full-width row
  // on its own. Without a provider only the 4 always-present cards remain.
  const cardSlots: { key: string; node: ReactNode }[] = repoProviderConnected
    ? [
        { key: "working", node: workingTreeCard },
        { key: "mr", node: mergeRequestsCard },
        { key: "ci", node: <CiCard repoId={repo.id} /> },
        { key: "gitConfig", node: gitConfigCard },
        { key: "deployments", node: <DeploymentsCard repoId={repo.id} /> },
        { key: "activity", node: activityCard },
        { key: "commits", node: recentCommitsCard },
      ]
    : [
        { key: "working", node: workingTreeCard },
        { key: "commits", node: recentCommitsCard },
        { key: "gitConfig", node: gitConfigCard },
        { key: "activity", node: activityCard },
      ];

  return (
    <Root data-testid={TEST_IDS.repoDetail.page}>
      <BackBar>
        <BackButton type="button" onClick={goBack} data-testid={TEST_IDS.repoDetail.back}>
          <ArrowLeft size={14} />
          <Box component="span">{t("detail.back_to_repos", { ns: I18nNamespace.REPOS })}</Box>
        </BackButton>
      </BackBar>

      <Content>
        <Header>
          <EditableRepoAvatar repo={repo} size={64} radius={14} />
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
                <Chip tone="dirty">
                  {t("detail.uncommitted_count", {
                    ns: I18nNamespace.REPOS,
                    count: repo.filesChanged,
                  })}
                </Chip>
              ) : (
                <Chip tone="clean">{t("detail.clean", { ns: I18nNamespace.REPOS })}</Chip>
              )}
              {repo.remoteUrl && <RemoteUrlText component="span">{repo.remoteUrl}</RemoteUrlText>}
            </MetaRow>
          </HeaderBody>
          <HeaderActions>
            <PrimaryBtn
              type="button"
              onClick={() => void runCmd(TauriCommand.OPEN_IN_IDE, ideLabel)}
            >
              <IdeIcon id={ide.iconId} size={14} color="currentColor" style={{ opacity: 1 }} />
              <Box component="span">{ideLabel}</Box>
            </PrimaryBtn>
            <GeneralTooltip title={tAria("repo.open_terminal")}>
              <IconOnlyBtn
                type="button"
                aria-label={tAria("repo.open_terminal")}
                onClick={() => void runCmd(TauriCommand.OPEN_TERMINAL, "Terminal")}
              >
                <TerminalIcon size={14} />
              </IconOnlyBtn>
            </GeneralTooltip>
            <GeneralTooltip title={tAria("repo.open_folder")}>
              <IconOnlyBtn
                type="button"
                aria-label={tAria("repo.open_folder")}
                onClick={() => void revealPathInSystem(repo.path)}
              >
                <Folder size={14} />
              </IconOnlyBtn>
            </GeneralTooltip>
            <GeneralTooltip
              title={openHost.canOpen ? openHostLabel : tAria("repo.open_on_host_no_remote")}
            >
              {/* span wrapper: a disabled <button> swallows pointer events, so
                  MUI needs an enabled element to anchor the tooltip on. */}
              <Box component="span">
                <IconOnlyBtn
                  type="button"
                  aria-label={openHostLabel}
                  data-testid={TEST_IDS.repoDetail.openHost}
                  disabled={!openHost.canOpen}
                  onClick={openHost.open}
                >
                  {brand ? <BrandIcon slug={brand} size={14} /> : <ExternalLink size={14} />}
                </IconOnlyBtn>
              </Box>
            </GeneralTooltip>
            <GeneralTooltip title={tAria("repo.ssh_key")}>
              <IconOnlyBtn
                type="button"
                aria-label={tAria("repo.ssh_key")}
                data-testid={TEST_IDS.repoDetail.ssh.trigger}
                onClick={() => setSshOpen(true)}
              >
                <KeyRound size={14} />
              </IconOnlyBtn>
            </GeneralTooltip>
            <SecondaryBtn type="button" disabled={busy} onClick={() => void doPull()}>
              <ActionFeedbackIcon state={pull.state} fallback={<ArrowDown size={13} />} size={13} />
              {t("detail.pull", { ns: I18nNamespace.REPOS })}
            </SecondaryBtn>
            <SecondaryBtn type="button" disabled={busy} onClick={() => void doPush()}>
              <ActionFeedbackIcon state={push.state} fallback={<ArrowUp size={13} />} size={13} />
              {t("detail.push", { ns: I18nNamespace.REPOS })}
            </SecondaryBtn>
            <SecondaryBtn type="button" disabled={busy} onClick={() => void doFetch()}>
              <ActionFeedbackIcon
                state={fetch.state}
                fallback={<RefreshCw size={13} />}
                size={13}
              />
              {t("detail.fetch", { ns: I18nNamespace.REPOS })}
            </SecondaryBtn>
            <SecondaryBtn type="button" onClick={() => setBranchDialogOpen(true)}>
              <Plus size={13} />
              {t("detail.branch", { ns: I18nNamespace.REPOS })}
            </SecondaryBtn>
          </HeaderActions>
        </Header>

        <RepoStats
          repo={repo}
          totalCommits={totalCommits}
          maxBucket={maxBucket}
          windowDays={windowDays}
          openMrsCount={repoProviderConnected ? openMrs.length : null}
          draftMrsCount={repoProviderConnected ? draftMrs.length : null}
        />

        <CardGrid>
          {cardSlots.map((slot, i) => (
            <CardSlot
              key={slot.key}
              full={i === cardSlots.length - 1 && cardSlots.length % 2 === 1}
              layout
              transition={CARD_TRANSITION}
            >
              {slot.node}
            </CardSlot>
          ))}
        </CardGrid>
      </Content>

      <MrDetailDrawer
        pr={selectedPr}
        repoId={repo.id}
        repoName={repo.name}
        size="lg"
        onClose={() => setSelectedPr(null)}
        data-testid={TEST_IDS.repoDetail.mrDrawer}
      />

      <CreateBranchDialog
        open={branchDialogOpen}
        repoId={repo.id}
        onClose={() => setBranchDialogOpen(false)}
      />

      <CommitDialog
        open={commitDialogOpen}
        repoId={repo.id}
        onClose={() => setCommitDialogOpen(false)}
      />

      <RepoSshModal
        open={sshOpen}
        repoId={repo.id}
        sshKeyPath={repo.sshKeyPath}
        onClose={() => setSshOpen(false)}
      />
      {openHost.modal}
    </Root>
  );
}
