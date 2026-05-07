import type { FC, ReactNode } from "react";
import { createElement } from "react";

import { configureStore } from "@reduxjs/toolkit";
import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProviderId, PullRequest, PullRequestDetail, Repository } from "@recrest/shared";

// Must be imported *after* the mocks above so the hook picks them up.
import { useNotificationTriggers } from "@/hooks/useNotificationTriggers";
import { invoke } from "@/lib/tauri";
import { providersReducer } from "@/store/slices/providersSlice";
import { prsReducer, setPrs } from "@/store/slices/prsSlice";
import { reposReducer } from "@/store/slices/reposSlice";

// ---- Mocks --------------------------------------------------------------
//
// The hook calls `invoke("notify", …)` via `@/lib/tauri`. Mock the whole
// module so each call is observable via `invoke.mock.calls`. `isTauri` is
// forced to true because the hook short-circuits on `enabled=false` at the
// call site, and we pass `true` explicitly in the tests below.
vi.mock("@/lib/tauri", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  safeInvoke: vi.fn().mockResolvedValue(null),
  isTauri: () => true,
}));

// Stub i18next so we can assert on deterministic body/title strings without
// booting the full resource bundle. The hook only calls `t(key, params)`.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (!params) return key;
      // i18next treats `defaultValue` as a reserved control param — it's
      // not interpolated into the output. Mirror that here so the stub
      // doesn't leak the default-key hint into the assertion strings.
      const interpolated = Object.entries(params).filter(([k]) => k !== "defaultValue");
      if (interpolated.length === 0) return key;
      const parts = interpolated.map(([k, v]) => `${k}=${String(v)}`).join(",");
      return `${key}|${parts}`;
    },
  }),
}));

type TestStore = ReturnType<typeof makeStore>;

function makeStore(providerId: ProviderId | null = null) {
  return configureStore({
    reducer: {
      prs: prsReducer,
      repos: reposReducer,
    },
    preloadedState: {
      repos: {
        items: {
          "repo-1": makeRepo("repo-1", "acme/recrest", providerId),
        } as Record<string, Repository>,
        groups: {},
        scanPaths: [],
        loading: false,
        error: null,
      },
    },
  });
}

function wrapper(store: TestStore) {
  return function Wrapper({ children }: { children: ReactNode }) {
    // `Provider` in modern react-redux types requires `children` as a named
    // prop; cast through a local FC alias so TS's overload resolution
    // accepts the call. Children go through the third createElement arg
    // so `react/no-children-prop` stays happy.
    const P = Provider as unknown as FC<{ store: TestStore; children?: ReactNode }>;
    return createElement(P, { store }, children);
  };
}

function makeRepo(id: string, name: string, providerId: ProviderId | null = null): Repository {
  return {
    id,
    name,
    path: `/tmp/${id}`,
    groupId: null,
    remoteUrl: null,
    providerId,
    logoPath: null,
    logoDarkPath: null,
    status: {
      branch: "main",
      head: null,
      ahead: 0,
      behind: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0,
      conflicted: 0,
      dirty: false,
      lastCommit: null,
      remoteUrl: null,
      changedFiles: [],
      changedFilesTruncated: false,
      commitActivity: Array.from({ length: 14 }, () => 0),
      addedLines: 0,
      removedLines: 0,
      language: null,
      languages: null,
    },
  };
}

function makePr(overrides: Partial<PullRequest> & Pick<PullRequest, "id" | "number">): PullRequest {
  return {
    title: `PR ${overrides.number}`,
    url: `https://example.test/pr/${overrides.number}`,
    author: "octocat",
    state: "open",
    draft: false,
    sourceBranch: "feature",
    targetBranch: "main",
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    additions: null,
    deletions: null,
    ciStatus: null,
    ...overrides,
  };
}

function makeDetail(repoId: string, number: number, mergeable: boolean | null): PullRequestDetail {
  const base = makePr({ id: `${repoId}-${number}`, number });
  return {
    ...base,
    body: null,
    mergeable,
    reviewers: [],
    files: [],
    timeline: [],
  };
}

// Cast invoke for assertion ergonomics — vitest's MockInstance type is
// narrow enough that pulling `.mock` off the plain mock is noisy otherwise.
const invokeMock = vi.mocked(invoke);

beforeEach(() => {
  invokeMock.mockClear();
});

afterEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(undefined as unknown as never);
});

