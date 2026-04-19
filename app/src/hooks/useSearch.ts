import { useEffect, useMemo } from "react";

import { AppRoute, type Repository } from "@recrest/shared";

import type { IconName } from "@/components/atoms/Icon";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSearchOpen, setSelectedRepo } from "@/store/slices/uiSlice";

export interface SearchResult {
  id: string;
  label: string;
  hint: string;
  kind: "repo" | "nav" | "mr" | "branch";
  icon?: IconName;
  repo?: Repository;
  onSelect: () => void;
}

export function useSearchHotkey(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        dispatch(setSearchOpen(true));
      }
      if (e.key === "Escape") {
        dispatch(setSearchOpen(false));
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [dispatch]);
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

    const navItems: Array<{ label: string; path: string; icon: IconName }> = [
      { label: options.labels.dashboard, path: AppRoute.DASHBOARD, icon: "home" },
      { label: options.labels.repos, path: AppRoute.REPOS, icon: "repo" },
      { label: options.labels.merge_requests, path: AppRoute.MERGE_REQUESTS, icon: "pr" },
      { label: options.labels.changes, path: AppRoute.CHANGES, icon: "edit" },
      { label: options.labels.branches, path: AppRoute.BRANCHES, icon: "branch" },
      { label: options.labels.activity, path: AppRoute.ACTIVITY, icon: "activity" },
      { label: options.labels.settings, path: AppRoute.SETTINGS, icon: "settings" },
    ];
    for (const item of navItems) {
      if (!q || item.label.toLowerCase().includes(q)) {
        results.push({
          id: `nav:${item.path}`,
          label: item.label,
          hint: item.path,
          kind: "nav",
          icon: item.icon,
          onSelect: () => {
            options.navigate(item.path);
            dispatch(setSearchOpen(false));
          },
        });
      }
    }

    const repoList: Repository[] = enriched;
    for (const repo of repoList) {
      if (!q || repo.name.toLowerCase().includes(q) || repo.path.toLowerCase().includes(q)) {
        results.push({
          id: `repo:${repo.id}`,
          label: repo.name,
          hint: repo.path,
          kind: "repo",
          repo,
          onSelect: () => {
            dispatch(setSelectedRepo(repo.id));
            options.navigate(AppRoute.REPOS);
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
            kind: "mr",
            icon: "pr",
            repo,
            onSelect: () => {
              options.navigate(AppRoute.MERGE_REQUESTS);
              dispatch(setSearchOpen(false));
            },
          });
        }
      }
    }

    for (const repo of repoList) {
      const branch = repo.status?.branch;
      if (!branch) continue;
      if (!q || branch.toLowerCase().includes(q)) {
        results.push({
          id: `branch:${repo.id}`,
          label: branch,
          hint: `${repo.name} · current branch`,
          kind: "branch",
          icon: "branch",
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
