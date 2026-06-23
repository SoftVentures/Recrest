import { describe, expect, it } from "vitest";

import { DEFAULT_SEED } from "@/lib/dev/seed";
import {
  type DevSeed,
  type DevStubState,
  type StubLayer,
  createDevStubState,
  createInitialLayers,
  findStubLayer,
  gitdirMatches,
  isStubProtected,
  repoLocalConfigPath,
  resolveLayers,
  resolveOrigins,
} from "@/lib/tauri/devStub.state";

// ---------------------------------------------------------------------------
// createDevStubState
// ---------------------------------------------------------------------------

describe("createDevStubState", () => {
  it("returns an object with all expected keys", () => {
    const state = createDevStubState(DEFAULT_SEED as unknown as DevSeed);
    expect(state).toHaveProperty("seed");
    expect(state).toHaveProperty("stashByRepo");
    expect(state).toHaveProperty("globalGitConfig");
    expect(state).toHaveProperty("layers");
    expect(state).toHaveProperty("preCommitHookRepos");
  });

  it("seed is the passed-in seed object", () => {
    const seed = DEFAULT_SEED as unknown as DevSeed;
    const state = createDevStubState(seed);
    expect(state.seed).toBe(seed);
  });

  it("stashByRepo is an empty Map", () => {
    const state = createDevStubState(DEFAULT_SEED as unknown as DevSeed);
    expect(state.stashByRepo).toBeInstanceOf(Map);
    expect(state.stashByRepo.size).toBe(0);
  });

  it("globalGitConfig contains user.name and user.email", () => {
    const state = createDevStubState(DEFAULT_SEED as unknown as DevSeed);
    expect(state.globalGitConfig["user.name"]).toBe("Dev Stub");
    expect(state.globalGitConfig["user.email"]).toBe("dev@example.invalid");
  });

  it("layers is a non-empty array", () => {
    const state = createDevStubState(DEFAULT_SEED as unknown as DevSeed);
    expect(Array.isArray(state.layers)).toBe(true);
    expect(state.layers.length).toBeGreaterThan(0);
  });

  it("preCommitHookRepos is a Set containing repo-octo-notes", () => {
    const state = createDevStubState(DEFAULT_SEED as unknown as DevSeed);
    expect(state.preCommitHookRepos).toBeInstanceOf(Set);
    expect(state.preCommitHookRepos.has("repo-octo-notes")).toBe(true);
  });

  it("preCommitHookRepos does not contain an arbitrary repo", () => {
    const state = createDevStubState(DEFAULT_SEED as unknown as DevSeed);
    expect(state.preCommitHookRepos.has("repo-recrest")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createInitialLayers
// ---------------------------------------------------------------------------

describe("createInitialLayers", () => {
  it("returns an array of 4 layers", () => {
    const layers = createInitialLayers();
    expect(layers).toHaveLength(4);
  });

  it("first layer has no condition (global gitconfig)", () => {
    const layers = createInitialLayers();
    expect(layers[0]!.condition).toBeNull();
    expect(layers[0]!.active).toBe(true);
    expect(layers[0]!.exists).toBe(true);
  });

  it("first layer entries include core git settings", () => {
    const layers = createInitialLayers();
    const entries = layers[0]!.entries;
    expect(entries["user.name"]).toBe("Dev Stub");
    expect(entries["user.email"]).toBe("dev@example.invalid");
    expect(entries["init.defaultBranch"]).toBe("main");
  });

  it("remaining three layers have gitdir: conditions and are initially inactive", () => {
    const layers = createInitialLayers();
    for (const layer of layers.slice(1)) {
      expect(layer.condition).not.toBeNull();
      expect(layer.condition!.startsWith("gitdir:")).toBe(true);
      expect(layer.active).toBe(false);
    }
  });

  it("each layer has path, condition, active, exists, entries", () => {
    const layers = createInitialLayers();
    for (const layer of layers) {
      expect(layer).toHaveProperty("path");
      expect(layer).toHaveProperty("condition");
      expect(layer).toHaveProperty("active");
      expect(layer).toHaveProperty("exists");
      expect(layer).toHaveProperty("entries");
    }
  });

  it("each call returns a new independent array (not shared reference)", () => {
    const a = createInitialLayers();
    const b = createInitialLayers();
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// gitdirMatches
// ---------------------------------------------------------------------------

describe("gitdirMatches", () => {
  it("returns false when condition does not start with 'gitdir:'", () => {
    expect(gitdirMatches("includeIf:something", "/some/path")).toBe(false);
  });

  it("returns false for a plain string with no 'gitdir:' prefix", () => {
    expect(gitdirMatches("/Users/dev/.gitconfig-work", "/Users/dev/Developer/work/")).toBe(false);
  });

  it("returns false for a condition with a glob '*'", () => {
    expect(gitdirMatches("gitdir:~/Code/*", "/Users/dev/Code/project")).toBe(false);
  });

  it("returns false for a condition with a glob '?'", () => {
    expect(gitdirMatches("gitdir:~/Code/?", "/Users/dev/Code/x")).toBe(false);
  });

  it("returns true when target starts with the trailing-slash prefix", () => {
    expect(
      gitdirMatches("gitdir:/Users/dev/Developer/work/", "/Users/dev/Developer/work/myrepo"),
    ).toBe(true);
  });

  it("returns true for an exact trailing-slash match (target is the prefix itself)", () => {
    expect(gitdirMatches("gitdir:/Users/dev/Developer/work/", "/Users/dev/Developer/work/")).toBe(
      true,
    );
  });

  it("returns false when the target does not start with the trailing-slash prefix", () => {
    expect(
      gitdirMatches("gitdir:/Users/dev/Developer/work/", "/Users/dev/Developer/oss/myrepo"),
    ).toBe(false);
  });

  it("returns true for an exact match without trailing slash", () => {
    expect(gitdirMatches("gitdir:/exact/path", "/exact/path")).toBe(true);
  });

  it("returns false when exact-match condition differs from target", () => {
    expect(gitdirMatches("gitdir:/exact/path", "/exact/path/extra")).toBe(false);
  });

  it("trims whitespace around the pattern", () => {
    expect(
      gitdirMatches("gitdir: /Users/dev/Developer/work/", "/Users/dev/Developer/work/foo"),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// repoLocalConfigPath
// ---------------------------------------------------------------------------

describe("repoLocalConfigPath", () => {
  it("returns a path ending in /.git/config", () => {
    const path = repoLocalConfigPath("repo-recrest");
    expect(path.endsWith("/.git/config")).toBe(true);
  });

  it("embeds the full repoId in the path", () => {
    const path = repoLocalConfigPath("repo-recrest");
    expect(path).toContain("repo-recrest");
  });

  it("works for an arbitrary repoId", () => {
    const path = repoLocalConfigPath("repo-signal-lab");
    expect(path).toBe("/Users/dev/Developer/repo-signal-lab/.git/config");
  });
});

// ---------------------------------------------------------------------------
// resolveLayers
// ---------------------------------------------------------------------------

describe("resolveLayers", () => {
  function makeState(): DevStubState {
    return createDevStubState(DEFAULT_SEED as unknown as DevSeed);
  }

  it("with repoId null, all layers are returned", () => {
    const state = makeState();
    const layers = resolveLayers(state, null);
    // Global + 3 conditional (no appended local)
    expect(layers.length).toBe(state.layers.length);
  });

  it("with repoId null, all conditional layers are marked active (global view)", () => {
    const state = makeState();
    const layers = resolveLayers(state, null);
    const conditional = layers.filter((l) => l.condition !== null);
    for (const layer of conditional) {
      expect(layer.active).toBe(true);
    }
  });

  it("with a specific repoId, appends a local config layer", () => {
    const state = makeState();
    const layers = resolveLayers(state, "repo-recrest");
    expect(layers.length).toBe(state.layers.length + 1);
    const last = layers[layers.length - 1]!;
    expect(last.path).toContain("repo-recrest");
    expect(last.path.endsWith("/.git/config")).toBe(true);
  });

  it("local config layer has no condition and is active", () => {
    const state = makeState();
    const layers = resolveLayers(state, "repo-recrest");
    const last = layers[layers.length - 1]!;
    expect(last.condition).toBeNull();
    expect(last.active).toBe(true);
  });

  it("local config layer entries include remote.origin.url", () => {
    const state = makeState();
    const layers = resolveLayers(state, "repo-recrest");
    const last = layers[layers.length - 1]!;
    expect(last.entries).toHaveProperty("remote.origin.url");
  });

  it("repoId strips the 'repo-' prefix from the developer path in the URL", () => {
    const state = makeState();
    const layers = resolveLayers(state, "repo-signal-lab");
    const last = layers[layers.length - 1]!;
    const url = last.entries["remote.origin.url"]!;
    expect(url).toContain("signal-lab");
    expect(url).not.toContain("repo-signal-lab");
  });

  it("conditional layers become inactive when target path does not match their gitdir prefix", () => {
    const state = makeState();
    // repo-recrest → target path /Users/dev/Developer/recrest
    // The conditional layers use /Developer/work/, /Developer/open-source/, /Developer/private/
    const layers = resolveLayers(state, "repo-recrest");
    const conditionalLayers = layers.filter((l) => l.condition !== null);
    // "open-source" prefix → /Developer/open-source/ does NOT match /Developer/recrest
    // so at least some conditional layers should be inactive
    const inactiveLayers = conditionalLayers.filter((l) => !l.active);
    expect(inactiveLayers.length).toBeGreaterThan(0);
  });

  it("does not mutate the state.layers array", () => {
    const state = makeState();
    const originalLength = state.layers.length;
    resolveLayers(state, "repo-recrest");
    expect(state.layers.length).toBe(originalLength);
  });
});

// ---------------------------------------------------------------------------
// resolveOrigins
// ---------------------------------------------------------------------------

describe("resolveOrigins", () => {
  it("skips inactive layers", () => {
    const layers: StubLayer[] = [
      {
        path: "/a",
        condition: null,
        active: true,
        exists: true,
        entries: { "user.name": "Active" },
      },
      {
        path: "/b",
        condition: "gitdir:/some/",
        active: false,
        exists: true,
        entries: { "user.name": "Inactive" },
      },
    ];
    const origins = resolveOrigins(layers);
    expect(origins["user.name"]?.value).toBe("Active");
  });

  it("later active layer overrides an earlier active layer", () => {
    const layers: StubLayer[] = [
      {
        path: "/global",
        condition: null,
        active: true,
        exists: true,
        entries: { "user.email": "global@example.com" },
      },
      {
        path: "/local",
        condition: null,
        active: true,
        exists: true,
        entries: { "user.email": "local@example.com" },
      },
    ];
    const origins = resolveOrigins(layers);
    expect(origins["user.email"]?.value).toBe("local@example.com");
    expect(origins["user.email"]?.sourcePath).toBe("/local");
  });

  it("returns sourcePath and sourceCondition alongside value", () => {
    const layers: StubLayer[] = [
      {
        path: "/path/to/config",
        condition: "gitdir:/some/",
        active: true,
        exists: true,
        entries: { "commit.gpgsign": "true" },
      },
    ];
    const origins = resolveOrigins(layers);
    expect(origins["commit.gpgsign"]).toEqual({
      value: "true",
      sourcePath: "/path/to/config",
      sourceCondition: "gitdir:/some/",
    });
  });

  it("returns an empty object when all layers are inactive", () => {
    const layers: StubLayer[] = [
      {
        path: "/b",
        condition: "gitdir:/some/",
        active: false,
        exists: true,
        entries: { "user.name": "Nobody" },
      },
    ];
    const origins = resolveOrigins(layers);
    expect(Object.keys(origins)).toHaveLength(0);
  });

  it("collects keys from multiple active layers with no conflicts", () => {
    const layers: StubLayer[] = [
      {
        path: "/a",
        condition: null,
        active: true,
        exists: true,
        entries: { "user.name": "Alice" },
      },
      {
        path: "/b",
        condition: null,
        active: true,
        exists: true,
        entries: { "user.email": "alice@example.com" },
      },
    ];
    const origins = resolveOrigins(layers);
    expect(origins["user.name"]?.value).toBe("Alice");
    expect(origins["user.email"]?.value).toBe("alice@example.com");
  });
});

// ---------------------------------------------------------------------------
// findStubLayer
// ---------------------------------------------------------------------------

describe("findStubLayer", () => {
  function makeState(): DevStubState {
    return createDevStubState(DEFAULT_SEED as unknown as DevSeed);
  }

  it("finds the global gitconfig layer by its exact path", () => {
    const state = makeState();
    const layer = findStubLayer(state, "/Users/dev/.gitconfig");
    expect(layer).toBeDefined();
    expect(layer!.path).toBe("/Users/dev/.gitconfig");
  });

  it("finds a conditional layer by its exact path", () => {
    const state = makeState();
    const layer = findStubLayer(state, "/Users/dev/.gitconfig-work");
    expect(layer).toBeDefined();
    expect(layer!.condition).toBe("gitdir:/Users/dev/Developer/work/");
  });

  it("returns undefined for a path that does not exist in state.layers", () => {
    const state = makeState();
    const layer = findStubLayer(state, "/nonexistent/path/.gitconfig");
    expect(layer).toBeUndefined();
  });

  it("returns the first matching layer (no duplicates expected)", () => {
    const state = makeState();
    const path = "/Users/dev/.gitconfig-oss";
    const layer = findStubLayer(state, path);
    expect(layer).toBeDefined();
    expect(layer!.entries["user.email"]).toBe("oss@example.invalid");
  });
});

// ---------------------------------------------------------------------------
// isStubProtected
// ---------------------------------------------------------------------------

describe("isStubProtected", () => {
  it("recognizes '.env' as protected", () => {
    expect(isStubProtected("/project/.env")).toBe(true);
  });

  it("recognizes '.npmrc' as protected", () => {
    expect(isStubProtected("/home/user/.npmrc")).toBe(true);
  });

  it("recognizes '.env.*' pattern — .env.local", () => {
    expect(isStubProtected("/project/.env.local")).toBe(true);
  });

  it("recognizes '.env.*' pattern — .env.production", () => {
    expect(isStubProtected("/project/.env.production")).toBe(true);
  });

  it("recognizes 'id_*' pattern — id_rsa", () => {
    expect(isStubProtected("/home/user/.ssh/id_rsa")).toBe(true);
  });

  it("recognizes 'id_*' pattern — id_ed25519", () => {
    expect(isStubProtected("/home/user/.ssh/id_ed25519")).toBe(true);
  });

  it("recognizes '*.pem' extension", () => {
    expect(isStubProtected("/certs/server.pem")).toBe(true);
  });

  it("recognizes '*.key' extension", () => {
    expect(isStubProtected("/certs/private.key")).toBe(true);
  });

  it("recognizes '*.p12' extension", () => {
    expect(isStubProtected("/certs/keystore.p12")).toBe(true);
  });

  it("recognizes '*.pfx' extension", () => {
    expect(isStubProtected("/certs/cert.pfx")).toBe(true);
  });

  it("recognizes '*.jks' extension", () => {
    expect(isStubProtected("/app/keys.jks")).toBe(true);
  });

  it("returns false for a normal source file", () => {
    expect(isStubProtected("/project/src/index.ts")).toBe(false);
  });

  it("returns false for a README.md", () => {
    expect(isStubProtected("/project/README.md")).toBe(false);
  });

  it("returns false for a file that merely contains 'env' in the middle", () => {
    // 'environment.ts' is not an .env or .env.* file
    expect(isStubProtected("/project/src/environment.ts")).toBe(false);
  });

  it("returns false for a file named 'env' (no leading dot)", () => {
    expect(isStubProtected("/project/env")).toBe(false);
  });

  it("works when path has no directory component (bare filename)", () => {
    expect(isStubProtected(".env")).toBe(true);
    expect(isStubProtected("id_rsa")).toBe(true);
    expect(isStubProtected("main.ts")).toBe(false);
  });
});
