import { useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { AppRoute, type GitPullAllResult, TauriCommand } from "@recrest/shared";

import { Activity, ArrowDownToLine, Code2, Plus, RefreshCw, Terminal } from "lucide-react";
import { toast } from "sonner";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import ActionFeedbackIcon from "@/components/atoms/feedback/ActionFeedbackIcon";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import ConfirmationModal from "@/components/molecules/modals/ConfirmationModal";
import { useActivityCommits } from "@/hooks/useActivityCommits";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri } from "@/lib/tauri";
import { useActionFeedback } from "@/lib/utils/useActionFeedback";
import { useAppDispatch } from "@/store/hooks";
import { loadRepos } from "@/store/reducers/reposReducer";
import { bumpRefreshNonce, setImportDialogOpen } from "@/store/reducers/uiReducer";

/**
 * Quick-actions grid shown on the dashboard. Each action either fires a Tauri
 * command (fetch/pull all), opens a dialog, or navigates to a route. "Fetch
 * all" and "Pull all" form the first row and run across every scanned repo.
 */
function QuickActionsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const repos = useEnrichedRepos();
  const { commits: recentCommits } = useActivityCommits();

  const fetchAll = useActionFeedback();
  const pullAll = useActionFeedback();
  const [pullAllConfirmOpen, setPullAllConfirmOpen] = useState(false);

  const onFetchAll = async () => {
    if (!isTauri()) return;
    try {
      const ok = await fetchAll.run(() => invoke<number>(TauriCommand.GIT_FETCH_ALL));
      toast.success(t("dash.quick.fetched", { count: ok }));
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch {
      toast.error(t("dash.quick.fetch_all_error"));
    }
  };

  const onPullAll = async () => {
    setPullAllConfirmOpen(false);
    if (!isTauri()) return;
    try {
      const result = await pullAll.run(() => invoke<GitPullAllResult>(TauriCommand.GIT_PULL_ALL));
      // A repo that refuses to pull (dirty worktree, no upstream, auth) used to be
      // dropped on the backend, so the toast reported a success count that silently
      // excluded it. Name the failures instead.
      if (result.failures.length > 0) {
        const names = result.failures
          .map((f) => repos.find((r) => r.id === f.repoId)?.name ?? f.repoId)
          .join(", ");
        toast.warning(
          t("dash.quick.pulled_partial", {
            ok: result.ok,
            failed: result.failures.length,
            repos: names,
          }),
        );
      } else {
        toast.success(t("dash.quick.pulled", { count: result.ok }));
      }
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch {
      toast.error(t("dash.quick.pull_all_error"));
    }
  };

  const onOpenImport = () => dispatch(setImportDialogOpen(true));

  const onOpenWorkspace = async () => {
    const ids = repos.map((r) => r.id);
    if (!isTauri() || ids.length === 0) {
      navigate(AppRoute.REPOS);
      return;
    }
    try {
      await invoke(TauriCommand.CREATE_AND_OPEN_WORKSPACE, { repoIds: ids });
    } catch {
      navigate(AppRoute.REPOS);
    }
  };

  // "Open in IDE" defaults to the repo with the newest recent commit.
  const mostRecentRepoId = useMemo(() => {
    const fromCommit = recentCommits[0]?.repoId;
    if (fromCommit && repos.some((r) => r.id === fromCommit)) return fromCommit;
    return repos[0]?.id ?? null;
  }, [recentCommits, repos]);

  const onOpenInIde = async () => {
    if (!mostRecentRepoId) return;
    if (!isTauri()) {
      navigate(AppRoute.REPOS);
      return;
    }
    try {
      await invoke(TauriCommand.OPEN_IN_IDE, { repoId: mostRecentRepoId });
    } catch {
      toast.error(t("dash.quick.open_ide_error"));
    }
  };

  const onRecentCommits = () => navigate(AppRoute.ACTIVITY);

  return (
    <GeneralCard title={t("dash.quick.title")}>
      <Grid>
        <QBtn
          type="button"
          onClick={() => void onFetchAll()}
          disabled={fetchAll.state === "loading"}
          data-testid={TEST_IDS.dashboard.qa.fetchAll}
        >
          <ActionFeedbackIcon state={fetchAll.state} fallback={<RefreshCw size={14} />} size={14} />
          <Box component="span">{t("dash.quick.fetch_all")}</Box>
        </QBtn>
        <QBtn
          type="button"
          onClick={() => setPullAllConfirmOpen(true)}
          disabled={pullAll.state === "loading" || repos.length === 0}
          data-testid={TEST_IDS.dashboard.qa.pullAll}
        >
          <ActionFeedbackIcon
            state={pullAll.state}
            fallback={<ArrowDownToLine size={14} />}
            size={14}
          />
          <Box component="span">{t("dash.quick.pull_all")}</Box>
        </QBtn>
        <GeneralTooltip title={t("dash.quick.clone_tooltip")} placement="top">
          <QBtn type="button" onClick={onOpenImport} data-testid={TEST_IDS.dashboard.qa.clone}>
            <Plus size={14} />
            <Box component="span">{t("dash.quick.clone")}</Box>
          </QBtn>
        </GeneralTooltip>
        <GeneralTooltip title={t("dash.quick.workspace_tooltip")} placement="top">
          <QBtn
            type="button"
            onClick={() => void onOpenWorkspace()}
            data-testid={TEST_IDS.dashboard.qa.workspace}
          >
            <Terminal size={14} />
            <Box component="span">{t("dash.quick.workspace")}</Box>
          </QBtn>
        </GeneralTooltip>
        <GeneralTooltip title={t("dash.quick.open_ide_tooltip")} placement="top">
          <QBtn
            type="button"
            onClick={() => void onOpenInIde()}
            disabled={!mostRecentRepoId}
            data-testid={TEST_IDS.dashboard.qa.openIde}
          >
            <Code2 size={14} />
            <Box component="span">{t("dash.quick.open_ide")}</Box>
          </QBtn>
        </GeneralTooltip>
        <QBtn
          type="button"
          onClick={onRecentCommits}
          data-testid={TEST_IDS.dashboard.qa.recentCommits}
        >
          <Activity size={14} />
          <Box component="span">{t("dash.quick.recent_commits")}</Box>
        </QBtn>
      </Grid>
      <ConfirmationModal
        open={pullAllConfirmOpen}
        title={t("dash.quick.pull_all_confirm_title")}
        description={t("dash.quick.pull_all_confirm_body", { count: repos.length })}
        confirmLabel={t("dash.quick.pull_all")}
        onCancel={() => setPullAllConfirmOpen(false)}
        onConfirm={() => void onPullAll()}
      />
    </GeneralCard>
  );
}

export default QuickActionsCard;

const Grid = styled(Box)({
  // Fill the card's height (it stretches to its grid-row neighbour, e.g. the
  // heatmap) and let the button rows share that space via `1fr` auto-rows, so
  // the actions grow to fill the box instead of leaving dead space below.
  flex: 1,
  minHeight: 0,
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gridAutoRows: "1fr",
  gap: 6,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const QBtn = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minHeight: 38,
  padding: "8px 10px",
  borderRadius: 8,
  cursor: "pointer",
  background: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 500,
  textAlign: "left",
  transition: "background 0.12s ease, border-color 0.12s ease, transform 0.12s ease",
  "&:hover:not(:disabled):not([aria-disabled='true'])": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
  "&:active:not(:disabled):not([aria-disabled='true'])": {
    transform: "translateY(1px)",
  },
  "&:disabled, &[aria-disabled='true']": {
    opacity: 0.55,
    cursor: "default",
  },
  'html[data-reduced-motion="true"] &': {
    transition: "none",
  },
}));
