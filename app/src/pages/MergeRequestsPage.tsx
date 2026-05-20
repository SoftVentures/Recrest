import { useMemo, useState } from "react";

import { ChevronDown, Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type PullRequest } from "@recrest/shared";

import { BranchChip } from "@/components/atoms/BranchChip";
import { Checkbox } from "@/components/atoms/Checkbox";
import { CiDot, type CiState } from "@/components/atoms/CiDot";
import { Icon } from "@/components/atoms/Icon";
import { Kbd } from "@/components/atoms/Kbd";
import { AuthorAvatar } from "@/components/molecules/AuthorAvatar";
import { EmptyState } from "@/components/molecules/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/molecules/compounds/DropdownMenu";
import { MrListSkeleton } from "@/components/molecules/skeletons/MrListSkeleton";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { resetFilters, setFilters } from "@/store/slices/prsSlice";
import { setSelectedPr } from "@/store/slices/uiSlice";

type MRFilter = "open" | "draft" | "merged" | "closed";

interface Row {
  repoId: string;
  repoName: string;
  pr: PullRequest;
}

export function MergeRequestsPage() {
  const { t } = useTranslation();
  useScrollRestoration("merge-requests");
  const dispatch = useAppDispatch();

  const prsItems = useAppSelector((s) => s.prs.items);
  const repos = useAppSelector((s) => s.repos.items);
  const filters = useAppSelector((s) => s.prs.filters);
  const prsLoading = useAppSelector((s) => s.prs.loading);
  const selectedPrKey = useAppSelector((s) => s.ui.selectedPrKey);

  const rows: Row[] = useMemo(() => {
    const list: Row[] = [];
    for (const [repoId, prs] of Object.entries(prsItems)) {
      const repoName = repos[repoId]?.name ?? repoId;
      for (const pr of prs) list.push({ repoId, repoName, pr });
    }
    return list;
  }, [prsItems, repos]);

  const [tab, setTab] = useState<MRFilter>("open");
  const [search, setSearch] = useState("");
  const prKey = (repoId: string, prNumber: number) => `${repoId}#${prNumber}`;

  const filtered = useMemo(() => {
    let out = rows;
    if (tab === "draft") out = out.filter((r) => r.pr.draft);
    else if (tab === "merged") out = out.filter((r) => r.pr.state === "merged");
    else if (tab === "closed") out = out.filter((r) => r.pr.state === "closed");
    else out = out.filter((r) => r.pr.state === "open" && !r.pr.draft);

    if (filters.ciStatus.length > 0) {
      out = out.filter((r) => r.pr.ciStatus && filters.ciStatus.includes(r.pr.ciStatus));
    }
    if (filters.author && filters.author.trim()) {
      const q = filters.author.trim().toLowerCase();
      out = out.filter((r) => r.pr.author.toLowerCase().includes(q));
    }
    if (filters.draft === "only") out = out.filter((r) => r.pr.draft);
    else if (filters.draft === "hide") out = out.filter((r) => !r.pr.draft);

    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (r) =>
          r.pr.title.toLowerCase().includes(q) ||
          r.pr.author.toLowerCase().includes(q) ||
          r.repoName.toLowerCase().includes(q) ||
          (r.pr.sourceBranch ?? "").toLowerCase().includes(q) ||
          String(r.pr.number).includes(q),
      );
    }
    return out;
  }, [rows, tab, filters, search]);

  const counts = useMemo(
    () => ({
      open: rows.filter((r) => r.pr.state === "open" && !r.pr.draft).length,
      draft: rows.filter((r) => r.pr.draft).length,
      merged: rows.filter((r) => r.pr.state === "merged").length,
      closed: rows.filter((r) => r.pr.state === "closed").length,
    }),
    [rows],
  );

  const current = selectedPrKey
    ? (filtered.find((r) => prKey(r.repoId, r.pr.number) === selectedPrKey) ?? null)
    : null;

  return (
    <div className="a-mr p-mrs" data-testid="merge-requests-page">
      <div className="a-mr-toolbar">
        <div className="a-search-pill">
          <Icon name="search" size={12} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("mrs.search_placeholder", { defaultValue: "Filter merge requests…" })}
            aria-label={t("mrs.search_aria", { defaultValue: "Filter merge requests by name" })}
            data-testid="mrs-search"
            className="a-search-pill-input"
          />
        </div>
        <div style={{ flex: 1 }} />
        <FiltersDropdown tab={tab} setTab={setTab} counts={counts} />
      </div>
      <div className="a-mr-list">
        {prsLoading && rows.length === 0 ? (
          <MrListSkeleton rows={6} />
        ) : (
          <div className="a-mr-rows">
            {filtered.map(({ pr, repoId, repoName }, i) => (
              <button
                type="button"
                key={pr.id}
                className={`a-mr-row${pr.id === current?.pr.id ? " selected" : ""}`}
                style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
                data-testid="mr-row"
                data-mr-id={pr.id}
                data-mr-number={pr.number}
                data-mr-selected={pr.id === current?.pr.id ? "true" : undefined}
                onClick={() => dispatch(setSelectedPr(prKey(repoId, pr.number)))}
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
    </div>
  );
}

interface FiltersDropdownProps {
  tab: MRFilter;
  setTab: (tab: MRFilter) => void;
  counts: { open: number; draft: number; merged: number; closed: number };
}

function FiltersDropdown({ tab, setTab, counts }: FiltersDropdownProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s) => s.prs.filters);

  const toggleCi = (ci: "success" | "failure" | "pending" | "running") => {
    const next = filters.ciStatus.includes(ci)
      ? filters.ciStatus.filter((c) => c !== ci)
      : [...filters.ciStatus, ci];
    dispatch(setFilters({ ciStatus: next }));
  };

  const stateActiveCount = tab !== "open" ? 1 : 0;
  const advancedActiveCount =
    filters.ciStatus.length + (filters.draft !== "any" ? 1 : 0) + (filters.author ? 1 : 0);
  const totalActive = stateActiveCount + advancedActiveCount;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="r-filter-trigger" data-testid="mrs-filter-trigger">
          <Filter className="h-3.5 w-3.5" aria-hidden />
          <span>{t("mrs.filters")}</span>
          {totalActive > 0 && <span className="seg-count">{totalActive}</span>}
          <ChevronDown className="r-filter-chev h-3.5 w-3.5" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {t("mrs.filter.state_label", { defaultValue: "State" })}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={tab} onValueChange={(v) => setTab(v as MRFilter)}>
          {(["open", "draft", "merged", "closed"] as const).map((s) => (
            <DropdownMenuRadioItem key={s} value={s} onSelect={(e) => e.preventDefault()}>
              <span className="capitalize">{t(`mrs.filter.${s}`)}</span>
              <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                {counts[s]}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
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
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            dispatch(resetFilters());
          }}
        >
          {t("mrs.filter.reset", { defaultValue: "Reset filters" })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ciToDot(s: string | null): CiState {
  if (s === "success") return "passing";
  if (s === "failure") return "failing";
  if (s === "running" || s === "pending") return "running";
  return null;
}
