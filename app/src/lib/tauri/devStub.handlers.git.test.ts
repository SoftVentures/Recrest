import { describe, expect, it } from "vitest";

import { DEFAULT_SEED } from "@/lib/dev/seed";
import { gitStub } from "@/lib/tauri/devStub.handlers.git";
import { UNHANDLED } from "@/lib/tauri/devStub.providers";
import { type DevSeed, createDevStubState, isStubProtected } from "@/lib/tauri/devStub.state";

// Use the first two seed repos for commands that need a repoId.
const REPO_A = DEFAULT_SEED.repos[0]!.id; // "repo-recrest"
const REPO_B = DEFAULT_SEED.repos[1]!.id; // "repo-local-dev-stacks"

function freshState() {
  return createDevStubState(DEFAULT_SEED as unknown as DevSeed);
}

describe("gitStub — unknown command", () => {
  it("returns UNHANDLED for an unrecognised command", () => {
    const state = freshState();
    expect(gitStub("not_a_real_command", {}, state)).toBe(UNHANDLED);
  });
});

describe("gitStub — simple status-returning commands", () => {
  const statusCmds = [
    "git_fetch",
    "git_pull",
    "git_push",
    "git_checkout",
    "git_checkout_remote",
    "git_branch_create",
  ];

  for (const cmd of statusCmds) {
    it(`${cmd} with a known repoId returns the repo status object`, () => {
      const state = freshState();
      const result = gitStub(cmd, { repoId: REPO_A }, state);
      expect(result).not.toBeNull();
      // The status object comes from the seed repo – it has at minimum a `branch` field.
      expect(result as Record<string, unknown>).toHaveProperty("branch");
    });

    it(`${cmd} with an unknown repoId returns null`, () => {
      const state = freshState();
      const result = gitStub(cmd, { repoId: "repo-does-not-exist" }, state);
      expect(result).toBeNull();
    });

    it(`${cmd} with no repoId returns null`, () => {
      const state = freshState();
      const result = gitStub(cmd, {}, state);
      expect(result).toBeNull();
    });
  }
});

describe("gitStub — git_fetch_all", () => {
  it("returns the number of seed repos", () => {
    const state = freshState();
    const result = gitStub("git_fetch_all", {}, state);
    expect(result).toBe(DEFAULT_SEED.repos.length);
  });
});

describe("gitStub — git_pull_all", () => {
  it("returns the number of seed repos", () => {
    const state = freshState();
    const result = gitStub("git_pull_all", {}, state);
    expect(result).toBe(DEFAULT_SEED.repos.length);
  });
});

