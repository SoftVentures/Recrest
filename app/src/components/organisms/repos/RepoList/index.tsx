import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Icon } from "@/components/atoms/Icon";
import { COL_TEMPLATE, RepoRow } from "@/components/organisms/repos/RepoRow";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedRepo } from "@/store/slices/uiSlice";

interface RepoListProps {
  repos: EnrichedRepo[];
  grouped?: boolean;
}

const GROUP_ORDER = ["SoftVentures", "Personal", "Tools", "Projects", "Recycle Bin"];

export function RepoList({ repos, grouped = true }: RepoListProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((s) => s.ui.selectedRepoId);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    if (!grouped) return [{ label: null as string | null, items: repos }];
    const map = new Map<string, EnrichedRepo[]>();
    for (const r of repos) {
      const arr = map.get(r.group) ?? [];
      arr.push(r);
      map.set(r.group, arr);
    }
    const ordered: { label: string; items: EnrichedRepo[] }[] = [];
    for (const g of GROUP_ORDER) {
      if (map.has(g)) {
        ordered.push({ label: g, items: map.get(g)! });
        map.delete(g);
      }
    }
    for (const [label, items] of map) ordered.push({ label, items });
    return ordered;
  }, [repos, grouped]);

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
        <div key={g.label ?? gi}>
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
            g.items.map((r) => (
              <RepoRow key={r.id} repo={r} selected={r.id === selectedId} onSelect={onSelect} />
            ))}
        </div>
      ))}

      {repos.length === 0 && (
        <div
          style={{ padding: "32px 20px", textAlign: "center", color: "var(--ink-3)" }}
          data-testid="repo-list-empty"
        >
          {t("states.empty")}
        </div>
      )}
    </div>
  );
}
