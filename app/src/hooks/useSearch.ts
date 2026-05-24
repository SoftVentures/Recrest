import { type ComponentType, useMemo } from "react";

import { AppRoute, type Repository } from "@recrest/shared";

import {
  Activity as ActivityIcon,
  GitBranch as BranchesIcon,
  Edit3 as ChangesIcon,
  Home as DashboardIcon,
  type LucideProps,
  GitMerge as MrsIcon,
  BookMarked as ReposIcon,
  Settings as SettingsIcon,
} from "lucide-react";

import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { SearchKind } from "@/lib/constants/searchKinds.constants";
import { setSearchOpen, setSelectedRepo } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export { SearchKind };

export interface SearchResult {
  id: string;
  label: string;
  hint: string;
  kind: SearchKind;
  icon?: ComponentType<LucideProps>;
  repo?: Repository;
  onSelect: () => void;
}

export interface SearchOptions {
  navigate: (path: string) => void;
  labels: {
    dashboard: string;
    repos: string;
    merge_requests: string;
    changes: string;
    branches: string;
    activity: string;
    settings: string;
  };
}

export function useSearchResults(query: string, options: SearchOptions): SearchResult[] {
  const enriched = useEnrichedRepos();
  const prs = useAppSelector((s) => s.prs.items);
  const dispatch = useAppDispatch();

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const results: SearchResult[] = [];
    const repos: Record<string, Repository> = {};
    for (const r of enriched) repos[r.id] = r;

    const navItems: Array<{ label: string; path: string; icon: ComponentType<LucideProps> }> = [
      { label: options.labels.dashboard, path: AppRoute.DASHBOARD, icon: DashboardIcon },
      { label: options.labels.repos, path: AppRoute.REPOS, icon: ReposIcon },
      { label: options.labels.merge_requests, path: AppRoute.MERGE_REQUESTS, icon: MrsIcon },
      { label: options.labels.changes, path: AppRoute.CHANGES, icon: ChangesIcon },
      { label: options.labels.branches, path: AppRoute.BRANCHES, icon: BranchesIcon },
      { label: options.labels.activity, path: AppRoute.ACTIVITY, icon: ActivityIcon },
      { label: options.labels.settings, path: AppRoute.SETTINGS, icon: SettingsIcon },
    ];
    for (const item of navItems) {
      if (!q || item.label.toLowerCase().includes(q)) {
        results.push({
          id: `nav:${item.path}`,
          label: item.label,
          hint: item.path,
          kind: SearchKind.NAV,
          icon: item.icon,
          onSelect: () => {
            options.navigate(item.path);
            dispatch(setSearchOpen(false));
          },
        });
      }
    }

    for (const repo of enriched) {
      if (!q || repo.name.toLowerCase().includes(q) || repo.path.toLowerCase().includes(q)) {
        results.push({
          id: `repo:${repo.id}`,
          label: repo.name,
          hint: repo.path,
          kind: SearchKind.REPO,
          repo,
          onSelect: () => {
            dispatch(setSelectedRepo(repo.id));
            options.navigate(`/repo/${repo.id}`);
            dispatch(setSearchOpen(false));
          },
        });
      }
    }

    for (const [repoId, repoPrs] of Object.entries(prs)) {
      const repo = repos[repoId];
      if (!repo) continue;
      for (const pr of repoPrs) {
        const hay = `${pr.title} ${pr.author} #${pr.number}`.toLowerCase();
        if (!q || hay.includes(q)) {
          results.push({
            id: `mr:${repoId}:${pr.id}`,
            label: pr.title,
            hint: `${repo.name} · #${pr.number} · ${pr.author}`,
            kind: SearchKind.MR,
            icon: MrsIcon,
            repo,
            onSelect: () => {
              options.navigate(AppRoute.MERGE_REQUESTS);
              dispatch(setSearchOpen(false));
            },
          });
        }
      }
    }

    for (const repo of enriched) {
      const branch = repo.status?.branch;
      if (!branch) continue;
      if (!q || branch.toLowerCase().includes(q)) {
        results.push({
          id: `branch:${repo.id}`,
          label: branch,
          hint: `${repo.name} · current branch`,
          kind: SearchKind.BRANCH,
          icon: BranchesIcon,
          repo,
          onSelect: () => {
            dispatch(setSelectedRepo(repo.id));
            options.navigate(AppRoute.BRANCHES);
            dispatch(setSearchOpen(false));
          },
        });
      }
    }

    return results.slice(0, 30);
  }, [query, enriched, prs, dispatch, options]);
}
