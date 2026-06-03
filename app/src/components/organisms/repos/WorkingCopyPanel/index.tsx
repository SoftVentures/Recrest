import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import {
  ChangedFileStatus,
  type DiscardResult,
  type RepositoryId,
  type StashEntry,
} from "@recrest/shared";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import ConfirmationModal from "@/components/molecules/modals/ConfirmationModal";
import {
  AlsoUnstagedTag,
  EmptyState,
  KindBadge,
  Root,
  Row,
  RowActions,
  RowPath,
  SectionActions,
  SectionBox,
  SectionCount,
  SectionHead,
  SectionTitle,
  StashIndex,
  StashList,
  StashMessage,
  StashRow,
  Toolbar,
  ToolbarLeft,
  ToolbarRight,
} from "@/components/organisms/repos/WorkingCopyPanel/WorkingCopyPanel.styles";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import {
  gitDiscard,
  gitStage,
  gitStash,
  gitStashDrop,
  gitStashList,
  gitStashPop,
  gitUnstage,
} from "@/store/actions/repos.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export interface WorkingCopyPanelProps {
  repoId: RepositoryId;
  /** Optional commit hook — when provided, the panel renders a "Commit"
   *  button that calls it. Wired by Task 6 (CommitDialog). */
  onCommitClick?: () => void;
}

