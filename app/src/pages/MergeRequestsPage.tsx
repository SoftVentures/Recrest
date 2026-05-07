import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { type PullRequest } from "@recrest/shared";

import { BranchChip } from "@/components/atoms/BranchChip";
import { Checkbox } from "@/components/atoms/Checkbox";
import { CiDot, type CiState } from "@/components/atoms/CiDot";
import { Icon } from "@/components/atoms/Icon";
import { Kbd } from "@/components/atoms/Kbd";
import { AuthorAvatar } from "@/components/molecules/AuthorAvatar";
import { Drawer } from "@/components/molecules/Drawer";
import { EmptyState } from "@/components/molecules/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/molecules/compounds/DropdownMenu";
import { MrListSkeleton } from "@/components/molecules/skeletons/MrListSkeleton";
import { MergeRequestDetailPanel } from "@/components/organisms/mergeRequests/MergeRequestDetailPanel";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { resetFilters, setFilters } from "@/store/slices/prsSlice";

type MRFilter = "open" | "draft" | "merged" | "closed";

interface Row {
  repoId: string;
  repoName: string;
  pr: PullRequest;
}

export function MergeRequestsPage() {
  const { t } = useTranslation();
  useScrollRestoration("merge-requests");

  const prsItems = useAppSelector((s) => s.prs.items);
  const repos = useAppSelector((s) => s.repos.items);
  const filters = useAppSelector((s) => s.prs.filters);
  const prsLoading = useAppSelector((s) => s.prs.loading);

  const rows: Row[] = useMemo(() => {
    const list: Row[] = [];
    for (const [repoId, prs] of Object.entries(prsItems)) {
      const repoName = repos[repoId]?.name ?? repoId;
      for (const pr of prs) list.push({ repoId, repoName, pr });
    }
    return list;
  }, [prsItems, repos]);

  const [tab, setTab] = useState<MRFilter>("open");
  // Selection starts as `null` so the drawer is closed on first paint. The
  // user opens the drawer by clicking a row, and `setSelectedId(null)` from
  // the close button must reliably close it again — see `current` below.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let out = rows;
    // Quick-tab filter (convenience — stacks on top of advanced filters).
    if (tab === "draft") out = out.filter((r) => r.pr.draft);
    else if (tab === "merged") out = out.filter((r) => r.pr.state === "merged");
    else if (tab === "closed") out = out.filter((r) => r.pr.state === "closed");
    else out = out.filter((r) => r.pr.state === "open" && !r.pr.draft);

    // Advanced filters.
    if (filters.ciStatus.length > 0) {
      out = out.filter((r) => r.pr.ciStatus && filters.ciStatus.includes(r.pr.ciStatus));
    }
    if (filters.author && filters.author.trim()) {
      const q = filters.author.trim().toLowerCase();
      out = out.filter((r) => r.pr.author.toLowerCase().includes(q));
    }
    if (filters.draft === "only") out = out.filter((r) => r.pr.draft);
    else if (filters.draft === "hide") out = out.filter((r) => !r.pr.draft);
    return out;
  }, [rows, tab, filters]);

  const counts = useMemo(
    () => ({
      open: rows.filter((r) => r.pr.state === "open" && !r.pr.draft).length,
      draft: rows.filter((r) => r.pr.draft).length,
      merged: rows.filter((r) => r.pr.state === "merged").length,
      closed: rows.filter((r) => r.pr.state === "closed").length,
    }),
    [rows],
  );

  // CRITICAL: do NOT fall back to `filtered[0]` here. A `?? filtered[0]`
  // fallback re-opens the drawer the moment `setSelectedId(null)` is
  // dispatched (close button, ESC, backdrop) because `find` returns
  // `undefined` for `id === null` and the fallback selects the first row,
  // making the drawer impossible to close. With this contract, the drawer
  // is open iff the user has actively selected an existing row.
  const current = selectedId ? (filtered.find((r) => r.pr.id === selectedId) ?? null) : null;

  return (
    <div className="a-mr p-mrs" data-testid="merge-requests-page">
      <div className="a-mr-toolbar">
        <Chip active={tab === "open"} onClick={() => setTab("open")}>
          {t("mrs.filter.open")} <span className="chip-c">{counts.open}</span>
        </Chip>
        <Chip active={tab === "draft"} onClick={() => setTab("draft")}>
          {t("mrs.filter.draft")} <span className="chip-c">{counts.draft}</span>
        </Chip>
        <Chip active={tab === "merged"} onClick={() => setTab("merged")}>
          {t("mrs.filter.merged")} <span className="chip-c">{counts.merged}</span>
        </Chip>
        <Chip active={tab === "closed"} onClick={() => setTab("closed")}>
          {t("mrs.filter.closed")} <span className="chip-c">{counts.closed}</span>
        </Chip>
        <div style={{ flex: 1 }} />
        <FiltersDropdown />
      </div>
      <div className="a-mr-list">
        {prsLoading && rows.length === 0 ? (
          <MrListSkeleton rows={6} />
        ) : (
          <div className="a-mr-rows">
            {filtered.map(({ pr, repoName }, i) => (
              <button
                type="button"
                key={pr.id}
                className={`a-mr-row${pr.id === current?.pr.id ? " selected" : ""}`}
                style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
                data-testid="mr-row"
                data-mr-id={pr.id}
                data-mr-number={pr.number}
                data-mr-selected={pr.id === current?.pr.id ? "true" : undefined}
                onClick={() => setSelectedId(pr.id)}
              >
                <div className="a-mr-row-icon">
                  <Icon name="pr" size={14} color={pr.draft ? "var(--ink-3)" : "var(--green)"} />
                </div>
                <div className="a-mr-row-body">
                  <div className="a-mr-row-title">
                    <span>{pr.title}</span>
                    {pr.draft && <span className="r-badge">draft</span>}
                  </div>
                  <div className="a-mr-row-meta">
                    <BranchChip branch={repoName} size="sm" />
                    <span className="a-mr-sep">·</span>
                    <span>#{pr.number}</span>
                    <span className="a-mr-sep">·</span>
                    <span className="a-mr-author">
                      <AuthorAvatar name={pr.author} src={pr.authorAvatarUrl} size={16} />
                      <span>{pr.author}</span>
                    </span>
                    {pr.additions != null && pr.deletions != null && (
                      <>
                        <span className="a-mr-sep">·</span>
                        <span className="a-mr-changes">
                          +{pr.additions} −{pr.deletions}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="a-mr-row-right">
                  <CiDot state={ciToDot(pr.ciStatus)} />
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <EmptyState
                mascot={rows.length === 0 ? "snoozing" : "searching"}
                title={t("states.empty")}
                description={<Kbd>⌘K</Kbd>}
              />
            )}
          </div>
        )}
      </div>

      <Drawer open={!!current} onClose={() => setSelectedId(null)} size="lg" testId="mr-drawer">
        {current && (
          <MergeRequestDetailPanel
            pr={current.pr}
            repoId={current.repoId}
            repoName={current.repoName}
            onClose={() => setSelectedId(null)}
          />
        )}
      </Drawer>
    </div>
  );
}

function FiltersDropdown() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s) => s.prs.filters);

  const toggleCi = (ci: "success" | "failure" | "pending" | "running") => {
    const next = filters.ciStatus.includes(ci)
      ? filters.ciStatus.filter((c) => c !== ci)
      : [...filters.ciStatus, ci];
    dispatch(setFilters({ ciStatus: next }));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="r-btn sm ghost">
          <Icon name="filter" size={12} /> {t("mrs.filters")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {t("mrs.filter.ci_label", { defaultValue: "CI status" })}
        </DropdownMenuLabel>
        {(["success", "failure", "pending", "running"] as const).map((s) => (
          <DropdownMenuItem
            key={s}
            onSelect={(e) => {
              e.preventDefault();
              toggleCi(s);
            }}
          >
            <Checkbox
              checked={filters.ciStatus.includes(s)}
              onCheckedChange={() => toggleCi(s)}
              className="mr-2"
            />
            <span className="capitalize">{s}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>
          {t("mrs.filter.draft_label", { defaultValue: "Drafts" })}
        </DropdownMenuLabel>
        {(["any", "hide", "only"] as const).map((v) => (
          <DropdownMenuItem
            key={v}
            onSelect={(e) => {
              e.preventDefault();
              dispatch(setFilters({ draft: v }));
            }}
          >
            <span
              className={`mr-2 inline-block h-2 w-2 rounded-full ${
                filters.draft === v ? "bg-primary" : "bg-muted"
              }`}
            />
            <span className="capitalize">{v}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => dispatch(resetFilters())}>
          {t("mrs.filter.reset", { defaultValue: "Reset filters" })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`chip${active ? " active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function ciToDot(s: string | null): CiState {
  if (s === "success") return "passing";
  if (s === "failure") return "failing";
  if (s === "running" || s === "pending") return "running";
  return null;
}
