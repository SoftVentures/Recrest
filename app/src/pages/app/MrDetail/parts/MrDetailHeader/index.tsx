import { type Ref } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { PROVIDER_NAMES, type PullRequest } from "@recrest/shared";

import { Code, ExternalLink, GitBranch, GitMerge } from "lucide-react";

import BrandIcon from "@/assets/icons/BrandIcon";
import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import MrChip from "@/components/atoms/chips/MrChip";
import { ciFor } from "@/lib/constants/ciStates.constants";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
import { useDateTimeFormat } from "@/lib/utils/datetime.utils";
import {
  CiDot,
  CiPill,
} from "@/pages/app/MergeRequests/components/MrDetailPanel/MrDetailPanel.styles";
import {
  AuthorName,
  AuthorRow,
  BranchArrow,
  Chip,
  Header,
  HeaderActions,
  HeaderBody,
  MetaRow,
  PrIcon,
  Sep,
  Subtitle,
  TargetChipBtn,
  Title,
  TitleRow,
} from "@/pages/app/MrDetail/parts/MrDetailHeader/MrDetailHeader.styles";
import { PrimaryBtn, SecondaryBtn } from "@/pages/app/RepoDetail/RepoDetail.styles";

interface Props {
  pr: PullRequest;
  repoName: string | null;
  effectiveTarget: string;
  busy: "checkout" | "merge" | null;
  targetChipRef: Ref<HTMLButtonElement>;
  onOpenTargetPopover: () => void;
  onOpenMergeModal: () => void;
  onCheckout: () => void;
  onOpenExternal: () => void;
}

export default function MrDetailHeader({
  pr,
  repoName,
  effectiveTarget,
  busy,
  targetChipRef,
  onOpenTargetPopover,
  onOpenMergeModal,
  onCheckout,
  onOpenExternal,
}: Props) {
  const { t: tPrs } = useTranslation(I18nNamespace.PRS);
  const brand = brandFromUrl(pr.url);
  const ci = ciFor(pr.ciStatus);
  const hasChangeStats = pr.additions != null && pr.deletions != null;
  const dt = useDateTimeFormat();

  return (
    <Header>
      <PrIcon data-draft={pr.draft ? "true" : undefined}>
        <GitMerge size={22} />
      </PrIcon>
      <HeaderBody>
        <TitleRow>
          <Title>{pr.title}</Title>
          <MrChip state={pr.state} draft={pr.draft}>
            {tPrs(`state.${pr.draft ? "draft" : pr.state}`)}
          </MrChip>
        </TitleRow>
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
        </Subtitle>
        <AuthorRow>
          <AuthorAvatar name={pr.author} avatarUrl={pr.authorAvatarUrl ?? null} size={24} />
          <AuthorName component="span" variant="caption">
            {pr.author}
          </AuthorName>
          <Box component="span">{tPrs("detail.opened_this_mr")}</Box>
          <Sep component="span" variant="caption">
            ·
          </Sep>
          <Box component="span">{dt.formatTimestamp(pr.createdAt)}</Box>
        </AuthorRow>
        <MetaRow>
          <Chip tone="branch">
            <GitBranch size={11} aria-hidden />
            <Box component="span">{pr.sourceBranch}</Box>
          </Chip>
          <BranchArrow component="span" variant="caption">
            →
          </BranchArrow>
          <TargetChipBtn
            ref={targetChipRef}
            type="button"
            onClick={onOpenTargetPopover}
            title={tPrs("detail.target_change")}
            data-testid={TEST_IDS.mr.targetChip}
          >
            <GitBranch size={11} aria-hidden />
            <Box component="span">{effectiveTarget}</Box>
          </TargetChipBtn>
          {hasChangeStats ? (
            <>
              <Chip tone="add">+{pr.additions}</Chip>
              <Chip tone="remove">−{pr.deletions}</Chip>
            </>
          ) : (
            <Chip tone="neutral">—</Chip>
          )}
          {ci && (
            <CiPill component="span" variant="caption">
              <CiDot component="span" data-state={ci} />
              <Box component="span">
                {tPrs("detail.ci_label")} · {ci}
              </Box>
            </CiPill>
          )}
        </MetaRow>
      </HeaderBody>
      <HeaderActions>
        <PrimaryBtn
          type="button"
          onClick={onOpenMergeModal}
          disabled={busy !== null || pr.draft}
          data-testid={TEST_IDS.mr.mergeBtn}
        >
          <GitMerge size={13} />
          <Box component="span">
            {busy === "merge" ? tPrs("actions.merging") : tPrs("actions.merge")}
          </Box>
        </PrimaryBtn>
        <SecondaryBtn type="button" onClick={onCheckout} disabled={busy !== null}>
          <Code size={13} />
          <Box component="span">
            {busy === "checkout" ? tPrs("actions.checkout_busy") : tPrs("actions.checkout")}
          </Box>
        </SecondaryBtn>
        <SecondaryBtn type="button" onClick={onOpenExternal}>
          {brand ? <BrandIcon slug={brand} size={13} /> : <ExternalLink size={13} />}
          <Box component="span">
            {brand
              ? tPrs("actions.open_on_provider", { provider: PROVIDER_NAMES[brand] })
              : tPrs("actions.open_on_host")}
          </Box>
        </SecondaryBtn>
      </HeaderActions>
    </Header>
  );
}
