import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import type { RepoListViewMode } from "@recrest/shared";

import { Icon } from "@/components/atoms/Icon";
import { EmptyState } from "@/components/molecules/EmptyState";
import { RepoCard } from "@/components/organisms/repos/RepoCard";
import { COL_TEMPLATE, RepoRow } from "@/components/organisms/repos/RepoRow";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedRepo } from "@/store/slices/uiSlice";

interface RepoListProps {
  repos: EnrichedRepo[];
  /** Deprecated: prefer `viewMode`. Kept so existing callers don't break. */
  grouped?: boolean;
  /** D.1: explicit view mode. When provided, overrides `grouped`. The
   *  `card` mode also kicks in automatically below ~720px container width
   *  via the `@container` query in `views.scss`. */
  viewMode?: RepoListViewMode;
}

const GROUP_ORDER = ["SoftVentures", "Personal", "Tools", "Projects", "Recycle Bin"];

const PINNED_GROUP = "__pinned__";

export function RepoList({ repos, grouped = true, viewMode }: RepoListProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((s) => s.ui.selectedRepoId);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Derive the effective layout. `viewMode` wins over `grouped` so callers
  // that adopt the new prop don't have to clear the legacy one too.
  const requestedMode: RepoListViewMode = viewMode ?? (grouped ? "grouped" : "flat");

  // R.1: width-driven auto-card-mode is a *narrow-viewport one-way override*
  // for the `grouped` layout only — the table cannot fit in <720px without
  // overflow, so we collapse it to cards there. The `flat` and `card` modes
  // already lay out fine at any width, so respecting the user's explicit
  // toggle takes priority and the override never kicks in for them.
  // Without this guard, a previous attempt forced card mode for *every*
  // mode below 720px which made the toggle look broken on narrower widths.
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [autoCard, setAutoCard] = useState(false);
  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;
      // Use the same 720px threshold as the @container query so visual and
      // JSX-driven swaps line up at the exact same breakpoint.
      setAutoCard(width > 0 && width < 720);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The auto-override only flips `grouped` → `card`. Explicit `flat` stays
  // flat and explicit `card` stays card; both already render correctly in a
  // narrow shell. This is the one-way fallback the bug fix demands.
  const effectiveMode: RepoListViewMode =
    autoCard && requestedMode === "grouped" ? "card" : requestedMode;
  const isGrouped = effectiveMode === "grouped";

  const groups = useMemo(() => {
    // Pinned repos float to the top in their own group regardless of which
    // folder they belong to. Plan 1 §A.5: "wenn repo pinned, nicht oben" —
    // before this, the pinned flag had no impact on ordering.
    const pinned = repos.filter((r) => r.pinned);

    if (!isGrouped) {
      const rest = repos.filter((r) => !r.pinned);
      const out: { label: string | null; items: EnrichedRepo[]; key: string }[] = [];
      if (pinned.length > 0) {
        out.push({ label: t("repos.group.pinned"), items: pinned, key: PINNED_GROUP });
      }
      if (rest.length > 0) out.push({ label: null, items: rest, key: "all" });
      return out;
    }

    const map = new Map<string, EnrichedRepo[]>();
    for (const r of repos) {
      if (r.pinned) continue;
      const arr = map.get(r.group) ?? [];
      arr.push(r);
      map.set(r.group, arr);
    }
    const ordered: { label: string; items: EnrichedRepo[]; key: string }[] = [];
    if (pinned.length > 0) {
      ordered.push({ label: t("repos.group.pinned"), items: pinned, key: PINNED_GROUP });
    }
    for (const g of GROUP_ORDER) {
      if (map.has(g)) {
        ordered.push({ label: g, items: map.get(g)!, key: g });
        map.delete(g);
      }
    }
    for (const [label, items] of map) ordered.push({ label, items, key: label });
    return ordered;
  }, [repos, isGrouped, t]);

  const onSelect = (id: string) => dispatch(setSelectedRepo(id));

  // Container-query host: the wrapper sets `container-type: inline-size`
  // (in views.scss). Only the active layout is rendered as JSX; the CSS
  // `@container (max-width: 720px)` rule remains a safety net for the
  // brief paint between mount and ResizeObserver delivery.
  const renderCardGrid = effectiveMode === "card";
  return (
    <div
      ref={shellRef}
      className={`repo-list-shell repo-list-shell--${effectiveMode}`}
      data-view={effectiveMode}
      data-testid="repo-list"
    >
      {renderCardGrid ? (
        // Card mode: render group headers above each card section so the
        // Pinned group keeps its visual separation (I8) and the collapse
        // state from grouped mode is honoured here too. Without this, a
        // collapsed group from grouped-mode would silently hide cards in
        // card-mode with no way to re-expand them.
        <div className="repo-card-grid" data-testid="repo-card-grid">
          {groups.map((g) => {
            const collapsed = collapsedGroups.has(g.key);
            return (
              <div key={g.key} className="repo-card-group">
                {g.label && (
                  <button
                    type="button"
                    className="a-group repo-card-group-hdr"
                    onClick={() =>
                      setCollapsedGroups((s) => {
                        const n = new Set(s);
                        if (n.has(g.key)) n.delete(g.key);
                        else n.add(g.key);
                        return n;
                      })
                    }
                  >
                    <Icon name={collapsed ? "chev" : "chevDown"} size={12} />
                    <span className="a-group-label">{g.label}</span>
                    <span className="a-group-count">{g.items.length}</span>
                    <div className="a-group-rule" />
                  </button>
                )}
                {!collapsed && (
                  <div className="repo-card-group-items">
                    {g.items.map((r, i) => (
                      <RepoCard
                        key={`card-${r.id}`}
                        repo={r}
                        selected={r.id === selectedId}
                        onSelect={onSelect}
                        animIndex={i}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="a-table repo-list-table">
          <div className="a-thead" style={{ gridTemplateColumns: COL_TEMPLATE }}>
            <div className="a-th">{t("repos.col.repository")}</div>
            <div className="a-th">{t("repos.col.branch")}</div>
            <div className="a-th">{t("repos.col.status")}</div>
            <div className="a-th">{t("repos.col.activity")}</div>
            <div className="a-th r">{t("repos.col.actions")}</div>
          </div>

          {groups.map((g, gi) => {
            // I4: collapse-state Set is keyed by `g.key` (stable) instead
            // of `g.label` (translated). Toggling locale used to silently
            // un-collapse groups because the translated label changed.
            const collapsed = collapsedGroups.has(g.key);
            return (
              <div key={g.key} style={{ "--gi": gi } as React.CSSProperties}>
                {g.label && (
                  <button
                    type="button"
                    className="a-group"
                    onClick={() =>
                      setCollapsedGroups((s) => {
                        const n = new Set(s);
                        if (n.has(g.key)) n.delete(g.key);
                        else n.add(g.key);
                        return n;
                      })
                    }
                  >
                    <Icon name={collapsed ? "chev" : "chevDown"} size={12} />
                    <span className="a-group-label">{g.label}</span>
                    <span className="a-group-count">{g.items.length}</span>
                    <div className="a-group-rule" />
                  </button>
                )}
                {!collapsed &&
                  g.items.map((r, i) => (
                    <RepoRow
                      key={r.id}
                      repo={r}
                      selected={r.id === selectedId}
                      onSelect={onSelect}
                      animIndex={i}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      )}

      {repos.length === 0 && (
        <div className="flex h-full w-full" data-testid="repo-list-empty">
          <EmptyState mascot="waving" title={t("states.empty")} />
        </div>
      )}
    </div>
  );
}
