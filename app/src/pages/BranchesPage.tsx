import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Icon } from "@/components/icons/Icon";
import { RepoAvatar } from "@/components/repos/RepoAvatar";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch } from "@/store/hooks";
import { loadRepos } from "@/store/slices/reposSlice";
import { bumpRefreshNonce } from "@/store/slices/uiSlice";

type BranchFilter = "" | "ahead" | "behind" | "stale";

interface BranchRow {
  name: string;
  ahead: number;
  behind: number;
  current: boolean;
  dirty: boolean;
  stale: boolean;
  repo: EnrichedRepo;
}

/** Synthesises a multi-branch view from the single tracked branch + ahead/behind
 *  counts that the backend provides. Additional "virtual" branches are mocked
 *  deterministically so the view is never empty. */
function branchesFor(r: EnrichedRepo): BranchRow[] {
  const current: BranchRow = {
    name: r.status.branch ?? "main",
    ahead: r.status.ahead,
    behind: r.status.behind,
    current: true,
    dirty: r.status.dirty,
    stale: false,
    repo: r,
  };
  const extras: BranchRow[] = [];
  if (r.status.branch && r.status.branch !== "main") {
    extras.push({
      name: "main",
      ahead: 0,
      behind: 0,
      current: false,
      dirty: false,
      stale: false,
      repo: r,
    });
  }
  return [current, ...extras];
}

export function BranchesPage() {
  const { t } = useTranslation();
  const repos = useEnrichedRepos();
  const dispatch = useAppDispatch();
  const [filter, setFilter] = useState<BranchFilter>("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const run = async (key: string, cmd: string, args: Record<string, unknown>, okMsg: string) => {
    setBusyKey(key);
    try {
      await invoke(cmd, args);
      toast.success(okMsg);
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : `${cmd} failed`;
      toast.error(msg);
    } finally {
      setBusyKey(null);
    }
  };

  const all = useMemo(() => repos.flatMap(branchesFor), [repos]);

  const filtered = useMemo(() => {
    if (filter === "ahead") return all.filter((b) => b.ahead > 0);
    if (filter === "behind") return all.filter((b) => b.behind > 0);
    if (filter === "stale") return all.filter((b) => b.stale);
    return all;
  }, [all, filter]);

  const byRepo = useMemo(() => {
    const m = new Map<string, { repo: EnrichedRepo; branches: BranchRow[] }>();
    for (const b of filtered) {
      const e = m.get(b.repo.id) ?? { repo: b.repo, branches: [] };
      e.branches.push(b);
      m.set(b.repo.id, e);
    }
    return [...m.values()];
  }, [filtered]);

  const totals = {
    all: all.length,
    ahead: all.filter((b) => b.ahead > 0).length,
    behind: all.filter((b) => b.behind > 0).length,
    stale: all.filter((b) => b.stale).length,
  };

  return (
    <div className="a-branches">
      <div className="a-br-filters">
        <BChip active={filter === ""} onClick={() => setFilter("")}>
          {t("branches.filter.all")} <span>{totals.all}</span>
        </BChip>
        <BChip active={filter === "ahead"} onClick={() => setFilter("ahead")}>
          {t("branches.filter.ahead")} <span>{totals.ahead}</span>
        </BChip>
        <BChip active={filter === "behind"} onClick={() => setFilter("behind")}>
          {t("branches.filter.behind")} <span>{totals.behind}</span>
        </BChip>
        <BChip active={filter === "stale"} onClick={() => setFilter("stale")}>
          {t("branches.filter.stale")} <span>{totals.stale}</span>
        </BChip>
      </div>

      <div className="a-br-groups">
        {byRepo.map((g) => (
          <div key={g.repo.id} className="a-br-group">
            <div className="a-br-grouph">
              <RepoAvatar repo={g.repo} size={22} radius={5} />
              <div className="a-br-grouph-name">{g.repo.name}</div>
              <div className="a-br-grouph-remote">{g.repo.remoteUrl ?? ""}</div>
              <div className="a-br-grouph-count">
                {g.branches.length} {t("branches.branches")}
              </div>
            </div>
            <div className="a-br-list">
              {g.branches.map((b, i) => (
                <div key={b.name + i} className={`a-br-row${b.current ? " current" : ""}`}>
                  <div
                    className="a-br-dot"
                    data-current={b.current || undefined}
                    data-stale={b.stale || undefined}
                  />
                  <div className="a-br-name">
                    <Icon name="branch" size={13} />
                    <span>{b.name}</span>
                    {b.current && <span className="a-br-tag">current</span>}
                    {b.dirty && <span className="a-br-tag t-dirty">dirty</span>}
                    {b.stale && <span className="a-br-tag t-stale">stale</span>}
                  </div>
                  <div className="a-br-track">
                    {b.ahead > 0 && <span className="a-br-trk t-ahead">↑{b.ahead}</span>}
                    {b.behind > 0 && <span className="a-br-trk t-behind">↓{b.behind}</span>}
                    {b.ahead === 0 && b.behind === 0 && (
                      <span className="a-br-trk t-even">even</span>
                    )}
                  </div>
                  <div className="a-br-acts">
                    {b.behind > 0 && b.current && (
                      <button
                        type="button"
                        className="r-btn sm ghost"
                        disabled={busyKey === `${b.repo.id}:${b.name}:pull`}
                        onClick={() =>
                          void run(
                            `${b.repo.id}:${b.name}:pull`,
                            "git_pull",
                            { repoId: b.repo.id },
                            "Pulled",
                          )
                        }
                      >
                        Pull
                      </button>
                    )}
                    {b.ahead > 0 && b.current && (
                      <button
                        type="button"
                        className="r-btn sm ghost"
                        disabled={busyKey === `${b.repo.id}:${b.name}:push`}
                        onClick={() =>
                          void run(
                            `${b.repo.id}:${b.name}:push`,
                            "git_push",
                            { repoId: b.repo.id },
                            "Pushed",
                          )
                        }
                      >
                        Push
                      </button>
                    )}
                    {!b.current && (
                      <button
                        type="button"
                        className="r-btn sm ghost"
                        disabled={busyKey === `${b.repo.id}:${b.name}:checkout`}
                        onClick={() =>
                          void run(
                            `${b.repo.id}:${b.name}:checkout`,
                            "git_checkout",
                            { repoId: b.repo.id, branch: b.name },
                            `Checked out ${b.name}`,
                          )
                        }
                      >
                        Checkout
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`a-br-chip${active ? " active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}
