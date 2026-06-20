import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { PROVIDER_NAMES, type PullRequest, TauriCommand, routeToMr } from "@recrest/shared";

import { Code, ExternalLink, GitBranch, GitMerge, Maximize2, X } from "lucide-react";
import { toast } from "sonner";

import BrandIcon from "@/assets/icons/BrandIcon";
import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import MrChip from "@/components/atoms/chips/MrChip";
import MergeMrModal, { type MergeMrSubmit } from "@/components/molecules/modals/MergeMrModal";
import { ciFor } from "@/lib/constants/ciStates.constants";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
import { deriveDiffStats } from "@/lib/utils/diffStats.utils";
import {
  ActionRow,
  Arrow,
  Body,
  BranchChip,
  BranchGlyph,
  BranchName,
  CiDot,
  CiPill,
  Diff,
  Empty,
  FileDiff as FileDiffStat,
  FileItem,
  FilePath,
  FilesList,
  Footer,
  FullCta,
  GhostBtn,
  Header,
  HeaderCtrls,
  HeaderTitleStack,
  HeaderTopRow,
  InfoCell,
  InfoLabel,
  InfoStrip,
  InfoValue,
  Muted,
  Panel,
  PrIcon,
  PrimaryAction,
  ReviewerChip,
  ReviewerChips,
  ReviewerState,
  Sep,
  Subtitle,
  Title,
} from "@/pages/app/MergeRequests/components/MrDetailPanel/MrDetailPanel.styles";
import Section from "@/pages/app/MergeRequests/components/MrDetailPanel/parts/Section";
import { detailKey, loadPrDetail, loadPrDiff, mergePr, setPrs } from "@/store/actions/prs.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

// Stable empty-array reference so the `repoPrs` selector keeps the same value
// when a repo has no cached PRs — an inline `[]` makes react-redux warn about
// an unstable selector result.
const NO_PRS: readonly PullRequest[] = [];

export interface MrDetailPanelProps {
  pr: PullRequest;
  repoId: string;
  repoName?: string;
  onClose?: () => void;
}

