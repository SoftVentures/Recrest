import { useEffect, useMemo, useRef, useState } from "react";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { AppRoute, type CommentPosition, type PullRequest, TauriCommand } from "@recrest/shared";

import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import MergeMrModal, { type MergeMrSubmit } from "@/components/molecules/modals/MergeMrModal";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { errorMessage } from "@/lib/utils/error.utils";
import { useActionFeedback } from "@/lib/utils/useActionFeedback";
import { BackBar, BackButton, Content, Root } from "@/pages/app/MrDetail/MrDetail.styles";
import MrDescriptionCard from "@/pages/app/MrDetail/parts/MrDescriptionCard";
import MrDetailHeader from "@/pages/app/MrDetail/parts/MrDetailHeader";
import MrDetailLoading from "@/pages/app/MrDetail/parts/MrDetailLoading";
import MrDiffCard from "@/pages/app/MrDetail/parts/MrDiffCard";
import MrMetadataCard from "@/pages/app/MrDetail/parts/MrMetadataCard";
import MrNotFound from "@/pages/app/MrDetail/parts/MrNotFound";
import MrReviewersCard from "@/pages/app/MrDetail/parts/MrReviewersCard";
import MrTimelineCard from "@/pages/app/MrDetail/parts/MrTimelineCard";
import TargetBranchPopover from "@/pages/app/MrDetail/parts/TargetBranchPopover";
import {
  detailKey,
  loadPrDetail,
  loadPrDiff,
  mergePr,
  postPrComment,
  setPrs,
} from "@/store/actions/prs.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { pxToRem } from "@/theme/scale";

// Stable empty-array reference so the `prs` selector returns the same value on
// every render while a repo has no cached PRs — an inline `[]` literal makes
// react-redux warn about an unstable selector result.
const NO_PRS: readonly PullRequest[] = [];

