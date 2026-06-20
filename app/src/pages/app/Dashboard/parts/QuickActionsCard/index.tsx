import { useMemo } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { AppRoute, TauriCommand } from "@recrest/shared";

import {
  Activity,
  Code2,
  GitBranch,
  GitPullRequest,
  Plus,
  RefreshCw,
  Search,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import ActionFeedbackIcon from "@/components/atoms/feedback/ActionFeedbackIcon";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import { useActivityCommits } from "@/hooks/useActivityCommits";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri } from "@/lib/tauri";
import { useActionFeedback } from "@/lib/utils/useActionFeedback";
import { useAppDispatch } from "@/store/hooks";
import { loadRepos } from "@/store/reducers/reposReducer";
import {
  bumpRefreshNonce,
  setFindDialogOpen,
  setImportDialogOpen,
} from "@/store/reducers/uiReducer";

/**
 * 8-button quick-actions grid shown on the dashboard. Mirrors the old
 * `a-dash-quick` block: each action either fires a Tauri command, opens a
 * dialog, or navigates to a route. Disabled actions stay visible (greyed)
 * with a "coming soon" tooltip so the surface area stays consistent.
 */
function QuickActionsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const repos = useEnrichedRepos();
  const { commits: recentCommits } = useActivityCommits();

  const fetchAll = useActionFeedback();

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

  const onOpenImport = () => dispatch(setImportDialogOpen(true));
  const onFindAcrossRepos = () => dispatch(setFindDialogOpen(true));

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
  const onCreateBranch = () => navigate(AppRoute.BRANCHES);

  return (
    <GeneralCard title={t("dash.quick.title")}>
      <Grid>
        <QBtn
          type="button"
          onClick={() => void onFetchAll()}
          disabled={fetchAll.state === "loading"}
        >
          <ActionFeedbackIcon state={fetchAll.state} fallback={<RefreshCw size={14} />} size={14} />
          <Box component="span">{t("dash.quick.fetch_all")}</Box>
        </QBtn>
        <GeneralTooltip title={t("dash.quick.clone_tooltip")} placement="top">
          <QBtn type="button" onClick={onOpenImport} data-testid={TEST_IDS.dashboard.qa.clone}>
            <Plus size={14} />
            <Box component="span">{t("dash.quick.clone")}</Box>
          </QBtn>
        </GeneralTooltip>
        <QBtn type="button" onClick={onFindAcrossRepos}>
          <Search size={14} />
          <Box component="span">{t("dash.quick.find")}</Box>
        </QBtn>
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
        <QBtn
          type="button"
          onClick={onCreateBranch}
          data-testid={TEST_IDS.dashboard.qa.createBranch}
        >
          <GitBranch size={14} />
          <Box component="span">{t("dash.quick.create_branch")}</Box>
        </QBtn>
        <GeneralTooltip title={t("dash.quick.coming_soon")} placement="top">
          {/* `aria-disabled` (rather than the native `disabled` attr) keeps
              pointer events alive so the tooltip still fires on hover.
              Click is no-op'd via preventDefault. */}
          <QBtn
            type="button"
            aria-disabled
            onClick={(e) => e.preventDefault()}
            data-testid={TEST_IDS.dashboard.qa.pullAll}
          >
            <GitPullRequest size={14} />
            <Box component="span">{t("dash.quick.pull_all")}</Box>
          </QBtn>
        </GeneralTooltip>
      </Grid>
    </GeneralCard>
  );
}

export default QuickActionsCard;

const Grid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 6,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const QBtn = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
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
