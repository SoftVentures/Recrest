import { useEffect, useRef } from "react";

import { invoke, safeInvoke } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

type Kind = "new_pr" | "ci_failed" | "merge_ready";

/** Watches the Redux PR cache and emits desktop notifications on meaningful
 *  state transitions:
 *    - a PR number appears that wasn't there before        → `new_pr`
 *    - a known PR's CI goes success/pending → failure      → `ci_failed`
 *    - a known PR flips from not-mergeable → mergeable     → `merge_ready`
 *  The Rust side short-circuits on the per-kind toggle so we can fire
 *  liberally here without leaking noise. */
export function useNotificationTriggers(): void {
  const items = useAppSelector((s) => s.prs.items);
  const details = useAppSelector((s) => s.prs.detail);
  // Only start emitting notifications once we've actually seen a non-empty
  // PR cache. The first render always has `items = {}`; snapshotting that
  // as the baseline means every PR that subsequently *loaded* from the
  // provider would fire a bogus "New merge request" toast on every boot.
  const hasBaselineRef = useRef(false);
  const seenRef = useRef<Map<string, { ci: string | null; mergeable: boolean | null }>>(new Map());

  useEffect(() => {
    const next = new Map<string, { ci: string | null; mergeable: boolean | null }>();
    for (const [repoId, prs] of Object.entries(items)) {
      for (const pr of prs) {
        const key = `${repoId}#${pr.number}`;
        const detail = details[key];
        next.set(key, { ci: pr.ciStatus, mergeable: detail?.mergeable ?? null });
      }
    }

    // Defer the baseline snapshot until the cache is actually populated.
    // An empty cache is the loading state, not a zero-PR steady state.
    if (!hasBaselineRef.current) {
      if (next.size === 0) return;
      hasBaselineRef.current = true;
      seenRef.current = next;
      return;
    }

    const prev = seenRef.current;
    for (const [key, curr] of next) {
      const before = prev.get(key);
      if (!before) {
        void notify("new_pr", "New merge request", prettyKey(key, items));
        continue;
      }
      if (before.ci !== "failure" && curr.ci === "failure") {
        void notify("ci_failed", "CI failed", prettyKey(key, items));
      }
      if (before.mergeable !== true && curr.mergeable === true) {
        void notify("merge_ready", "Merge ready", prettyKey(key, items));
      }
    }

    seenRef.current = next;
  }, [items, details]);
  void invoke;
}

function prettyKey(key: string, items: Record<string, unknown>): string {
  const [repoId, number] = key.split("#");
  return `${repoId ?? ""} #${number ?? ""}`;
  void items;
}

async function notify(kind: Kind, title: string, body: string): Promise<void> {
  await safeInvoke("notify", { kind, title, body });
}
