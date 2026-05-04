import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Icon } from "@/components/atoms/Icon";
import { EmptyState } from "@/components/molecules/EmptyState";
import { COL_TEMPLATE, RepoRow } from "@/components/organisms/repos/RepoRow";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedRepo } from "@/store/slices/uiSlice";

interface RepoListProps {
  repos: EnrichedRepo[];
  grouped?: boolean;
}

const GROUP_ORDER = ["SoftVentures", "Personal", "Tools", "Projects", "Recycle Bin"];

const PINNED_GROUP = "__pinned__";

export function RepoList({ repos, grouped = true }: RepoListProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((s) => s.ui.selectedRepoId);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    // Pinned repos float to the top in their own group regardless of which
    // folder they belong to. Plan 1 §A.5: "wenn repo pinned, nicht oben" —
    // before this, the pinned flag had no impact on ordering.
    const pinned = repos.filter((r) => r.pinned);

    if (!grouped) {
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
  }, [repos, grouped, t]);

  const onSelect = (id: string) => dispatch(setSelectedRepo(id));

  return (
    <div className="a-table" data-testid="repo-list">
      <div className="a-thead" style={{ gridTemplateColumns: COL_TEMPLATE }}>
        <div className="a-th">{t("repos.col.repository")}</div>
        <div className="a-th">{t("repos.col.branch")}</div>
        <div className="a-th">{t("repos.col.status")}</div>
        <div className="a-th">{t("repos.col.activity")}</div>
        <div className="a-th r">{t("repos.col.actions")}</div>
      </div>

      {groups.map((g, gi) => (
        <div key={g.key} style={{ "--gi": gi } as React.CSSProperties}>
          {g.label && (
            <button
              type="button"
              className="a-group"
              onClick={() =>
                setCollapsedGroups((s) => {
                  const n = new Set(s);
                  if (n.has(g.label!)) n.delete(g.label!);
                  else n.add(g.label!);
                  return n;
                })
              }
            >
              <Icon name={collapsedGroups.has(g.label) ? "chev" : "chevDown"} size={12} />
              <span className="a-group-label">{g.label}</span>
              <span className="a-group-count">{g.items.length}</span>
              <div className="a-group-rule" />
            </button>
          )}
          {!collapsedGroups.has(g.label ?? "") &&
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
      ))}

      {repos.length === 0 && (
        <div className="flex h-full w-full" data-testid="repo-list-empty">
          <EmptyState mascot="waving" title={t("states.empty")} />
        </div>
      )}
    </div>
  );
}
