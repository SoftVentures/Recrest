import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Icon } from "@/components/atoms/Icon";
import { RepoAvatar } from "@/components/molecules/RepoAvatar";
import { formatShortcut, usePlatform } from "@/hooks/usePlatform";
import { type SearchResult, useSearchResults } from "@/hooks/useSearch";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSearchOpen } from "@/store/slices/uiSlice";

export function SearchOverlay() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const platform = usePlatform();
  const open = useAppSelector((s) => s.ui.searchOpen);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const openShortcut = formatShortcut(platform, { mod: true, key: "K" });

  const options = useMemo(
    () => ({
      navigate: (path: string) => navigate(path),
      labels: {
        dashboard: t("nav.dashboard"),
        repos: t("nav.repos"),
        merge_requests: t("nav.merge_requests"),
        changes: t("nav.changes"),
        branches: t("nav.branches"),
        activity: t("nav.activity"),
        settings: t("nav.settings"),
      },
    }),
    [navigate, t],
  );

  const results = useSearchResults(query, options);

  const navResults = useMemo(() => results.filter((r) => r.kind === "nav"), [results]);
  const repoResults = useMemo(() => results.filter((r) => r.kind === "repo"), [results]);
  const mrResults = useMemo(() => results.filter((r) => r.kind === "mr"), [results]);
  const branchResults = useMemo(() => results.filter((r) => r.kind === "branch"), [results]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (cursor >= results.length) setCursor(Math.max(0, results.length - 1));
  }, [cursor, results.length]);

  if (!open) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[cursor]?.onSelect();
    } else if (e.key === "Home") {
      e.preventDefault();
      setCursor(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setCursor(results.length - 1);
    }
  };

  const renderRow = (r: SearchResult, globalIndex: number) => (
    <li
      key={r.id}
      id={`search-result-${r.id}`}
      role="option"
      aria-selected={globalIndex === cursor ? "true" : "false"}
      className="a-search-row-li"
    >
      <button
        type="button"
        onMouseEnter={() => setCursor(globalIndex)}
        onClick={r.onSelect}
        className="a-search-row"
        data-active={globalIndex === cursor ? "true" : undefined}
      >
        {r.kind === "repo" && r.repo ? (
          <RepoAvatar repo={r.repo} size={22} radius={5} />
        ) : (r.kind === "mr" || r.kind === "branch") && r.repo ? (
          <span className="a-search-row-mini">
            <RepoAvatar repo={r.repo} size={18} radius={4} />
            <span className="a-search-row-mini-icon">
              <Icon name={r.icon ?? "chev"} size={10} />
            </span>
          </span>
        ) : (
          <span className="a-search-row-icon">
            <Icon name={r.icon ?? "chev"} size={13} />
          </span>
        )}
        <span className="a-search-row-label">{r.label}</span>
        <span className="a-search-row-hint">{r.hint}</span>
      </button>
    </li>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("actions.search")}
      className="a-search-backdrop"
      data-testid="search-overlay"
      onClick={() => dispatch(setSearchOpen(false))}
      onKeyDown={onKeyDown}
    >
      <div
        className="a-search-panel"
        data-testid="search-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="a-search-head">
          <Icon name="search" size={14} color="var(--ink-3)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            placeholder={t("actions.search_placeholder", "Search repositories, branches, PRs…")}
            className="a-search-input"
            aria-activedescendant={
              results[cursor] ? `search-result-${results[cursor].id}` : undefined
            }
          />
          <span className="a-search-kbds">
            <kbd className="kbd">{openShortcut}</kbd>
            <kbd className="kbd">Esc</kbd>
          </span>
        </div>
        <ul role="listbox" className="a-search-list">
          {results.length === 0 ? (
            <li className="a-search-empty">{t("states.empty")}</li>
          ) : (
            <>
              {navResults.length > 0 && (
                <>
                  <li className="a-search-group">{t("actions.search_group_nav", "Go to")}</li>
                  {navResults.map((r, i) => renderRow(r, i))}
                </>
              )}
              {navResults.length > 0 && repoResults.length > 0 && (
                <li className="a-search-divider" aria-hidden />
              )}
              {repoResults.length > 0 && (
                <>
                  <li className="a-search-group">
                    {t("actions.search_group_repos", "Repositories")}
                  </li>
                  {repoResults.map((r, i) => renderRow(r, navResults.length + i))}
                </>
              )}
              {mrResults.length > 0 && (
                <>
                  <li className="a-search-divider" aria-hidden />
                  <li className="a-search-group">
                    {t("actions.search_group_mrs", "Merge requests")}
                  </li>
                  {mrResults.map((r, i) =>
                    renderRow(r, navResults.length + repoResults.length + i),
                  )}
                </>
              )}
              {branchResults.length > 0 && (
                <>
                  <li className="a-search-divider" aria-hidden />
                  <li className="a-search-group">
                    {t("actions.search_group_branches", "Branches")}
                  </li>
                  {branchResults.map((r, i) =>
                    renderRow(r, navResults.length + repoResults.length + mrResults.length + i),
                  )}
                </>
              )}
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
