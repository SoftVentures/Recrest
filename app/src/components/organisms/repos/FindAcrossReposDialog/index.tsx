import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { type SearchHit, TauriCommand } from "@recrest/shared";

import { Icon } from "@/components/atoms/Icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/compounds/Dialog";
import { SearchGroupSkeleton } from "@/components/molecules/skeletons/SearchGroupSkeleton";
import { invoke } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setFindDialogOpen } from "@/store/slices/uiSlice";

export function FindAcrossReposDialog() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.findDialogOpen);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setHits([]);
      setError(null);
      return;
    }
    const handle = setTimeout(() => {
      setSearching(true);
      setError(null);
      invoke<SearchHit[]>(TauriCommand.FIND_ACROSS_REPOS, { query: q })
        .then((result) => {
          setHits(result);
        })
        .catch((err: unknown) => {
          const msg = (err as { message?: string })?.message ?? String(err);
          setError(msg);
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, open]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchHit[]>();
    for (const hit of hits) {
      const list = map.get(hit.repoId) ?? [];
      list.push(hit);
      map.set(hit.repoId, list);
    }
    return Array.from(map.entries());
  }, [hits]);

  const openHit = async (hit: SearchHit) => {
    try {
      // Path is relative to the repo — the IDE command already picks repo-root.
      await invoke(TauriCommand.OPEN_IN_IDE, { repoId: hit.repoId });
      toast.success(t("find.opened", { defaultValue: "Opened in IDE" }));
    } catch {
      toast.error(t("find.open_failed", { defaultValue: "Could not open" }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => dispatch(setFindDialogOpen(v))}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle>{t("find.title", { defaultValue: "Find across repositories" })}</DialogTitle>
        </DialogHeader>

        <div className="border-b border-border p-3">
          <div className="relative">
            <Icon
              name="search"
              size={14}
              color="var(--ink-3)"
              className="absolute left-[10px] top-3"
            />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("find.placeholder", {
                defaultValue: "Search code in all repos…",
              })}
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {error && <div className="p-4 text-center text-xs text-destructive">{error}</div>}
          {!error && searching && hits.length === 0 && (
            <div className="divide-y divide-border">
              <SearchGroupSkeleton rows={3} />
              <SearchGroupSkeleton rows={2} />
            </div>
          )}
          {!error && !searching && hits.length === 0 && query.trim() && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              {t("find.no_results", { defaultValue: "No matches." })}
            </div>
          )}
          {grouped.map(([repoId, group]) => (
            <div key={repoId} className="border-b border-border last:border-b-0">
              <div className="bg-muted/50 px-3 py-1.5 text-xs font-medium">
                {group[0]!.repoName} <span className="text-muted-foreground">({group.length})</span>
              </div>
              {group.map((hit, i) => (
                <button
                  key={`${hit.repoId}-${hit.path}-${hit.line}-${i}`}
                  type="button"
                  onClick={() => void openHit(hit)}
                  className="block w-full border-t border-border/50 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/30"
                >
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {hit.path}:{hit.line}
                  </div>
                  <div className="truncate font-mono text-[11px]">{hit.snippet}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
