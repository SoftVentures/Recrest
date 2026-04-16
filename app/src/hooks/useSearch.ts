import { useEffect, useMemo } from "react";

import type { Repository } from "@recrest/shared";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSearchOpen, setSelectedRepo } from "@/store/slices/uiSlice";

export interface SearchResult {
  id: string;
  label: string;
  hint: string;
  kind: "repo" | "nav";
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
  labels: { repos: string; prs: string; settings: string };
}

export function useSearchResults(query: string, options: SearchOptions): SearchResult[] {
  const repos = useAppSelector((s) => s.repos.items);
  const dispatch = useAppDispatch();

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const results: SearchResult[] = [];

    const navItems: Array<{ label: string; path: string }> = [
      { label: options.labels.repos, path: "/repos" },
      { label: options.labels.prs, path: "/pull-requests" },
      { label: options.labels.settings, path: "/settings" },
    ];
    for (const item of navItems) {
      if (!q || item.label.toLowerCase().includes(q)) {
        results.push({
          id: `nav:${item.path}`,
          label: item.label,
          hint: item.path,
          kind: "nav",
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