export function MrDetailPanel({ pr, repoId, repoName, onClose }: MrDetailPanelProps) {
  const { t: tAria } = useTranslation(I18nNamespace.ARIA);
  const { t: tPrs } = useTranslation(I18nNamespace.PRS);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState<null | "checkout" | "merge">(null);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const key = detailKey(repoId, pr.number);
  const detail = useAppSelector((s) => s.prs.detail[key]);
  const detailLoading = useAppSelector((s) => s.prs.detailLoading[key] ?? false);
  const diff = useAppSelector((s) => s.prs.diff[key]);
  const providerId = useAppSelector((s) => s.repos.items[repoId]?.providerId ?? null);
  const repoPrs = useAppSelector((s) => s.prs.items[repoId] ?? NO_PRS);

  useEffect(() => {
    if (isTauri()) {
      void dispatch(loadPrDetail({ repoId, prNumber: pr.number }));
      void dispatch(loadPrDiff({ repoId, prNumber: pr.number }));
    }
  }, [dispatch, repoId, pr.number]);

  const brand = brandFromUrl(pr.url);
  const ci = ciFor(pr.ciStatus);

  const onCheckout = async () => {
    if (!isTauri()) return;
    setBusy("checkout");
    try {
      await invoke(TauriCommand.GIT_CHECKOUT, { repoId, branch: pr.sourceBranch });
      toast.success(tPrs("checkout.success", { branch: pr.sourceBranch }));
    } catch {
      toast.error(tPrs("checkout.failed"));
    } finally {
      setBusy(null);
    }
  };

  // Every merge surface in the app routes through `<MergeMrModal>` — the
  // drawer's primary action just opens the modal, real `git_merge` happens
  // after the user picks a strategy + reviews the commit message.
  const openMergeModal = () => {
    if (pr.draft) return;
    setMergeModalOpen(true);
  };

  const onConfirmMerge = async (data: MergeMrSubmit) => {
    if (!isTauri()) {
      setMergeModalOpen(false);
      toast.success(tPrs("detail.merge_modal.merged_ok"));
      return;
    }
    setBusy("merge");
    try {
      if (providerId) {
        const { result } = await dispatch(
          mergePr({
            repoId,
            prNumber: pr.number,
            input: {
              strategy: data.strategy,
              commitTitle: data.title || null,
              commitMessage: data.description || null,
              deleteSourceBranch: data.deleteSourceBranch,
            },
          }),
        ).unwrap();
        toast.success(tPrs("detail.merge_modal.merged_ok"));
        setMergeModalOpen(false);

        const optimistic = repoPrs.map((p) =>
          p.number === pr.number ? { ...p, state: "merged" as const } : p,
        );
        dispatch(setPrs({ repoId, prs: optimistic }));
        void dispatch(loadPrDetail({ repoId, prNumber: pr.number }));
        if (result.sourceBranchDeleted) {
          toast.success(tPrs("detail.merge_modal.branch_deleted_ok", { source: pr.sourceBranch }));
        }
      } else {
        const message = data.description.trim()
          ? `${data.title}\n\n${data.description}`
          : data.title;
        await invoke(TauriCommand.GIT_MERGE, {
          repoId,
          source: pr.sourceBranch,
          target: pr.targetBranch,
          message,
        });
        toast.success(tPrs("detail.merge_modal.merged_ok"));
        setMergeModalOpen(false);

        if (data.deleteSourceBranch) {
          try {
            await invoke(TauriCommand.GIT_BRANCH_DELETE, {
              repoId,
              branch: pr.sourceBranch,
            });
            toast.success(
              tPrs("detail.merge_modal.branch_deleted_ok", { source: pr.sourceBranch }),
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(
              tPrs("detail.merge_modal.branch_delete_failed", {
                source: pr.sourceBranch,
                message: msg,
              }),
            );
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`${tPrs("detail.merge_modal.merge_failed")}: ${msg}`);
    } finally {
      setBusy(null);
    }
  };

  const onOpenFull = () => {
    onClose?.();
    navigate(routeToMr(repoId, pr.number));
  };

  // Prefer provider-reported additions/deletions (free, instant) but fall
  // back to deriving the totals from the already-loaded diff so the drawer
  // never shows a bare "—" when the diff is on-screen. GitLab's MR-list
  // endpoint, in particular, omits per-MR additions/deletions — without this
  // fallback the changes cell stays blank even after the diff loads.
  const derived = deriveDiffStats(diff);
  const providerAdditions = pr.additions != null && pr.deletions != null ? pr.additions : null;
  const providerDeletions = pr.additions != null && pr.deletions != null ? pr.deletions : null;
  const additions = providerAdditions ?? (diff ? derived.additions : null);
  const deletions = providerDeletions ?? (diff ? derived.deletions : null);
  const hasChangeStats = additions != null && deletions != null && (additions > 0 || deletions > 0);
  const fileCount = diff?.length ?? 0;

  return (
    <Panel data-testid={TEST_IDS.mr.detailPanel}>
      <Header>
        <HeaderTopRow>
          <PrIcon data-draft={pr.draft ? "true" : undefined}>
            <GitMerge size={16} />
          </PrIcon>
          <HeaderTitleStack>
            <Title>{pr.title}</Title>
            <Subtitle>
              <Box component="span">#{pr.number}</Box>
              {repoName && (
                <>
                  <Sep component="span" variant="caption">
                    ·
                  </Sep>
                  <Box component="span">{repoName}</Box>
                </>
              )}
              {pr.draft && (
                <>
                  <Sep component="span" variant="caption">
                    ·
                  </Sep>
                  <MrChip state={pr.state} draft>
                    {tPrs("state.draft")}
                  </MrChip>
                </>
              )}
            </Subtitle>
          </HeaderTitleStack>
          <HeaderCtrls>
            <GeneralIconButton
              size={IconButtonSize.MD}
              aria-label={
                brand
                  ? tAria("repo.open_on_provider", { provider: PROVIDER_NAMES[brand] })
                  : tAria("repo.open_on_host")
              }
              tooltip={
                brand
                  ? tPrs("actions.open_on_provider", { provider: PROVIDER_NAMES[brand] })
                  : tPrs("actions.open_on_host")
              }
              onClick={() => void openExternal(pr.url)}
              icon={brand ? <BrandIcon slug={brand} size={14} /> : <ExternalLink size={14} />}
            />
            {onClose && (
              <GeneralIconButton
                size={IconButtonSize.MD}
                aria-label={tAria("drawer.close")}
                tooltip={tPrs("actions.close")}
                onClick={onClose}
                icon={<X size={14} />}
              />
            )}
          </HeaderCtrls>
        </HeaderTopRow>

        <ActionRow>
          <PrimaryAction
            type="button"
            onClick={openMergeModal}
            disabled={busy !== null || pr.draft}
          >
            <GitMerge size={13} />
            <Box component="span">
              {busy === "merge" ? tPrs("actions.merging") : tPrs("actions.merge")}
            </Box>
          </PrimaryAction>
          <GhostBtn type="button" onClick={() => void onCheckout()} disabled={busy !== null}>
            <Code size={13} />
            <Box component="span">
              {busy === "checkout" ? tPrs("actions.checkout_busy") : tPrs("actions.checkout")}
            </Box>
          </GhostBtn>
        </ActionRow>
      </Header>

      <InfoStrip>
        <InfoCell>
          <InfoLabel>{tPrs("info.branch")}</InfoLabel>
          <InfoValue>
            <BranchChip component="span">
              <BranchGlyph component="span" variant="caption">
                <GitBranch size={10} aria-hidden />
              </BranchGlyph>
              <BranchName component="span" variant="caption">
                {pr.sourceBranch}
              </BranchName>
            </BranchChip>
            <Arrow component="span" variant="caption">
              →
            </Arrow>
            <BranchChip component="span">
              <BranchGlyph component="span" variant="caption">
                <GitBranch size={10} aria-hidden />
              </BranchGlyph>
              <BranchName component="span" variant="caption">
                {pr.targetBranch}
              </BranchName>
            </BranchChip>
          </InfoValue>
        </InfoCell>
        <InfoCell>
          <InfoLabel>{tPrs("info.changes")}</InfoLabel>
          <InfoValue>
            {hasChangeStats ? (
              <Diff component="span">
                <Box component="span" className="add">
                  +{additions}
                </Box>
                <Box component="span" className="rem">
                  −{deletions}
                </Box>
              </Diff>
            ) : (
              <Muted component="span" variant="caption">
                —
              </Muted>
            )}
          </InfoValue>
        </InfoCell>
        <InfoCell>
          <InfoLabel>CI</InfoLabel>
          <InfoValue>
            {ci ? (
              <CiPill component="span" variant="caption">
                <CiDot component="span" data-state={ci} />
                <Box component="span">{ci}</Box>
              </CiPill>
            ) : (
              <Muted component="span" variant="caption">
                —
              </Muted>
            )}
          </InfoValue>
        </InfoCell>
      </InfoStrip>

      <Body>
        <Section
          title={tPrs("detail.section_reviewers")}
          count={detail?.reviewers.length ?? 0}
          loading={detailLoading && !detail}
        >
          {!detail || detail.reviewers.length === 0 ? (
            <Empty>{tPrs("detail.no_reviewers")}</Empty>
          ) : (
            <ReviewerChips>
              {detail.reviewers.map((r) => (
                <ReviewerChip component="span" key={r.login} data-state={r.state}>
                  <AuthorAvatar
                    name={r.name ?? r.login}
                    avatarUrl={r.avatarUrl ?? null}
                    size={14}
                  />
                  <Box component="span">{r.name ?? r.login}</Box>
                  <ReviewerState component="span" variant="caption">
                    {r.state.replace("_", " ")}
                  </ReviewerState>
                </ReviewerChip>
              ))}
            </ReviewerChips>
          )}
        </Section>

        <Section title={tPrs("detail.section_files")} count={fileCount}>
          {!diff ? (
            <Empty>{tPrs("diff.loading")}</Empty>
          ) : diff.length === 0 ? (
            <Empty>{tPrs("detail.no_files")}</Empty>
          ) : (
            <FilesList>
              {diff.map((file) => {
                let adds = 0;
                let dels = 0;
                for (const hunk of file.hunks) {
                  for (const line of hunk.lines) {
                    if (line.kind === "add") adds += 1;
                    else if (line.kind === "remove") dels += 1;
                  }
                }
                return (
                  <FileItem key={file.path}>
                    <FilePath component="span" variant="caption">
                      {file.path}
                    </FilePath>
                    <FileDiffStat component="span">
                      <Box component="span" className="add">
                        +{adds}
                      </Box>
                      <Box component="span" className="rem">
                        −{dels}
                      </Box>
                    </FileDiffStat>
                  </FileItem>
                );
              })}
            </FilesList>
          )}
        </Section>
      </Body>

      <Footer>
        <FullCta type="button" onClick={onOpenFull} data-testid={TEST_IDS.mr.openFullView}>
          <Maximize2 size={13} />
          <Box component="span">{tPrs("detail.open_full")}</Box>
        </FullCta>
      </Footer>

      <MergeMrModal
        open={mergeModalOpen}
        prTitle={pr.title}
        prNumber={pr.number}
        prBody={detail?.body ?? null}
        sourceBranch={pr.sourceBranch}
        targetBranch={pr.targetBranch}
        busy={busy === "merge"}
        providerId={providerId}
        onCancel={() => setMergeModalOpen(false)}
        onConfirm={onConfirmMerge}
      />
    </Panel>
  );
}
