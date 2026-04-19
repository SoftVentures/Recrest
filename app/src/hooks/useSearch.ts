import { useEffect, useMemo } from "react";

import type { Repository } from "@recrest/shared";

import type { IconName } from "@/components/icons/Icon";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSearchOpen, setSelectedRepo } from "@/store/slices/uiSlice";

export interface SearchResult {
  id: string;
  label: string;
  hint: string;
  kind: "repo" | "nav";
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
    dirty: string;
    branches: string;
    activity: string;
    settings: string;
  };
}

export function useSearchResults(query: string, options: SearchOptions): SearchResult[] {
  const repos = useAppSelector((s) => s.repos.items);
  const dispatch = useAppDispatch();

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const results: SearchResult[] = [];

    const navItems: Array<{ label: string; path: string; icon: IconName }> = [
      { label: options.labels.dashboard, path: "/dashboard", icon: "home" },
      { label: options.labels.repos, path: "/repos", icon: "folder" },
      { label: options.labels.merge_requests, path: "/merge-requests", icon: "pr" },
      { label: options.labels.dirty, path: "/dirty", icon: "dot" },
      { label: options.labels.branches, path: "/branches", icon: "branch" },
      { label: options.labels.activity, path: "/activity", icon: "activity" },
      { label: options.labels.settings, path: "/settings", icon: "settings" },
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

    for (const repo of Object.values(repos) as Repository[]) {
      if (!q || repo.name.toLowerCase().includes(q) || repo.path.toLowerCase().includes(q)) {
        results.push({
          id: `repo:${repo.id}`,
          label: repo.name,
          hint: repo.path,
          kind: "repo",
          repo,
          onSelect: () => {
            dispatch(setSelectedRepo(repo.id));
            options.navigate("/repos");
            dispatch(setSearchOpen(false));
          },
        });
      }
    }

    return results.slice(0, 20);
  }, [query, repos, dispatch, options]);
}