function WorkingCopyPanel({ repoId, onCommitClick }: WorkingCopyPanelProps) {
  const { t } = useTranslation(I18nNamespace.REPOS);
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.repos.items[repoId]?.status);

  const [stash, setStash] = useState<StashEntry[]>([]);
  const [confirmDiscard, setConfirmDiscard] = useState<string[] | null>(null);
  const [confirmStashDrop, setConfirmStashDrop] = useState<number | null>(null);
  const [confirmDiscardUnstaged, setConfirmDiscardUnstaged] = useState<string[] | null>(null);

  const refreshStash = useCallback(async () => {
    try {
      const out = await dispatch(gitStashList(repoId)).unwrap();
      // Defensive: a stub or older backend that returns null/undefined for the
      // list must not crash the panel — treat absence as "no stash entries".
      setStash(Array.isArray(out.entries) ? out.entries : []);
    } catch {
      // stash list is best-effort; the panel is still usable without it
    }
  }, [dispatch, repoId]);

  useEffect(() => {
    void refreshStash();
  }, [refreshStash]);

  const { staged, unstaged } = useMemo(() => {
    const files = status?.changedFiles ?? [];
    const staged = files.filter((f) => f.status === ChangedFileStatus.STAGED);
    // Match `git status` semantics: a file that's staged AND has further
    // worktree changes (e.g. `git add foo` then `yarn format` rewrote foo)
    // appears in BOTH sections. Otherwise the Unstaged section looks empty
    // and the user has no obvious way to notice / re-stage the diff.
    const unstaged = files.filter(
      (f) =>
        f.status === ChangedFileStatus.UNSTAGED ||
        f.status === ChangedFileStatus.UNTRACKED ||
        f.status === ChangedFileStatus.CONFLICTED ||
        (f.status === ChangedFileStatus.STAGED && f.hasUnstagedChanges),
    );
    return { staged, unstaged };
  }, [status]);

  const handleStage = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return;
      try {
        await dispatch(gitStage({ repoId, paths })).unwrap();
      } catch (err) {
        toast.error(`${t("working_copy.stage_error")}: ${String((err as Error)?.message ?? err)}`);
      }
    },
    [dispatch, repoId, t],
  );

  const handleUnstage = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return;
      try {
        await dispatch(gitUnstage({ repoId, paths })).unwrap();
      } catch (err) {
        toast.error(
          `${t("working_copy.unstage_error")}: ${String((err as Error)?.message ?? err)}`,
        );
      }
    },
    [dispatch, repoId, t],
  );

  const runDiscard = useCallback(
    async (paths: string[], force: boolean): Promise<DiscardResult | null> => {
      if (paths.length === 0) return null;
      try {
        const out = await dispatch(gitDiscard({ repoId, paths, force })).unwrap();
        return out.result;
      } catch (err) {
        toast.error(
          `${t("working_copy.discard_error")}: ${String((err as Error)?.message ?? err)}`,
        );
        return null;
      }
    },
    [dispatch, repoId, t],
  );

  const handleDiscard = useCallback(
    async (paths: string[]) => {
      const result = await runDiscard(paths, false);
      if (result && result.requiresConfirmation.length > 0) {
        setConfirmDiscard(result.requiresConfirmation);
      }
    },
    [runDiscard],
  );

  const handleStashSave = useCallback(async () => {
    try {
      await dispatch(gitStash({ repoId, message: null })).unwrap();
      await refreshStash();
    } catch (err) {
      toast.error(
        `${t("working_copy.stash_invoke_error")}: ${String((err as Error)?.message ?? err)}`,
      );
    }
  }, [dispatch, refreshStash, repoId, t]);

  const handleStashPop = useCallback(
    async (index: number) => {
      try {
        await dispatch(gitStashPop({ repoId, index })).unwrap();
        await refreshStash();
      } catch (err) {
        toast.error(
          `${t("working_copy.stash_pop_error")}: ${String((err as Error)?.message ?? err)}`,
        );
      }
    },
    [dispatch, refreshStash, repoId, t],
  );

  const handleStashDrop = useCallback(
    async (index: number) => {
      try {
        await dispatch(gitStashDrop({ repoId, index })).unwrap();
        await refreshStash();
      } catch (err) {
        toast.error(
          `${t("working_copy.stash_drop_error")}: ${String((err as Error)?.message ?? err)}`,
        );
      }
    },
    [dispatch, refreshStash, repoId, t],
  );

  if (!status) return null;

  const hasAny = staged.length > 0 || unstaged.length > 0;
  const allUnstagedPaths = unstaged.map((f) => f.path);
  const allStagedPaths = staged.map((f) => f.path);

  return (
    <Root data-testid={TEST_IDS.workingCopy.root}>
      <Toolbar>
        <ToolbarLeft>
          <GeneralButton
            size="sm"
            variant="ghost"
            onClick={() => void handleStashSave()}
            disabled={!hasAny}
            data-testid={TEST_IDS.workingCopy.stashSave}
          >
            {t("working_copy.stash_save")}
          </GeneralButton>
        </ToolbarLeft>
        {onCommitClick && (
          <ToolbarRight>
            <GeneralButton
              size="sm"
              onClick={onCommitClick}
              disabled={staged.length === 0}
              data-testid={TEST_IDS.workingCopy.commit}
            >
              {t("working_copy.commit")}
            </GeneralButton>
          </ToolbarRight>
        )}
      </Toolbar>

      <SectionBox data-testid={TEST_IDS.workingCopy.section("staged")}>
        <SectionHead>
          <SectionTitle>{t("working_copy.section_staged")}</SectionTitle>
          <SectionCount>{staged.length}</SectionCount>
          <SectionActions>
            <GeneralButton
              size="sm"
              variant="ghost"
              onClick={() => void handleUnstage(allStagedPaths)}
              disabled={staged.length === 0}
              data-testid={TEST_IDS.workingCopy.unstageAll}
            >
              {t("working_copy.unstage_all")}
            </GeneralButton>
          </SectionActions>
        </SectionHead>
        {staged.length === 0 ? (
          <EmptyState>—</EmptyState>
        ) : (
          staged.map((f) => (
            <Row key={f.path} data-testid={TEST_IDS.workingCopy.row("staged", f.path)}>
              <RowPath component="span">
                <KindBadge kind={f.kind}>{f.kind}</KindBadge>
                <Box component="span">{f.path}</Box>
                {f.hasUnstagedChanges && (
                  <GeneralTooltip title={t("working_copy.also_unstaged_hint")} placement="top">
                    <AlsoUnstagedTag component="span">
                      {t("working_copy.also_unstaged")}
                    </AlsoUnstagedTag>
                  </GeneralTooltip>
                )}
              </RowPath>
              <RowActions data-row-actions>
                <GeneralButton
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleUnstage([f.path])}
                  data-testid={TEST_IDS.workingCopy.unstageRow(f.path)}
                >
                  {t("working_copy.unstage")}
                </GeneralButton>
              </RowActions>
            </Row>
          ))
        )}
      </SectionBox>

      <SectionBox data-testid={TEST_IDS.workingCopy.section("unstaged")}>
        <SectionHead>
          <SectionTitle>{t("working_copy.section_unstaged")}</SectionTitle>
          <SectionCount>{unstaged.length}</SectionCount>
          <SectionActions>
            <GeneralButton
              size="sm"
              variant="ghost"
              onClick={() => void handleStage(allUnstagedPaths)}
              disabled={unstaged.length === 0}
              data-testid={TEST_IDS.workingCopy.stageAll}
            >
              {t("working_copy.stage_all")}
            </GeneralButton>
            <GeneralButton
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDiscardUnstaged(allUnstagedPaths)}
              disabled={unstaged.length === 0}
              data-testid={TEST_IDS.workingCopy.discardAll}
            >
              {t("working_copy.discard_all")}
            </GeneralButton>
          </SectionActions>
        </SectionHead>
        {unstaged.length === 0 ? (
          <EmptyState>—</EmptyState>
        ) : (
          unstaged.map((f) => (
            <Row key={f.path} data-testid={TEST_IDS.workingCopy.row("unstaged", f.path)}>
              <RowPath component="span">
                <KindBadge kind={f.kind}>{f.kind}</KindBadge>
                <Box component="span">{f.path}</Box>
              </RowPath>
              <RowActions data-row-actions>
                <GeneralButton
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleStage([f.path])}
                  data-testid={TEST_IDS.workingCopy.stageRow(f.path)}
                >
                  {t("working_copy.stage")}
                </GeneralButton>
                <GeneralButton
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleDiscard([f.path])}
                  data-testid={TEST_IDS.workingCopy.discardRow(f.path)}
                >
                  {t("working_copy.discard")}
                </GeneralButton>
              </RowActions>
            </Row>
          ))
        )}
      </SectionBox>

      <SectionBox data-testid={TEST_IDS.workingCopy.stashList}>
        <SectionHead>
          <SectionTitle>{t("working_copy.stash_title")}</SectionTitle>
          <SectionCount>{stash.length}</SectionCount>
        </SectionHead>
        {stash.length === 0 ? (
          <EmptyState>{t("working_copy.stash_empty")}</EmptyState>
        ) : (
          <StashList>
            {stash.map((s) => (
              <StashRow key={s.oid} data-testid={TEST_IDS.workingCopy.stashRow(s.index)}>
                <StashIndex component="span">stash@{`{${s.index}}`}</StashIndex>
                <StashMessage component="span">{s.message}</StashMessage>
                <GeneralButton
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleStashPop(s.index)}
                  data-testid={TEST_IDS.workingCopy.stashPop(s.index)}
                >
                  {t("working_copy.stash_pop")}
                </GeneralButton>
                <GeneralButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmStashDrop(s.index)}
                  data-testid={TEST_IDS.workingCopy.stashDrop(s.index)}
                >
                  {t("working_copy.stash_drop")}
                </GeneralButton>
              </StashRow>
            ))}
          </StashList>
        )}
      </SectionBox>

      <ConfirmationModal
        open={confirmDiscard !== null}
        title={t("working_copy.discard_confirm_title")}
        description={
          confirmDiscard
            ? `${t("working_copy.discard_confirm_desc")}\n${confirmDiscard.join(", ")}`
            : ""
        }
        destructive
        confirmLabel={t("working_copy.discard_confirm_action")}
        cancelLabel={t("working_copy.cancel")}
        onCancel={() => setConfirmDiscard(null)}
        onConfirm={() => {
          const target = confirmDiscard;
          setConfirmDiscard(null);
          if (target) void runDiscard(target, true);
        }}
      />

      <ConfirmationModal
        open={confirmStashDrop !== null}
        title={t("working_copy.discard_drop_title")}
        description={t("working_copy.discard_drop_desc")}
        destructive
        confirmLabel={t("working_copy.discard_drop_action")}
        cancelLabel={t("working_copy.cancel")}
        onCancel={() => setConfirmStashDrop(null)}
        onConfirm={() => {
          const idx = confirmStashDrop;
          setConfirmStashDrop(null);
          if (idx != null) void handleStashDrop(idx);
        }}
      />

      <ConfirmationModal
        open={confirmDiscardUnstaged !== null}
        title={t("working_copy.discard_unstaged_title", {
          count: confirmDiscardUnstaged?.length ?? 0,
        })}
        description={t("working_copy.discard_unstaged_desc")}
        destructive
        confirmLabel={t("working_copy.discard_unstaged_action")}
        cancelLabel={t("working_copy.cancel")}
        onCancel={() => setConfirmDiscardUnstaged(null)}
        onConfirm={() => {
          const target = confirmDiscardUnstaged;
          setConfirmDiscardUnstaged(null);
          if (target) void handleDiscard(target);
        }}
      />
    </Root>
  );
}

export default WorkingCopyPanel;
