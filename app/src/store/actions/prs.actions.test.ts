import { configureStore } from "@reduxjs/toolkit";

import type {
  Comment,
  FileDiff,
  MergePullRequestResult,
  PullRequest,
  PullRequestDetail,
} from "@recrest/shared";
import { TauriCommand } from "@recrest/shared";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  detailKey,
  fetchPullRequests,
  loadPrDetail,
  loadPrDiff,
  mergePr,
  postPrComment,
} from "@/store/actions/prs.actions";
import { prsReducer } from "@/store/reducers/prsReducer";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock("@/lib/tauri", () => ({
  invoke: invokeMock,
  isTauri: () => false,
}));

function makeStore() {
  return configureStore({ reducer: { prs: prsReducer } });
}

const REPO = "repo-1";

describe("detailKey", () => {
  it("encodes repo id and pr number", () => {
    expect(detailKey("abc", 42)).toBe("abc#42");
  });
});

describe("prs thunks", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("fetchPullRequests returns the repo id alongside the prs", async () => {
    const prs: PullRequest[] = [];
    invokeMock.mockResolvedValueOnce(prs);
    const store = makeStore();
    const result = await store.dispatch(fetchPullRequests(REPO));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.FETCH_PULL_REQUESTS, { repoId: REPO });
    expect(result.payload).toEqual({ repoId: REPO, prs });
  });

  it("loadPrDetail keys the detail by repo#number", async () => {
    const detail = { number: 7 } as unknown as PullRequestDetail;
    invokeMock.mockResolvedValueOnce(detail);
    const store = makeStore();
    const result = await store.dispatch(loadPrDetail({ repoId: REPO, prNumber: 7 }));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GET_PR_DETAIL, {
      repoId: REPO,
      prNumber: 7,
    });
    expect(result.payload).toEqual({ key: "repo-1#7", detail });
  });

  it("loadPrDiff keys the files by repo#number", async () => {
    const files: FileDiff[] = [];
    invokeMock.mockResolvedValueOnce(files);
    const store = makeStore();
    const result = await store.dispatch(loadPrDiff({ repoId: REPO, prNumber: 8 }));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GET_PR_DIFF, {
      repoId: REPO,
      prNumber: 8,
    });
    expect(result.payload).toEqual({ key: "repo-1#8", files });
  });

  it("mergePr forwards the input and echoes repo/number with the result", async () => {
    const merged = { merged: true } as unknown as MergePullRequestResult;
    invokeMock.mockResolvedValueOnce(merged);
    const input = { strategy: "merge" } as never;
    const store = makeStore();
    const result = await store.dispatch(mergePr({ repoId: REPO, prNumber: 9, input }));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.MERGE_PULL_REQUEST, {
      repoId: REPO,
      prNumber: 9,
      input,
    });
    expect(result.payload).toEqual({ repoId: REPO, prNumber: 9, result: merged });
  });

  it("postPrComment coalesces optional path/position to null", async () => {
    const comment = { id: "c1" } as unknown as Comment;
    invokeMock.mockResolvedValueOnce(comment);
    const store = makeStore();
    const result = await store.dispatch(postPrComment({ repoId: REPO, prNumber: 10, body: "hi" }));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.POST_PR_COMMENT, {
      repoId: REPO,
      prNumber: 10,
      body: "hi",
      path: null,
      position: null,
    });
    expect(result.payload).toEqual({ key: "repo-1#10", comment });
  });

  it("postPrComment forwards an explicit path and position", async () => {
    const comment = { id: "c2" } as unknown as Comment;
    invokeMock.mockResolvedValueOnce(comment);
    const position = { line: 12 } as never;
    const store = makeStore();
    await store.dispatch(
      postPrComment({ repoId: REPO, prNumber: 11, body: "x", path: "src/a.ts", position }),
    );
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.POST_PR_COMMENT, {
      repoId: REPO,
      prNumber: 11,
      body: "x",
      path: "src/a.ts",
      position,
    });
  });

  it("rejects when invoke throws", async () => {
    invokeMock.mockRejectedValueOnce(new Error("boom"));
    const store = makeStore();
    const result = await store.dispatch(fetchPullRequests(REPO));
    expect(result.type).toBe(fetchPullRequests.rejected.type);
  });
});
