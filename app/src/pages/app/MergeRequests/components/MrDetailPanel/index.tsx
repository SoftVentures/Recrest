import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { type PullRequest, TauriCommand } from "@recrest/shared";

import { Code, ExternalLink, GitBranch, GitMerge, X } from "lucide-react";
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
  FileDiff,
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
  Meta,
  Muted,
  Panel,
  PrIcon,
  PrimaryAction,
  ReviewerChip,
  ReviewerChips,
  ReviewerState,
  Sep,
  Subtitle,
  TimelineBody,
  TimelineHead,
  TimelineItem,
  TimelineList,
  TimelineType,
  Title,
} from "@/pages/app/MergeRequests/components/MrDetailPanel/MrDetailPanel.styles";
import Section from "@/pages/app/MergeRequests/components/MrDetailPanel/parts/Section";
import { detailKey, loadPrDetail } from "@/store/actions/prs.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export interface MrDetailPanelProps {
  pr: PullRequest;
  repoId: string;
  repoName?: string;
  onClose?: () => void;
}

export function MrDetailPanel({ pr, repoId, repoName, onClose }: MrDetailPanelProps) {
  const { t: tAria } = useTranslation(I18nNamespace.ARIA);
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState<null | "checkout" | "merge">(null);
  const detail = useAppSelector((s) => s.prs.detail[detailKey(repoId, pr.number)]);
  const detailLoading = useAppSelector(
    (s) => s.prs.detailLoading[detailKey(repoId, pr.number)] ?? false,
  );

  useEffect(() => {
    if (isTauri()) {
      void dispatch(loadPrDetail({ repoId, prNumber: pr.number }));
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
            {pr.additions != null && pr.deletions != null ? (
              <Diff component="span">
                <Box component="span" className="add">
                  +{pr.additions}
                </Box>
                <Box component="span" className="rem">
                  −{pr.deletions}
                </Box>
              </Diff>
            ) : (
              "—"
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
          title="Reviewers"
          count={detail?.reviewers.length ?? 0}
          loading={detailLoading && !detail}
        >
          {!detail || detail.reviewers.length === 0 ? (
            <Empty>No reviewers requested</Empty>
          ) : (
            <ReviewerChips>
              {detail.reviewers.map((r) => (
                <ReviewerChip component="span" key={r.login} data-state={r.state}>
                  <AuthorAvatar name={r.name ?? r.login} size={14} />
                  <Box component="span">{r.login}</Box>
                  <ReviewerState component="span" variant="caption">
                    {r.state.replace("_", " ")}
                  </ReviewerState>
                </ReviewerChip>
              ))}
            </ReviewerChips>
          )}
        </Section>

        <Section title="Files" count={detail?.files.length ?? 0} loading={detailLoading && !detail}>
          {!detail ? (
            <Empty>Loading files…</Empty>
          ) : detail.files.length === 0 ? (
            <Empty>No file changes to show</Empty>
          ) : (
            <FilesList>
              {detail.files.slice(0, 30).map((f) => (
                <FileItem key={f.path}>
                  <FilePath component="span" variant="caption">
                    {f.path}
                  </FilePath>
                  <FileDiff component="span">
                    <Box component="span" className="add">
                      +{f.additions}
                    </Box>
                    <Box component="span" className="rem">
                      −{f.deletions}
                    </Box>
                  </FileDiff>
                </FileItem>
              ))}
            </FilesList>
          )}
        </Section>

        <Section
          title="Timeline"
          count={detail?.timeline.length ?? 0}
          loading={detailLoading && !detail}
          defaultOpen={false}
        >
          {!detail || detail.timeline.length === 0 ? (
            <Empty>No timeline events</Empty>
          ) : (
            <TimelineList>
              {detail.timeline.slice(0, 30).map((evt) => (
                <TimelineItem key={evt.id + evt.at}>
                  <TimelineHead>
                    <TimelineType component="span" variant="caption">
                      {evt.type.replace(/_/g, " ")}
                    </TimelineType>
                    {evt.actor && (
                      <Muted component="span" variant="caption">
                        · {evt.actor}
                      </Muted>
                    )}
                    <Muted component="span" variant="caption">
                      · {evt.at.slice(0, 10)}
                    </Muted>
                  </TimelineHead>
                  {evt.body && <TimelineBody>{evt.body}</TimelineBody>}
                </TimelineItem>
              ))}
            </TimelineList>
          )}
        </Section>

        <Section title="Metadata" count={0} defaultOpen={false} hideCount>
          <Meta>
            <Box>
              <Muted component="span" variant="caption">
                Opened
              </Muted>
              : {pr.createdAt.slice(0, 10)}
            </Box>
            <Box>
              <Muted component="span" variant="caption">
                Updated
              </Muted>
              : {pr.updatedAt.slice(0, 10)}
            </Box>
          </Meta>
        </Section>
      </Body>

      <Footer>
        <FullCta type="button" onClick={() => void openExternal(pr.url)}>
          <ExternalLink size={13} />
          <Box component="span">Open on host</Box>
        </FullCta>
      </Footer>
    </Panel>
  );
}