describe("gitStub — git_list_branches", () => {
  it("returns an array of three branch objects for a known repo", () => {
    const state = freshState();
    const result = gitStub("git_list_branches", { repoId: REPO_A }, state) as Array<
      Record<string, unknown>
    >;
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
  });

  it("head branch uses the repo's actual branch name and is marked isCurrent", () => {
    const state = freshState();
    const repoA = DEFAULT_SEED.repos.find((r) => r.id === REPO_A)!;
    const headBranch = (repoA.status as unknown as Record<string, unknown>).branch as string;
    const result = gitStub("git_list_branches", { repoId: REPO_A }, state) as Array<
      Record<string, unknown>
    >;
    const head = result.find((b) => b.isCurrent === true);
    expect(head).toBeDefined();
    expect(head!.name).toBe(headBranch);
    expect(head!.isRemote).toBe(false);
    expect(head!.upstream).toBe(`origin/${headBranch}`);
  });

  it("second branch is develop and is not current", () => {
    const state = freshState();
    const result = gitStub("git_list_branches", { repoId: REPO_A }, state) as Array<
      Record<string, unknown>
    >;
    const develop = result.find((b) => b.name === "develop");
    expect(develop).toBeDefined();
    expect(develop!.isCurrent).toBe(false);
    expect(develop!.clean).toBe(true);
  });

  it("third branch is a remote branch with no upstream", () => {
    const state = freshState();
    const result = gitStub("git_list_branches", { repoId: REPO_A }, state) as Array<
      Record<string, unknown>
    >;
    const main = result.find((b) => b.isRemote === true);
    expect(main).toBeDefined();
    expect(main!.upstream).toBeNull();
    expect(main!.remote).toBe("origin");
  });

  it("head branch ahead/behind reflects seed repo values", () => {
    const state = freshState();
    // repo-local-dev-stacks has ahead=2 behind=0 in the seed
    const result = gitStub("git_list_branches", { repoId: REPO_B }, state) as Array<
      Record<string, unknown>
    >;
    const head = result.find((b) => b.isCurrent === true)!;
    expect(head.ahead).toBe(2);
    expect(head.behind).toBe(0);
    expect(head.clean).toBe(false); // ahead !== 0
  });

  it("each branch has a lastCommit with sha and subject", () => {
    const state = freshState();
    const result = gitStub("git_list_branches", { repoId: REPO_A }, state) as Array<
      Record<string, unknown>
    >;
    for (const branch of result) {
      const lc = branch.lastCommit as Record<string, unknown>;
      expect(typeof lc.sha).toBe("string");
      expect(typeof lc.subject).toBe("string");
    }
  });

  it("falls back to main branch name when repoId is unknown", () => {
    const state = freshState();
    const result = gitStub("git_list_branches", { repoId: "nonexistent" }, state) as Array<
      Record<string, unknown>
    >;
    const head = result.find((b) => b.isCurrent === true)!;
    expect(head.name).toBe("main");
    // ahead and behind default to 0 → clean === true
    expect(head.clean).toBe(true);
  });
});

describe("gitStub — git_merge", () => {
  it("returns status and an empty conflicts array for a known repo", () => {
    const state = freshState();
    const result = gitStub("git_merge", { repoId: REPO_A }, state) as Record<string, unknown>;
    expect(result).toHaveProperty("status");
    expect(result.conflicts).toEqual([]);
  });

  it("status is null for an unknown repo", () => {
    const state = freshState();
    const result = gitStub("git_merge", { repoId: "nope" }, state) as Record<string, unknown>;
    expect(result.status).toBeNull();
  });
});

describe("gitStub — git_clone", () => {
  it("returns the first seed repo", () => {
    const state = freshState();
    const result = gitStub("git_clone", {}, state) as Record<string, unknown>;
    expect(result).not.toBeNull();
    expect(result.id).toBe(REPO_A);
  });
});

describe("gitStub — git_stage / git_unstage / git_commit", () => {
  const stageCmds = ["git_stage", "git_unstage", "git_commit"];
  for (const cmd of stageCmds) {
    it(`${cmd} returns repo status for known repo`, () => {
      const state = freshState();
      const result = gitStub(cmd, { repoId: REPO_A }, state) as Record<string, unknown>;
      expect(result).toHaveProperty("branch");
    });

    it(`${cmd} returns null for unknown repo`, () => {
      const state = freshState();
      expect(gitStub(cmd, { repoId: "unknown" }, state)).toBeNull();
    });
  }
});