export default function MrDetailPage() {
  const { repoId, prNumber } = useParams<{ repoId: string; prNumber: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t: tPrs } = useTranslation(I18nNamespace.PRS);
  const dispatch = useAppDispatch();

  const checkout = useActionFeedback();
  const merge = useActionFeedback();
  const [mergeModalOpen, setMergeModalOpen] = useState(false);

  // Deep-link from the row context menu: arriving with `?merge=open` opens
  // the merge modal once the PR is loaded. Strip the param afterwards so a
  // reload doesn't re-fire the modal and the URL stays clean.
  useEffect(() => {
    if (searchParams.get("merge") === "open") {
      setMergeModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("merge");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Local-only retarget override until the provider IPC
  // (`update_pr_target_branch`) lands; falls back to the PR's own target.
  const [localTarget, setLocalTarget] = useState<string | null>(null);
  const targetChipRef = useRef<HTMLButtonElement | null>(null);
  const [targetPopoverOpen, setTargetPopoverOpen] = useState(false);

  const parsedNumber = useMemo(() => {
    const n = Number(prNumber);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [prNumber]);

  const repos = useAppSelector((s) => s.repos.items);
  const repoName = repoId ? (repos[repoId]?.name ?? null) : null;
  const prs = useAppSelector((s) => (repoId ? (s.prs.items[repoId] ?? NO_PRS) : NO_PRS));

  const key = repoId && parsedNumber != null ? detailKey(repoId, parsedNumber) : null;
  const detail = useAppSelector((s) => (key ? s.prs.detail[key] : undefined));
  const detailLoading = useAppSelector((s) => (key ? (s.prs.detailLoading[key] ?? false) : false));
  // `detailLoading` only gets a key once `loadPrDetail.pending` ran, so its
  // absence means "the fetch this route owns hasn't started yet" — which is
  // still a loading state, not a miss.
  const detailAttempted = useAppSelector((s) =>
    key ? s.prs.detailLoading[key] !== undefined : false,
  );
  // The list is filled by the merge-requests page, which this route never
  // mounts. On a deep link / hard refresh the detail fetch is the only source,
  // and `PullRequestDetail` already extends `PullRequest`.
  const pr: PullRequest | undefined = useMemo(
    () =>
      parsedNumber != null ? (prs.find((p) => p.number === parsedNumber) ?? detail) : undefined,
    [prs, parsedNumber, detail],
  );

  const diff = useAppSelector((s) => (key ? s.prs.diff[key] : undefined));
  const diffLoading = useAppSelector((s) => (key ? (s.prs.diffLoading[key] ?? false) : false));
  const comments = useAppSelector((s) => (key ? s.prs.comments[key] : undefined));

  // Description / reviewer edits are local-only for now — the patch-PR IPC
  // will replace this state in a follow-up.
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [localDescription, setLocalDescription] = useState<string | null>(null);
  const [addingReviewer, setAddingReviewer] = useState(false);
  const [reviewerDraft, setReviewerDraft] = useState("");
  const [localReviewers, setLocalReviewers] = useState<string[]>([]);

  useEffect(() => {
    if (!isTauri() || !repoId || parsedNumber == null) return;
    void dispatch(loadPrDetail({ repoId, prNumber: parsedNumber }));
    void dispatch(loadPrDiff({ repoId, prNumber: parsedNumber }));
  }, [dispatch, repoId, parsedNumber]);

  useEffect(() => {
    if (pr) document.title = `${pr.title} — Recrest`;
  }, [pr]);

  const goBack = () => navigate(AppRoute.MERGE_REQUESTS);

  if (!repoId || parsedNumber == null) {
    return <MrNotFound prNumber={parsedNumber} onBack={goBack} />;
  }

  if (!pr) {
    // Only the detail fetch can tell us the MR is genuinely gone. Claiming
    // "not found" before it settled makes every deep link / hard refresh flash
    // the empty state — and makes it permanent when the fetch is still queued.
    if (isTauri() && (detailLoading || !detailAttempted)) {
      return <MrDetailLoading onBack={goBack} />;
    }
    return <MrNotFound prNumber={parsedNumber} onBack={goBack} />;
  }

  const effectiveDescription = localDescription ?? detail?.body ?? "";
  const effectiveTarget = localTarget ?? pr.targetBranch;

  const applyTargetBranch = (branch: string) => {
    setLocalTarget(branch);
    setTargetPopoverOpen(false);
    toast.success(tPrs("detail.target_updated"));
  };

  const onCheckout = async () => {
    if (!isTauri()) return;
    try {
      await checkout.run(() =>
        invoke(TauriCommand.GIT_CHECKOUT, { repoId, branch: pr.sourceBranch }),
      );
      toast.success(tPrs("checkout.success", { branch: pr.sourceBranch }));
    } catch {
      toast.error(tPrs("checkout.failed"));
    }
  };

  // The header "Merge" button opens the confirmation modal first — the real
  // git_merge dispatch happens in onConfirmMerge below.
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
    try {
      await merge.run(async () => {
        const providerId = repos[repoId]?.providerId ?? null;
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

          const optimistic = prs.map((p) =>
            p.number === pr.number ? { ...p, state: "merged" as const } : p,
          );
          dispatch(setPrs({ repoId, prs: optimistic }));
          void dispatch(loadPrDetail({ repoId, prNumber: pr.number }));
          if (result.sourceBranchDeleted) {
            toast.success(
              tPrs("detail.merge_modal.branch_deleted_ok", { source: pr.sourceBranch }),
            );
          }
        } else {
          const message = data.description.trim()
            ? `${data.title}\n\n${data.description}`
            : data.title;
          await invoke(TauriCommand.GIT_MERGE, {
            repoId,
            source: pr.sourceBranch,
            target: effectiveTarget,
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
              const msg = errorMessage(err);
              toast.error(
                tPrs("detail.merge_modal.branch_delete_failed", {
                  source: pr.sourceBranch,
                  message: msg,
                }),
              );
            }
          }
        }
      });
    } catch (err) {
      const msg = errorMessage(err);
      toast.error(`${tPrs("detail.merge_modal.merge_failed")}: ${msg}`);
    }
  };

  const onComment = async (path: string, position: CommentPosition, body: string) => {
    try {
      await dispatch(postPrComment({ repoId, prNumber: pr.number, body, path, position })).unwrap();
      toast.success(tPrs("diff.comment_posted"));
    } catch {
      toast.error(tPrs("diff.comment_error"));
    }
  };

  const beginEditDescription = () => {
    setDescriptionDraft(effectiveDescription);
    setEditingDescription(true);
  };
  const saveDescription = () => {
    setLocalDescription(descriptionDraft);
    setEditingDescription(false);
    toast.success(tPrs("detail.wip_note"));
  };

  const addReviewer = () => {
    const name = reviewerDraft.trim();
    if (!name) return;
    if (!localReviewers.includes(name)) {
      setLocalReviewers((prev) => [...prev, name]);
      toast.success(tPrs("detail.wip_note"));
    }
    setReviewerDraft("");
    setAddingReviewer(false);
  };

  // Dedupe by login so the same person never renders twice (which also
  // produces a duplicate-key warning): a locally-added reviewer may already be
  // in the provider list, and provider data can carry repeats.
  const seenReviewers = new Set<string>();
  const allReviewers = [
    ...(detail?.reviewers ?? []),
    ...localReviewers.map((login) => ({
      login,
      name: null,
      avatarUrl: null,
      state: "pending" as const,
    })),
  ].filter((r) => {
    if (seenReviewers.has(r.login)) return false;
    seenReviewers.add(r.login);
    return true;
  });

  return (
    <Root data-testid={TEST_IDS.mr.detailPage}>
      <BackBar>
        <BackButton type="button" onClick={goBack} data-testid={TEST_IDS.mr.backToList}>
          <ArrowLeft size={pxToRem(13)} />
          <Box component="span">{tPrs("detail.back")}</Box>
        </BackButton>
      </BackBar>

      <Content>
        <MrDetailHeader
          pr={pr}
          repoName={repoName}
          effectiveTarget={effectiveTarget}
          checkoutState={checkout.state}
          mergeState={merge.state}
          targetChipRef={targetChipRef}
          onOpenTargetPopover={() => setTargetPopoverOpen(true)}
          onOpenMergeModal={openMergeModal}
          onCheckout={() => void onCheckout()}
          onOpenExternal={() => void openExternal(pr.url)}
        />

        <MrDescriptionCard
          effectiveDescription={effectiveDescription}
          detailLoading={detailLoading}
          hasDetail={detail != null}
          editing={editingDescription}
          draft={descriptionDraft}
          onBeginEdit={beginEditDescription}
          onDraftChange={setDescriptionDraft}
          onSave={saveDescription}
          onCancel={() => setEditingDescription(false)}
        />

        <MrReviewersCard
          reviewers={allReviewers}
          adding={addingReviewer}
          draft={reviewerDraft}
          onBeginAdd={() => setAddingReviewer(true)}
          onDraftChange={setReviewerDraft}
          onSubmit={addReviewer}
          onCancel={() => setAddingReviewer(false)}
        />

        <MrDiffCard
          diff={diff}
          diffLoading={diffLoading}
          comments={comments}
          onComment={onComment}
        />

        <MrTimelineCard events={detail?.timeline} loading={detailLoading} />

        <MrMetadataCard pr={pr} />

        <MergeMrModal
          open={mergeModalOpen}
          prTitle={pr.title}
          prNumber={pr.number}
          prBody={detail?.body ?? null}
          sourceBranch={pr.sourceBranch}
          targetBranch={effectiveTarget}
          busy={merge.state === "loading"}
          providerId={repos[repoId]?.providerId ?? null}
          onCancel={() => setMergeModalOpen(false)}
          onConfirm={onConfirmMerge}
        />

        <TargetBranchPopover
          open={targetPopoverOpen}
          anchorEl={targetChipRef.current}
          repoId={repoId}
          currentTarget={effectiveTarget}
          onCancel={() => setTargetPopoverOpen(false)}
          onApply={applyTargetBranch}
        />
      </Content>
    </Root>
  );
}
