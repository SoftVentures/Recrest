import { useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import {
  AppRoute,
  PROVIDER_NAMES,
  PrState,
  type PullRequest,
  TauriCommand,
  type TauriCommandName,
  routeToRepo,
} from "@recrest/shared";

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

import BrandIcon from "@/assets/icons/BrandIcon";
import IdeIcon from "@/assets/icons/IdeIcon";
import GeneralIconButton, {
  IconButtonSize,
  IconButtonVariant,
} from "@/components/atoms/buttons/GeneralIconButton";
import RepoMissingChip from "@/components/atoms/chips/RepoMissingChip";
import ActionFeedbackIcon from "@/components/atoms/feedback/ActionFeedbackIcon";
import DisabledReasonTooltip from "@/components/atoms/feedback/DisabledReasonTooltip";
import AheadBehind from "@/components/atoms/git/AheadBehind";
import EditableRepoAvatar from "@/components/molecules/repos/EditableRepoAvatar";
import CreateBranchDialog from "@/components/organisms/repos/CreateBranchDialog";
import { useActivityCommits } from "@/hooks/useActivityCommits";
import { useDefaultIde } from "@/hooks/useDefaultIde";
import { useOpenHost } from "@/hooks/useOpenHost";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
import { useDateTimeFormat } from "@/lib/utils/datetime.utils";
import { errorMessage } from "@/lib/utils/error.utils";
import { useActionFeedback } from "@/lib/utils/useActionFeedback";
import {
  BranchCard,
  BranchChip,
  BranchQuick,
  BranchText,
  BranchTop,
  CommitAvatar,
  CommitItem,
  CommitMeta,
  CommitSha,
  CommitSubject,
  CommitText,
  CommitsList,
  Count,
  Footer,
  FullView,
  GhostBtn,
  Header,
  HeaderTitleStack,
  HeaderTopRow,
  IconRow,
  LangDot,
  LangPill,
  Pane,
  PrItem,
  PrList,
  PrMeta,
  PrTitle,
  PrimaryIde,
  RepoName,
  RepoPath,
  Section,
  SectionAction,
  SectionBody,
  SectionEmpty,
  SectionHead,
  SectionTitle,
} from "@/pages/app/Repos/components/DetailPane/DetailPane.styles";
import { useAppSelector } from "@/store/hooks";
import { pxToRem } from "@/theme/scale";

// Stable empty-array reference so the `prs` selector keeps the same value when
// a repo has no cached PRs — an inline `[]` makes react-redux warn about an
// unstable selector result.
const NO_PRS: readonly PullRequest[] = [];

export interface DetailPaneProps {
  repo: EnrichedRepo;
  onClose?: () => void;
}

export function DetailPane({ repo, onClose }: DetailPaneProps) {
  const { t: tAria } = useTranslation(I18nNamespace.ARIA);
  const { t } = useTranslation(I18nNamespace.REPOS);
  const dt = useDateTimeFormat();
  const ide = useDefaultIde();
  const ideLabel = ide.name
    ? tAria("actions.open_in_named_ide", { ns: I18nNamespace.COMMON, ide: ide.name })
    : tAria("actions.open_in_ide", { ns: I18nNamespace.COMMON });
  const navigate = useNavigate();
  const prs = useAppSelector((s) => s.prs.items[repo.id] ?? NO_PRS);
  const { commits: rangeCommits } = useActivityCommits();
  const repoCommits = useMemo(
    () => rangeCommits.filter((c) => c.repoId === repo.id).slice(0, 4),
    [rangeCommits, repo.id],
  );
  const openPrs = useMemo(() => prs.filter((p) => p.state === PrState.OPEN), [prs]);
  const brand = brandFromUrl(repo.remoteUrl);
  const openHost = useOpenHost(repo.remoteUrl);
  const pull = useActionFeedback();
  const fetch = useActionFeedback();
  const busy = pull.state === "loading" || fetch.state === "loading";
  const [createOpen, setCreateOpen] = useState(false);
  // Everything that touches the working copy is doomed once the folder is
  // gone. Opening the remote host still works — that lives on the server.
  const missing = !!repo.missing;
  const missingReason = missing ? t("missing.action_unavailable") : null;

  const run = async (cmd: TauriCommandName, label: string) => {
    if (!isTauri()) return;
    try {
      await invoke(cmd, { repoId: repo.id });
    } catch (err) {
      toast.error(t("row_actions.toast_command_failed", { label, message: errorMessage(err) }));
    }
  };

  const runGit = async (
    fb: ReturnType<typeof useActionFeedback>,
    cmd: TauriCommandName,
    successKey: string,
    failKey: string,
  ) => {
    if (!isTauri() || busy) return;
    try {
      await fb.run(() => invoke(cmd, { repoId: repo.id }));
      toast.success(t(successKey));
    } catch {
      toast.error(t(failKey));
    }
  };

  return (
    <Pane data-testid={TEST_IDS.repos.detailPane} data-repo-id={repo.id}>
      <Header>
        <HeaderTopRow>
          <EditableRepoAvatar repo={repo} size={36} radius={8} />
          <HeaderTitleStack>
            <RepoName>{repo.name}</RepoName>
            <RepoPath>{repo.path}</RepoPath>
            {missing && <RepoMissingChip data-testid={TEST_IDS.repos.detailPaneMissingBadge} />}
            {repo.lang && (
              <LangPill component="span" variant="caption">
                <LangDot component="span" variant="caption" />
                <Box component="span">{repo.lang}</Box>
              </LangPill>
            )}
          </HeaderTitleStack>
          {onClose && (
            <GeneralIconButton
              size={IconButtonSize.SM}
              aria-label={tAria("repo.close_detail_pane")}
              onClick={onClose}
              icon={<X size={pxToRem(14)} />}
            />
          )}
        </HeaderTopRow>

        <IconRow>
          <DisabledReasonTooltip reason={missingReason} stretch>
            <PrimaryIde
              type="button"
              disabled={missing}
              onClick={() => void run(TauriCommand.OPEN_IN_IDE, ideLabel)}
            >
              <IdeIcon id={ide.iconId} size={13} color="currentColor" style={{ opacity: 1 }} />
              <Box component="span">{ideLabel}</Box>
            </PrimaryIde>
          </DisabledReasonTooltip>
          <GeneralIconButton
            size={IconButtonSize.MD}
            variant={IconButtonVariant.OUTLINE}
            aria-label={tAria("repo.open_in_terminal")}
            tooltip={missingReason ?? t("detail_pane.open_in_terminal")}
            disabled={missing}
            onClick={() => void run(TauriCommand.OPEN_TERMINAL, t("detail_pane.open_in_terminal"))}
            icon={<TerminalLucide size={pxToRem(13)} />}
          />
          <GeneralIconButton
            size={IconButtonSize.MD}
            variant={IconButtonVariant.OUTLINE}
            aria-label={tAria("repo.open_in_explorer")}
            tooltip={missingReason ?? t("detail_pane.open_in_explorer")}
            disabled={missing}
            onClick={() =>
              void run(TauriCommand.OPEN_IN_EXPLORER, t("detail_pane.open_in_explorer"))
            }
            icon={<Folder size={pxToRem(13)} />}
          />
          {repo.remoteUrl && (
            <GeneralIconButton
              size={IconButtonSize.MD}
              variant={IconButtonVariant.OUTLINE}
              aria-label={tAria("repo.open_remote")}
              tooltip={
                brand
                  ? t("detail_pane.open_on_provider", { provider: PROVIDER_NAMES[brand] })
                  : t("detail_pane.open_on_host")
              }
              onClick={openHost.open}
              icon={
                brand ? <BrandIcon slug={brand} size={13} /> : <ExternalLink size={pxToRem(13)} />
              }
            />
          )}
        </IconRow>
      </Header>

      <BranchCard>
        <BranchTop>
          <BranchChip>
            <GitBranch size={pxToRem(12)} />
            <BranchText component="span">{repo.status.branch ?? "—"}</BranchText>
          </BranchChip>
          <AheadBehind
            ahead={repo.status.ahead}
            behind={repo.status.behind}
            variant="compact"
            hideZero={false}
          />
        </BranchTop>
        <BranchQuick>
          <DisabledReasonTooltip reason={missingReason} stretch>
            <GhostBtn
              type="button"
              disabled={busy || missing}
              onClick={() =>
                void runGit(
                  pull,
                  TauriCommand.GIT_PULL,
                  "detail.toast_pulled",
                  "detail.toast_pull_failed",
                )
              }
            >
              <ActionFeedbackIcon
                state={pull.state}
                fallback={<ArrowDown size={pxToRem(11)} />}
                size={11}
              />{" "}
              {t("detail_pane.pull")}
            </GhostBtn>
          </DisabledReasonTooltip>
          <DisabledReasonTooltip reason={missingReason} stretch>
            <GhostBtn
              type="button"
              disabled={busy || missing}
              onClick={() =>
                void runGit(
                  fetch,
                  TauriCommand.GIT_FETCH,
                  "detail.toast_fetched",
                  "detail.toast_fetch_failed",
                )
              }
            >
              <ActionFeedbackIcon
                state={fetch.state}
                fallback={<RefreshCw size={pxToRem(11)} />}
                size={11}
              />{" "}
              {t("detail_pane.fetch")}
            </GhostBtn>
          </DisabledReasonTooltip>
          <DisabledReasonTooltip reason={missingReason} stretch>
            <GhostBtn type="button" disabled={missing} onClick={() => setCreateOpen(true)}>
              <Plus size={pxToRem(11)} /> {t("detail_pane.branch")}
            </GhostBtn>
          </DisabledReasonTooltip>
        </BranchQuick>
      </BranchCard>

      <Section>
        <SectionHead>
          <SectionTitle>{t("detail_pane.recent_commits")}</SectionTitle>
          <SectionAction type="button" onClick={() => navigate(AppRoute.ACTIVITY)}>
            {t("detail_pane.view_log")}
          </SectionAction>
        </SectionHead>
        <SectionBody>
          {repoCommits.length === 0 ? (
            <SectionEmpty>{t("detail_pane.no_recent_commits")}</SectionEmpty>
          ) : (
            <CommitsList>
              {repoCommits.map((c) => (
                <CommitItem key={c.sha}>
                  <CommitAvatar>{c.author.slice(0, 1).toUpperCase() || "?"}</CommitAvatar>
                  <CommitText>
                    <CommitSubject>{c.summary}</CommitSubject>
                    <CommitMeta>
                      <CommitSha component="span" variant="caption">
                        {c.sha.slice(0, 7)}
                      </CommitSha>
                      <Box component="span">·</Box>
                      <Box component="span">{dt.formatTimestamp(c.timestamp)}</Box>
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
          <SectionTitle>{t("detail_pane.open_merge_requests")}</SectionTitle>
          <Count component="span" variant="caption">
            {openPrs.length}
          </Count>
        </SectionHead>
        <SectionBody>
          {openPrs.length === 0 ? (
            <SectionEmpty>{t("detail_pane.no_open_requests")}</SectionEmpty>
          ) : (
            <PrList>
              {openPrs.slice(0, 4).map((pr) => (
                <PrItem key={pr.id} type="button" onClick={() => void openExternal(pr.url)}>
                  <PrTitle component="span">{pr.title}</PrTitle>
                  <PrMeta component="span" variant="caption">
                    {pr.author}
                  </PrMeta>
                </PrItem>
              ))}
            </PrList>
          )}
        </SectionBody>
      </Section>

      <Footer>
        <FullView type="button" onClick={() => navigate(routeToRepo(repo.id))}>
          <Maximize2 size={pxToRem(13)} /> {t("detail_pane.open_full_view")}
        </FullView>
      </Footer>
      {openHost.modal}
      <CreateBranchDialog open={createOpen} repoId={repo.id} onClose={() => setCreateOpen(false)} />
    </Pane>
  );
}