describe("gitStub — git_discard", () => {
  it("discards all non-protected paths when force is false and none are protected", () => {
    const state = freshState();
    const paths = ["src/foo.ts", "src/bar.ts"];
    const result = gitStub("git_discard", { repoId: REPO_A, paths, force: false }, state) as Record<
      string,
      unknown
    >;
    expect(result.discarded).toEqual(paths);
    expect(result.requiresConfirmation).toEqual([]);
    expect(result).toHaveProperty("status");
  });

  it("puts protected files into requiresConfirmation when force is false", () => {
    const state = freshState();
    const paths = ["src/app.ts", ".env", "id_rsa", "cert.pem"];
    const result = gitStub("git_discard", { repoId: REPO_A, paths, force: false }, state) as Record<
      string,
      unknown
    >;
    const confirmed = result.requiresConfirmation as string[];
    expect(confirmed).toContain(".env");
    expect(confirmed).toContain("id_rsa");
    expect(confirmed).toContain("cert.pem");
    // src/app.ts is not protected
    expect(result.discarded as string[]).toContain("src/app.ts");
  });

  it("discards all paths including protected ones when force is true", () => {
    const state = freshState();
    const paths = [".env", "id_rsa.pub", "src/main.ts"];
    const result = gitStub("git_discard", { repoId: REPO_A, paths, force: true }, state) as Record<
      string,
      unknown
    >;
    expect(result.discarded).toEqual(paths);
    expect(result.requiresConfirmation).toEqual([]);
  });

  it("works with an empty paths array", () => {
    const state = freshState();
    const result = gitStub(
      "git_discard",
      { repoId: REPO_A, paths: [], force: false },
      state,
    ) as Record<string, unknown>;
    expect(result.discarded).toEqual([]);
    expect(result.requiresConfirmation).toEqual([]);
  });

  it("defaults to empty paths when paths arg is omitted", () => {
    const state = freshState();
    const result = gitStub("git_discard", { repoId: REPO_A }, state) as Record<string, unknown>;
    expect(result.discarded).toEqual([]);
    expect(result.requiresConfirmation).toEqual([]);
  });
});

describe("gitStub — isStubProtected helper coverage via git_discard", () => {
  const protectedNames = [
    ".env",
    ".env.local",
    ".env.production",
    "id_rsa",
    "id_ed25519",
    "server.pem",
    "cert.key",
    "keystore.p12",
    "keystore.pfx",
    "keystore.jks",
  ];
  for (const name of protectedNames) {
    it(`marks ${name} as protected`, () => {
      expect(isStubProtected(name)).toBe(true);
      expect(isStubProtected(`/path/to/${name}`)).toBe(true);
    });
  }

  it("does not protect regular source files", () => {
    for (const name of ["src/index.ts", "README.md", "package.json"]) {
      expect(isStubProtected(name)).toBe(false);
    }
  });
});

describe("gitStub — git_stash (mutations)", () => {
  it("creates a new stash entry and returns repo status", () => {
    const state = freshState();
    expect(state.stashByRepo.get(REPO_A)).toBeUndefined();

    const result = gitStub("git_stash", { repoId: REPO_A, message: "my stash" }, state);
    expect(result as Record<string, unknown>).toHaveProperty("branch");

    const entries = state.stashByRepo.get(REPO_A)!;
    expect(entries).toHaveLength(1);
    expect(entries[0]!.index).toBe(0);
    expect(entries[0]!.message).toBe("my stash");
    expect(typeof entries[0]!.oid).toBe("string");
  });

  it("uses default message when none is provided", () => {
    const state = freshState();
    gitStub("git_stash", { repoId: REPO_A }, state);
    const entries = state.stashByRepo.get(REPO_A)!;
    expect(entries[0]!.message).toBe("WIP on dev: stub stash");
  });

  it("prepends new stash entries and re-indexes", () => {
    const state = freshState();
    gitStub("git_stash", { repoId: REPO_A, message: "first" }, state);
    gitStub("git_stash", { repoId: REPO_A, message: "second" }, state);

    const entries = state.stashByRepo.get(REPO_A)!;
    expect(entries).toHaveLength(2);
    // Most recent (second) is at index 0
    expect(entries[0]!.message).toBe("second");
    expect(entries[0]!.index).toBe(0);
    expect(entries[1]!.message).toBe("first");
    expect(entries[1]!.index).toBe(1);
  });

  it("stashing for one repo does not affect another repo's stash", () => {
    const state = freshState();
    gitStub("git_stash", { repoId: REPO_A, message: "stash a" }, state);
    expect(state.stashByRepo.has(REPO_B)).toBe(false);
  });
});

