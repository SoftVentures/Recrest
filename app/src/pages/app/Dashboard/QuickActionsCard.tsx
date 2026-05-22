import { useMemo, useState } from "react";

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

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useRecentCommits } from "@/hooks/useRecentCommits";
import { invoke, isTauri } from "@/lib/tauri";
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
  const { commits: recentCommits } = useRecentCommits({ days: 14 });

  const [fetching, setFetching] = useState(false);

  const onFetchAll = async () => {
    if (!isTauri()) return;
    setFetching(true);
    try {
      const ok = await invoke<number>(TauriCommand.GIT_FETCH_ALL);
      toast.success(`Fetched ${ok} repo${ok === 1 ? "" : "s"}`);
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch {
      toast.error("Fetch all failed");
    } finally {
      setFetching(false);
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
      toast.error(
        t("dash.quick.open_ide_error", { defaultValue: "Could not open the repo in your IDE" }),
      );
    }
  };

  const onRecentCommits = () => navigate(AppRoute.ACTIVITY);
  const onCreateBranch = () => navigate(AppRoute.BRANCHES);

  return (
    <Card>
      <CardHead>
        <CardTitle>{t("dash.quick.title", { defaultValue: "Quick actions" })}</CardTitle>
      </CardHead>
      <Grid>
        <QBtn type="button" onClick={() => void onFetchAll()} disabled={fetching}>
          <RefreshCw size={14} />
          <span>{fetching ? "…" : t("dash.quick.fetch_all", { defaultValue: "Fetch all" })}</span>
        </QBtn>
        <GeneralTooltip
          title={t("dash.quick.clone_tooltip", {
            defaultValue: "Clone from a URL or import from GitHub / GitLab / Bitbucket",
          })}
          placement="top"
        >
          <QBtn type="button" onClick={onOpenImport} data-testid="dash-qa-clone">
            <Plus size={14} />
            <span>{t("dash.quick.clone", { defaultValue: "Clone repo" })}</span>
          </QBtn>
        </GeneralTooltip>
        <QBtn type="button" onClick={onFindAcrossRepos}>
          <Search size={14} />
          <span>{t("dash.quick.find", { defaultValue: "Find across repos" })}</span>
        </QBtn>
        <GeneralTooltip
          title={t("dash.quick.workspace_tooltip", {
            defaultValue: "Open a multi-root IDE workspace with all scanned repos",
          })}
          placement="top"
        >
          <QBtn
            type="button"
            onClick={() => void onOpenWorkspace()}
            data-testid="dash-qa-workspace"
          >
            <Terminal size={14} />
            <span>{t("dash.quick.workspace", { defaultValue: "Open workspace" })}</span>
          </QBtn>
        </GeneralTooltip>
        <GeneralTooltip
          title={t("dash.quick.open_ide_tooltip", {
            defaultValue: "Open the most recently active repo in your default IDE",
          })}
          placement="top"
        >
          <QBtn
            type="button"
            onClick={() => void onOpenInIde()}
            disabled={!mostRecentRepoId}
            data-testid="dash-qa-open-ide"
          >
            <Code2 size={14} />
            <span>{t("dash.quick.open_ide", { defaultValue: "Open in IDE" })}</span>
          </QBtn>
        </GeneralTooltip>
        <QBtn type="button" onClick={onRecentCommits} data-testid="dash-qa-recent-commits">
          <Activity size={14} />
          <span>{t("dash.quick.recent_commits", { defaultValue: "Recent commits" })}</span>
        </QBtn>
        <QBtn type="button" onClick={onCreateBranch} data-testid="dash-qa-create-branch">
          <GitBranch size={14} />
          <span>{t("dash.quick.create_branch", { defaultValue: "Create branch" })}</span>
        </QBtn>
        <GeneralTooltip
          title={t("dash.quick.coming_soon", { defaultValue: "Coming soon" })}
          placement="top"
        >
          {/* `aria-disabled` (rather than the native `disabled` attr) keeps
              pointer events alive so the tooltip still fires on hover.
              Click is no-op'd via preventDefault. */}
          <QBtn
            type="button"
            aria-disabled
            onClick={(e) => e.preventDefault()}
            data-testid="dash-qa-pull-all"
          >
            <GitPullRequest size={14} />
            <span>{t("dash.quick.pull_all", { defaultValue: "Pull all" })}</span>
          </QBtn>
        </GeneralTooltip>
      </Grid>
    </Card>
  );
}

export default QuickActionsCard;

const Card = styled("section")(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
}));

const CardHead = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
});

const CardTitle = styled("h3")(({ theme }) => ({
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
  margin: 0,
  letterSpacing: "-0.01em",
}));

const Grid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 6,
});

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
