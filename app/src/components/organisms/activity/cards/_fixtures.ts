import type { CheckRunSummary, PrEvent, PullRequest, RecentCommit } from "@recrest/shared";

import type { EnrichedRepo } from "@/lib/repoEnrich";

/** Minimal fake repo usable in stories + tests. Casts through `unknown` because
 *  the real `EnrichedRepo` extends a Rust-provided `Repository` with many
 *  fields we don't care about at this layer. */
export function fakeRepo(id: string, over: Partial<EnrichedRepo> = {}): EnrichedRepo {
  return {
    id,
    name: id,
    path: `/tmp/${id}`,
    remoteUrl: null,
    providerId: null,
    groupId: null,
    status: null,
    group: "default",
    lang: "TypeScript",
    added: 0,
    removed: 0,
    filesChanged: 0,
    activity: [],
    pinned: false,
    clean: true,
    ...over,
  } as unknown as EnrichedRepo;
}

export function fakeCommit(
  sha: string,
  repoId: string,
  author: string,
  ts: string = new Date().toISOString(),
): RecentCommit {
  return {
    sha,
    summary: `chore: update ${sha}`,
    author,
    authorEmail: null,
    timestamp: ts,
    repoId,
    repoName: repoId,
  };
}

export function fakePrEvent(kind: PrEvent["kind"], over: Partial<PrEvent> = {}): PrEvent {
  return {
    repoId: "r1",
    repoName: "r1",
    number: 42,
    title: "example PR",
    author: "alice",
    kind,
    timestamp: new Date().toISOString(),
    url: "https://example.com/pr/42",
    ...over,
  };
}

export function fakeCheckRun(over: Partial<CheckRunSummary> = {}): CheckRunSummary {
  return {
    repoId: "r1",
    repoName: "r1",
    day: new Date().toISOString().slice(0, 10),
    total: 10,
    passed: 8,
    failed: 2,
    shaSamples: [],
    ...over,
  };
}

export function fakePr(over: Partial<PullRequest> = {}): PullRequest {
  return {
    id: "1",
    number: 1,
    title: "example PR",
    url: "https://example.com/pr/1",
    author: "alice",
    state: "open",
    draft: false,
    sourceBranch: "feature",
    targetBranch: "main",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    additions: null,
    deletions: null,
    ciStatus: null,
    ...over,
  } as unknown as PullRequest;
}
