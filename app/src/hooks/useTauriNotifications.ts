import { useEffect, useRef } from "react";

import type { PullRequest } from "@recrest/shared";

import { notificationService } from "@/lib/tauri/services";
import { useAppSelector } from "@/store/hooks";

interface PrSnapshot {
  id: string;
  state: string;
  draft: boolean;
  ciStatus: string | null;
  title: string;
  url: string;
}

function toSnapshot(pr: PullRequest): PrSnapshot {
  return {
    id: pr.id,
    state: pr.state,
    draft: pr.draft,
    ciStatus: pr.ciStatus,
    title: pr.title,
    url: pr.url,
  };
}

function isMergeReady(pr: PrSnapshot): boolean {
  return pr.state === "open" && !pr.draft && pr.ciStatus === "success";
}

/**
 * Diffs `state.prs.items` against a previous snapshot and triggers native
 * notifications for: new PR, CI transitioning to failure, PR becoming
 * merge-ready. No-op outside Tauri.
 */
export function useTauriNotifications(enabled: boolean): void {
  const prsByRepo = useAppSelector((s) => s.prs.items);
  const settings = useAppSelector((s) => s.settings.notifications);
  const previousRef = useRef<Map<string, PrSnapshot> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const next = new Map<string, PrSnapshot>();
    for (const prs of Object.values(prsByRepo)) {
      if (!prs) continue;
      for (const pr of prs) next.set(pr.id, toSnapshot(pr));
    }

    const previous = previousRef.current;
    previousRef.current = next;

    // Skip the first run — we have no baseline, otherwise every PR would ping.
    if (previous === null) return;
    if (!settings.enabled) return;

    for (const [id, curr] of next) {
      const prev = previous.get(id);

      if (!prev && curr.state === "open" && !curr.draft && settings.newPr) {
        void notificationService.send({
          title: "New merge request",
          body: curr.title,
        });
        continue;
      }

      if (!prev) continue;

      if (settings.ciFailed && prev.ciStatus !== "failure" && curr.ciStatus === "failure") {
        void notificationService.send({
          title: "CI failed",
          body: curr.title,
        });
      }

      if (settings.mergeReady && !isMergeReady(prev) && isMergeReady(curr)) {
        void notificationService.send({
          title: "Ready to merge",
          body: curr.title,
        });
      }
    }
  }, [enabled, prsByRepo, settings]);
}