describe("gitStub — git_stash_list", () => {
  it("returns empty array for a repo with no stashes", () => {
    const state = freshState();
    const result = gitStub("git_stash_list", { repoId: REPO_A }, state);
    expect(result).toEqual([]);
  });

  it("returns stash entries after creating them", () => {
    const state = freshState();
    gitStub("git_stash", { repoId: REPO_A, message: "stash1" }, state);
    gitStub("git_stash", { repoId: REPO_A, message: "stash2" }, state);
    const result = gitStub("git_stash_list", { repoId: REPO_A }, state) as Array<
      Record<string, unknown>
    >;
    expect(result).toHaveLength(2);
    expect(result[0]!.message).toBe("stash2");
  });

  it("defaults to empty repo string when repoId is missing", () => {
    const state = freshState();
    const result = gitStub("git_stash_list", {}, state);
    expect(result).toEqual([]);
  });
});

describe("gitStub — git_stash_pop and git_stash_drop", () => {
  for (const dropCmd of ["git_stash_pop", "git_stash_drop"] as const) {
    describe(dropCmd, () => {
      it("removes the entry at the given index and re-indexes", () => {
        const state = freshState();
        gitStub("git_stash", { repoId: REPO_A, message: "first" }, state);
        gitStub("git_stash", { repoId: REPO_A, message: "second" }, state);
        // Entries: [{index:0,message:"second"},{index:1,message:"first"}]

        gitStub(dropCmd, { repoId: REPO_A, index: 1 }, state);
        const entries = state.stashByRepo.get(REPO_A)!;
        expect(entries).toHaveLength(1);
        expect(entries[0]!.message).toBe("second");
        expect(entries[0]!.index).toBe(0);
      });

      it("returns the repo status object", () => {
        const state = freshState();
        gitStub("git_stash", { repoId: REPO_A, message: "tmp" }, state);
        const result = gitStub(dropCmd, { repoId: REPO_A, index: 0 }, state);
        expect(result as Record<string, unknown>).toHaveProperty("branch");
      });

      it("defaults index to 0 when not specified", () => {
        const state = freshState();
        gitStub("git_stash", { repoId: REPO_A, message: "x" }, state);
        gitStub("git_stash", { repoId: REPO_A, message: "y" }, state);
        // "y" is at index 0
        gitStub(dropCmd, { repoId: REPO_A }, state);
        const entries = state.stashByRepo.get(REPO_A)!;
        expect(entries).toHaveLength(1);
        expect(entries[0]!.message).toBe("x");
      });

      it("handles drop of non-existent index gracefully (list unchanged)", () => {
        const state = freshState();
        gitStub("git_stash", { repoId: REPO_A, message: "only" }, state);
        gitStub(dropCmd, { repoId: REPO_A, index: 99 }, state);
        // index 99 doesn't exist — list should be unchanged (length 1)
        expect(state.stashByRepo.get(REPO_A)).toHaveLength(1);
      });

      it("works on a repo with no stashes (empty list remains empty)", () => {
        const state = freshState();
        gitStub(dropCmd, { repoId: REPO_A, index: 0 }, state);
        // stashByRepo may or may not have an entry; if it does it should be empty
        const entries = state.stashByRepo.get(REPO_A) ?? [];
        expect(entries).toHaveLength(0);
      });
    });
  }
});

describe("gitStub — git_has_pre_commit_hook", () => {
  it("returns true for the seed repo that has a hook (repo-octo-notes)", () => {
    const state = freshState();
    // The state seeds preCommitHookRepos with "repo-octo-notes"
    expect(gitStub("git_has_pre_commit_hook", { repoId: "repo-octo-notes" }, state)).toBe(true);
  });

  it("returns false for repos without a pre-commit hook", () => {
    const state = freshState();
    expect(gitStub("git_has_pre_commit_hook", { repoId: REPO_A }, state)).toBe(false);
  });

  it("returns false for an unknown repo", () => {
    const state = freshState();
    expect(gitStub("git_has_pre_commit_hook", { repoId: "nonexistent" }, state)).toBe(false);
  });

  it("returns false when repoId is omitted (defaults to empty string)", () => {
    const state = freshState();
    expect(gitStub("git_has_pre_commit_hook", {}, state)).toBe(false);
  });
});
