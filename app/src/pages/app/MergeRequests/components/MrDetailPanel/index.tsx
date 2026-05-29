import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { type PullRequest, TauriCommand, routeToMr } from "@recrest/shared";

import { Code, ExternalLink, GitBranch, GitMerge, Maximize2, X } from "lucide-react";
import { toast } from "sonner";

import BrandIcon from "@/assets/icons/BrandIcon";
import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import MrChip from "@/components/atoms/chips/MrChip";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
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
import { detailKey, loadPrDetail, loadPrDiff } from "@/store/actions/prs.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

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
  const key = detailKey(repoId, pr.number);
  const detail = useAppSelector((s) => s.prs.detail[key]);
  const detailLoading = useAppSelector((s) => s.prs.detailLoading[key] ?? false);
  const diff = useAppSelector((s) => s.prs.diff[key]);

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
      toast.success(`Checked out ${pr.sourceBranch}`);
    } catch {
      toast.error("Checkout failed");
    } finally {
      setBusy(null);
    }
  };

  const onMerge = async () => {
    if (!isTauri()) return;
    setBusy("merge");
    try {
      await invoke(TauriCommand.GIT_MERGE, {
        repoId,
        source: pr.sourceBranch,
        target: pr.targetBranch,
        message: `Merge '${pr.sourceBranch}' into ${pr.targetBranch} (#${pr.number})`,
      });
      toast.success("Merged");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Merge failed: ${msg}`);
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
                    draft
                  </MrChip>
                </>
              )}
            </Subtitle>
          </HeaderTitleStack>
          <HeaderCtrls>
            <GeneralTooltip title="Open on host" placement="top">
              <Box component="span">
                <GeneralIconButton
                  size={IconButtonSize.MD}
                  aria-label={tAria("repo.open_on_host")}
                  onClick={() => void openExternal(pr.url)}
                  icon={brand ? <BrandIcon slug={brand} size={14} /> : <ExternalLink size={14} />}
                />
              </Box>
            </GeneralTooltip>
            {onClose && (
              <GeneralTooltip title="Close" placement="top">
                <Box component="span">
                  <GeneralIconButton
                    size={IconButtonSize.MD}
                    aria-label={tAria("drawer.close")}
                    onClick={onClose}
                    icon={<X size={14} />}
                  />
                </Box>
              </GeneralTooltip>
            )}
          </HeaderCtrls>
        </HeaderTopRow>

        <ActionRow>
          <PrimaryAction
            type="button"
            onClick={() => void onMerge()}
            disabled={busy !== null || pr.draft}
          >
            <GitMerge size={13} />
            <Box component="span">{busy === "merge" ? "Merging…" : "Merge"}</Box>
          </PrimaryAction>
          <GhostBtn type="button" onClick={() => void onCheckout()} disabled={busy !== null}>
            <Code size={13} />
            <Box component="span">{busy === "checkout" ? "…" : "Checkout"}</Box>
          </GhostBtn>
        </ActionRow>
      </Header>

      <InfoStrip>
        <InfoCell>
          <InfoLabel>Branch</InfoLabel>
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
          <InfoLabel>Changes</InfoLabel>
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
    </Panel>
  );
}