describe("useNotificationTriggers", () => {
  it("does not emit on the very first render with an empty cache", () => {
    const store = makeStore();
    renderHook(() => useNotificationTriggers(true), { wrapper: wrapper(store) });
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("treats the first non-empty cache as the baseline without emitting", () => {
    const store = makeStore();
    renderHook(() => useNotificationTriggers(true), { wrapper: wrapper(store) });

    act(() => {
      store.dispatch(setPrs({ repoId: "repo-1", prs: [makePr({ id: "a", number: 1 })] }));
    });

    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("emits exactly one new_pr when a second PR is added after the baseline", () => {
    const store = makeStore();
    renderHook(() => useNotificationTriggers(true), { wrapper: wrapper(store) });

    act(() => {
      store.dispatch(setPrs({ repoId: "repo-1", prs: [makePr({ id: "a", number: 1 })] }));
    });
    expect(invokeMock).not.toHaveBeenCalled();

    act(() => {
      store.dispatch(
        setPrs({
          repoId: "repo-1",
          prs: [
            makePr({ id: "a", number: 1 }),
            makePr({ id: "b", number: 2, title: "Shiny feature" }),
          ],
        }),
      );
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [cmd, args] = invokeMock.mock.calls[0] ?? [];
    expect(cmd).toBe("notify");
    expect(args).toMatchObject({
      kind: "new_pr",
      url: "https://example.test/pr/2",
    });
    // Body interpolates the repo *name* (from repos slice), not the id.
    expect(String(args?.body)).toContain("acme/recrest");
    expect(String(args?.body)).toContain("2");
    expect(String(args?.body)).toContain("Shiny feature");
  });

  it("emits one ci_failed when CI transitions from success to failure", () => {
    const store = makeStore();
    renderHook(() => useNotificationTriggers(true), { wrapper: wrapper(store) });

    act(() => {
      store.dispatch(
        setPrs({
          repoId: "repo-1",
          prs: [makePr({ id: "a", number: 1, ciStatus: "success" })],
        }),
      );
    });
    expect(invokeMock).not.toHaveBeenCalled();

    act(() => {
      store.dispatch(
        setPrs({
          repoId: "repo-1",
          prs: [makePr({ id: "a", number: 1, ciStatus: "failure" })],
        }),
      );
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [, args] = invokeMock.mock.calls[0] ?? [];
    expect(args).toMatchObject({ kind: "ci_failed" });
  });

  it("emits one merge_ready when mergeable flips null → true", () => {
    const store = makeStore();
    renderHook(() => useNotificationTriggers(true), { wrapper: wrapper(store) });

    // Seed a baseline PR with no detail → mergeable=null in the hook's view.
    act(() => {
      store.dispatch(setPrs({ repoId: "repo-1", prs: [makePr({ id: "a", number: 1 })] }));
    });
    expect(invokeMock).not.toHaveBeenCalled();

    // Flip the detail so mergeable becomes true. Poke the prs slice so the
    // hook's effect re-runs (details alone aren't a dep of the snapshot
    // keyset — we re-dispatch setPrs with the same content to trigger).
    act(() => {
      store.dispatch({
        type: "prs/detail/fulfilled",
        payload: { key: "repo-1#1", detail: makeDetail("repo-1", 1, true) },
        meta: { arg: { repoId: "repo-1", prNumber: 1 } },
      });
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [, args] = invokeMock.mock.calls[0] ?? [];
    expect(args).toMatchObject({ kind: "merge_ready" });
  });

  it("coalesces >5 new PRs into a single burst notification", () => {
    const store = makeStore();
    renderHook(() => useNotificationTriggers(true), { wrapper: wrapper(store) });

    // Seed the baseline with one PR so the next dispatch is a real
    // transition rather than the initial baseline grab.
    act(() => {
      store.dispatch(setPrs({ repoId: "repo-1", prs: [makePr({ id: "a", number: 1 })] }));
    });
    expect(invokeMock).not.toHaveBeenCalled();

    act(() => {
      store.dispatch(
        setPrs({
          repoId: "repo-1",
          prs: [
            makePr({ id: "a", number: 1 }),
            makePr({ id: "b", number: 2 }),
            makePr({ id: "c", number: 3 }),
            makePr({ id: "d", number: 4 }),
            makePr({ id: "e", number: 5 }),
            makePr({ id: "f", number: 6 }),
            makePr({ id: "g", number: 7 }),
          ],
        }),
      );
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [, args] = invokeMock.mock.calls[0] ?? [];
    expect(args).toMatchObject({ kind: "new_pr", url: null });
    // Our stub t() serialises params as "key=value,…" — the count of 6 new
    // PRs must appear in the body.
    expect(String(args?.body)).toContain("count=6");
  });

  // Plan 1 §A.6: per-provider CI wording. The stub t() echoes the i18n
  // *key* (with params appended). We assert on which key the hook chose,
  // which is what the test is really about — the resource bundle is i18n's
  // problem, not the hook's.

  it("resolves the GitHub-specific ci_failed key for GitHub repos", () => {
    const store = makeStore("github");
    renderHook(() => useNotificationTriggers(true), { wrapper: wrapper(store) });

    act(() => {
      store.dispatch(
        setPrs({
          repoId: "repo-1",
          prs: [makePr({ id: "a", number: 1, ciStatus: "success" })],
        }),
      );
    });
    expect(invokeMock).not.toHaveBeenCalled();

    act(() => {
      store.dispatch(
        setPrs({
          repoId: "repo-1",
          prs: [makePr({ id: "a", number: 1, ciStatus: "failure" })],
        }),
      );
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [, args] = invokeMock.mock.calls[0] ?? [];
    expect(args).toMatchObject({ kind: "ci_failed" });
    // Title key — the hook must pick the GitHub-flavoured branch.
    expect(String(args?.title)).toBe("notifications.ci_failed.github.title");
  });

  it("resolves the GitLab-specific ci_failed key for GitLab repos", () => {
    const store = makeStore("gitlab");
    renderHook(() => useNotificationTriggers(true), { wrapper: wrapper(store) });

    act(() => {
      store.dispatch(
        setPrs({
          repoId: "repo-1",
          prs: [makePr({ id: "a", number: 1, ciStatus: "success" })],
        }),
      );
    });
    expect(invokeMock).not.toHaveBeenCalled();

    act(() => {
      store.dispatch(
        setPrs({
          repoId: "repo-1",
          prs: [makePr({ id: "a", number: 1, ciStatus: "failure" })],
        }),
      );
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [, args] = invokeMock.mock.calls[0] ?? [];
    expect(args).toMatchObject({ kind: "ci_failed" });
    expect(String(args?.title)).toBe("notifications.ci_failed.gitlab.title");
  });

  it("suppresses owned-PR notifications when providers slice is loaded with no connections", () => {
    // I3: when the providers slice IS registered (so we know identity is
    // tracked) but has zero connections, we still know who "me" is for
    // each PR's provider — namely "nobody". Ownership therefore evaluates
    // to false for every PR and no notification fires. This is the case
    // identity-compare on EMPTY_PROVIDERS used to mishandle.
    const store = configureStore({
      reducer: {
        prs: prsReducer,
        repos: reposReducer,
        providers: providersReducer,
      },
      preloadedState: {
        repos: {
          items: {
            "repo-1": makeRepo("repo-1", "acme/recrest", "github"),
          } as Record<string, Repository>,
          groups: {},
          scanPaths: [],
          loading: false,
          error: null,
        },
      },
    });
    type LocalStore = typeof store;
    const Wrap = ({ children }: { children: ReactNode }) => {
      const P = Provider as unknown as FC<{ store: LocalStore; children?: ReactNode }>;
      return createElement(P, { store }, children);
    };
    renderHook(() => useNotificationTriggers(true), { wrapper: Wrap });

    // First dispatch is the baseline (no emit anyway).
    act(() => {
      store.dispatch(setPrs({ repoId: "repo-1", prs: [makePr({ id: "a", number: 1 })] }));
    });
    // Second dispatch adds a brand-new PR — without a known username we
    // can't establish ownership, but the slice is loaded so we don't fall
    // through; the hook short-circuits silently.
    act(() => {
      store.dispatch(
        setPrs({
          repoId: "repo-1",
          prs: [makePr({ id: "a", number: 1 }), makePr({ id: "b", number: 2 })],
        }),
      );
    });

    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("falls back to ci_failed.default.title when the provider is unknown", () => {
    const store = makeStore(null);
    renderHook(() => useNotificationTriggers(true), { wrapper: wrapper(store) });

    act(() => {
      store.dispatch(
        setPrs({
          repoId: "repo-1",
          prs: [makePr({ id: "a", number: 1, ciStatus: "success" })],
        }),
      );
    });

    act(() => {
      store.dispatch(
        setPrs({
          repoId: "repo-1",
          prs: [makePr({ id: "a", number: 1, ciStatus: "failure" })],
        }),
      );
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [, args] = invokeMock.mock.calls[0] ?? [];
    expect(String(args?.title)).toBe("notifications.ci_failed.default.title");
  });
});
