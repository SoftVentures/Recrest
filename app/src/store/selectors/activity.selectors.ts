import { createSelector } from "@reduxjs/toolkit";

import type { RecentCommit } from "@recrest/shared";

import type { RootState } from "@/store";

const selectCommitsByRepo = (s: RootState) => s.activity.commitsByRepo;
export const selectSelectedRange = (s: RootState) => s.activity.selectedRange;
export const selectOldestCommitDate = (s: RootState) => s.activity.oldestCommitDate;

/** All loaded commits inside the selected range, newest first. */
export const selectCommitsInRange = createSelector(
  [selectCommitsByRepo, selectSelectedRange],
  (byRepo, range): RecentCommit[] => {
    // Compare epoch ms, not ISO strings: Rust emits second-precision timestamps
    // ("...:00Z") while JS range bounds carry millis ("...:00.000Z"), so a
    // lexicographic compare could drop boundary commits at `until`.
    const sinceMs = Date.parse(range.since);
    const untilMs = Date.parse(range.until);
    const decorated: { commit: RecentCommit; t: number }[] = [];
    for (const repo of Object.values(byRepo)) {
      for (const c of repo.commits) {
        const t = Date.parse(c.timestamp);
        if (t >= sinceMs && t <= untilMs) decorated.push({ commit: c, t });
      }
    }
    return decorated.sort((a, b) => b.t - a.t).map((d) => d.commit);
  },
);

export const selectAnyTruncated = createSelector([selectCommitsByRepo], (byRepo) =>
  Object.values(byRepo).some((r) => r.truncated),
);

export const selectCommitsLoading = (s: RootState) => s.activity.activeRequestId !== null;
