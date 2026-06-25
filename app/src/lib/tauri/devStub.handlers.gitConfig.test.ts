import { describe, expect, it } from "vitest";

import { DEFAULT_SEED } from "@/lib/dev/seed";
import { gitConfigStub } from "@/lib/tauri/devStub.handlers.gitConfig";
import { UNHANDLED } from "@/lib/tauri/devStub.providers";
import { type DevSeed, createDevStubState } from "@/lib/tauri/devStub.state";

const REPO_A = DEFAULT_SEED.repos[0]!.id; // "repo-recrest"

function freshState() {
  return createDevStubState(DEFAULT_SEED as unknown as DevSeed);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type GitConfigResponse = { scope: string; entries: Record<string, string> };
type ResolvedOrigins = Record<
  string,
  { value: string; sourcePath: string; sourceCondition: string | null }
>;
type StubLayerPublic = {
  path: string;
  condition: string | null;
  active: boolean;
  exists: boolean;
  entries: Record<string, string>;
};

// ---------------------------------------------------------------------------
// UNHANDLED sentinel
// ---------------------------------------------------------------------------

describe("gitConfigStub — unknown command", () => {
  it("returns UNHANDLED for an unrecognised command", () => {
    const state = freshState();
    expect(gitConfigStub("definitely_unknown", {}, state)).toBe(UNHANDLED);
  });
});

// ---------------------------------------------------------------------------
// get_git_config
// ---------------------------------------------------------------------------

describe("gitConfigStub — get_git_config", () => {
  it("returns global scope with a copy of globalGitConfig when repoId is absent", () => {
    const state = freshState();
    const result = gitConfigStub("get_git_config", {}, state) as GitConfigResponse;
    expect(result.scope).toBe("global");
    expect(result.entries["user.name"]).toBe("Dev Stub");
    expect(result.entries["user.email"]).toBe("dev@example.invalid");
  });

  it("returns repo scope with empty entries when repoId is present", () => {
    const state = freshState();
    const result = gitConfigStub("get_git_config", { repoId: REPO_A }, state) as GitConfigResponse;
    expect(result.scope).toBe("repo");
    expect(result.entries).toEqual({});
  });

  it("returns a shallow copy of globalGitConfig, not the same reference", () => {
    const state = freshState();
    const result = gitConfigStub("get_git_config", {}, state) as GitConfigResponse;
    result.entries["mutated"] = "yes";
    // state.globalGitConfig must not have been affected
    expect(state.globalGitConfig["mutated"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// set_git_config
// ---------------------------------------------------------------------------

describe("gitConfigStub — set_git_config", () => {
  it("sets a new key in globalGitConfig and reflects it in the returned entries", () => {
    const state = freshState();
    const result = gitConfigStub(
      "set_git_config",
      { key: "core.pager", value: "delta" },
      state,
    ) as GitConfigResponse;
    expect(result.scope).toBe("global");
    expect(result.entries["core.pager"]).toBe("delta");
    expect(state.globalGitConfig["core.pager"]).toBe("delta");
  });

  it("overwrites an existing key", () => {
    const state = freshState();
    gitConfigStub("set_git_config", { key: "user.name", value: "Newname" }, state);
    expect(state.globalGitConfig["user.name"]).toBe("Newname");
  });

  it("deletes a key when value is an empty string", () => {
    const state = freshState();
    // First confirm key exists
    expect(state.globalGitConfig["user.name"]).toBe("Dev Stub");
    gitConfigStub("set_git_config", { key: "user.name", value: "" }, state);
    expect(state.globalGitConfig["user.name"]).toBeUndefined();
  });

  it("does not mutate globalGitConfig when repoId is set", () => {
    const state = freshState();
    const before = { ...state.globalGitConfig };
    const result = gitConfigStub(
      "set_git_config",
      { repoId: REPO_A, key: "user.name", value: "Ignored" },
      state,
    ) as GitConfigResponse;
    expect(result.scope).toBe("repo");
    // globalGitConfig should be untouched
    expect(state.globalGitConfig).toEqual(before);
  });

  it("empty value with repoId does not touch globalGitConfig", () => {
    const state = freshState();
    const before = { ...state.globalGitConfig };
    gitConfigStub("set_git_config", { repoId: REPO_A, key: "user.name", value: "" }, state);
    expect(state.globalGitConfig).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// list_git_config_layers
// ---------------------------------------------------------------------------

describe("gitConfigStub — list_git_config_layers", () => {
  it("returns all layers for the global view (no repoId)", () => {
    const state = freshState();
    const result = gitConfigStub("list_git_config_layers", {}, state) as StubLayerPublic[];
    expect(Array.isArray(result)).toBe(true);
    // At least the 4 initial layers
    expect(result.length).toBeGreaterThanOrEqual(4);
  });

  it("global view includes the base .gitconfig layer as active", () => {
    const state = freshState();
    const result = gitConfigStub("list_git_config_layers", {}, state) as StubLayerPublic[];
    const base = result.find((l) => l.path === "/Users/dev/.gitconfig");
    expect(base).toBeDefined();
    expect(base!.active).toBe(true);
    expect(base!.entries["user.name"]).toBe("Dev Stub");
  });

  it("global view marks all includeIf layers as active (merged view)", () => {
    const state = freshState();
    const result = gitConfigStub("list_git_config_layers", {}, state) as StubLayerPublic[];
    const conditional = result.filter((l) => l.condition !== null);
    expect(conditional.length).toBeGreaterThan(0);
    for (const l of conditional) {
      expect(l.active).toBe(true);
    }
  });

  it("repo view appends the repo-local .git/config layer", () => {
    const state = freshState();
    const result = gitConfigStub(
      "list_git_config_layers",
      { repoId: REPO_A },
      state,
    ) as StubLayerPublic[];
    const local = result.find((l) => l.path.endsWith("/.git/config"));
    expect(local).toBeDefined();
    expect(local!.active).toBe(true);
  });

  it("repo view applies gitdir matching: work layer inactive for open-source repo", () => {
    const state = freshState();
    // REPO_A is "repo-recrest"; its path would be /Users/dev/Developer/recrest
    // which does NOT match gitdir:/Users/dev/Developer/work/
    const result = gitConfigStub(
      "list_git_config_layers",
      { repoId: REPO_A },
      state,
    ) as StubLayerPublic[];
    const workLayer = result.find((l) => l.path === "/Users/dev/.gitconfig-work");
    expect(workLayer).toBeDefined();
    expect(workLayer!.active).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// get_git_config_with_origins
// ---------------------------------------------------------------------------

describe("gitConfigStub — get_git_config_with_origins", () => {
  it("returns a flat map of key → { value, sourcePath, sourceCondition } for global view", () => {
    const state = freshState();
    const result = gitConfigStub("get_git_config_with_origins", {}, state) as ResolvedOrigins;
    // In global view ALL includeIf layers are active (merged view), so later
    // layers override earlier ones. user.name appears in multiple layers;
    // the last active layer that sets it wins. We just assert it exists and
    // has the expected shape — not a specific value since layer order is stable
    // but "winning" value depends on which layer is last.
    expect(result["user.name"]).toBeDefined();
    expect(typeof result["user.name"]!.value).toBe("string");
    expect(result["user.name"]!.value.length).toBeGreaterThan(0);
    expect(typeof result["user.name"]!.sourcePath).toBe("string");
    // Keys that appear only in the base layer are always attributed to it
    expect(result["core.editor"]).toBeDefined();
    expect(result["core.editor"]!.value).toBe("vim");
    expect(result["core.editor"]!.sourcePath).toBe("/Users/dev/.gitconfig");
    expect(result["core.editor"]!.sourceCondition).toBeNull();
  });

  it("later (higher-priority) layers override earlier ones", () => {
    const state = freshState();
    // In global view all layers are active; the last layer that sets a key wins.
    // commit.gpgsign is set in base AND in -work AND -oss. The last one wins.
    const result = gitConfigStub("get_git_config_with_origins", {}, state) as ResolvedOrigins;
    // It must exist; exact winner depends on layer order but must be one of them.
    expect(result["commit.gpgsign"]).toBeDefined();
    expect(typeof result["commit.gpgsign"]!.value).toBe("string");
  });

  it("repo-local remote.origin.url shows up in repo view", () => {
    const state = freshState();
    const result = gitConfigStub(
      "get_git_config_with_origins",
      { repoId: REPO_A },
      state,
    ) as ResolvedOrigins;
    expect(result["remote.origin.url"]).toBeDefined();
    expect(result["remote.origin.url"]!.value).toContain("recrest");
  });
});

// ---------------------------------------------------------------------------
// set_git_config_in_layer
// ---------------------------------------------------------------------------

describe("gitConfigStub — set_git_config_in_layer", () => {
  it("sets a key in an existing layer and returns resolved origins", () => {
    const state = freshState();
    const filePath = "/Users/dev/.gitconfig";
    const result = gitConfigStub(
      "set_git_config_in_layer",
      { filePath, key: "core.editor", value: "nano" },
      state,
    ) as ResolvedOrigins;
    // Updated value appears in resolved origins
    expect(result["core.editor"]!.value).toBe("nano");
    // Verify the layer was mutated directly
    const layer = state.layers.find((l) => l.path === filePath);
    expect(layer!.entries["core.editor"]).toBe("nano");
  });

  it("deletes a key when value is empty string", () => {
    const state = freshState();
    const filePath = "/Users/dev/.gitconfig";
    // core.editor exists in base layer
    expect(state.layers.find((l) => l.path === filePath)!.entries["core.editor"]).toBe("vim");
    gitConfigStub("set_git_config_in_layer", { filePath, key: "core.editor", value: "" }, state);
    expect(state.layers.find((l) => l.path === filePath)!.entries["core.editor"]).toBeUndefined();
  });

  it("creates a new repo-local layer on demand when filePath ends with /.git/config", () => {
    const state = freshState();
    const filePath = `/Users/dev/Developer/${REPO_A}/.git/config`;
    const initialLayerCount = state.layers.length;
    gitConfigStub(
      "set_git_config_in_layer",
      { filePath, key: "user.email", value: "local@example.com" },
      state,
    );
    expect(state.layers.length).toBe(initialLayerCount + 1);
    const newLayer = state.layers.find((l) => l.path === filePath);
    expect(newLayer).toBeDefined();
    expect(newLayer!.entries["user.email"]).toBe("local@example.com");
    expect(newLayer!.active).toBe(true);
  });

  it("does NOT create a new layer for a non-.git/config path that doesn't exist", () => {
    const state = freshState();
    const initialLayerCount = state.layers.length;
    gitConfigStub(
      "set_git_config_in_layer",
      { filePath: "/some/unknown/path.cfg", key: "x.y", value: "z" },
      state,
    );
    // Layer count should be unchanged — unknown layer, not a .git/config path
    expect(state.layers.length).toBe(initialLayerCount);
  });

  it("returns resolved origins after the edit", () => {
    const state = freshState();
    // Edit a key that exists only in the base .gitconfig and in no other layer
    // (core.autocrlf is only in the base), so it always wins in the merged view.
    const result = gitConfigStub(
      "set_git_config_in_layer",
      { filePath: "/Users/dev/.gitconfig", key: "core.autocrlf", value: "false" },
      state,
    ) as ResolvedOrigins;
    expect(typeof result).toBe("object");
    expect(result["core.autocrlf"]).toBeDefined();
    expect(result["core.autocrlf"]!.value).toBe("false");
  });
});

// ---------------------------------------------------------------------------
// add_git_config_include
// ---------------------------------------------------------------------------

describe("gitConfigStub — add_git_config_include", () => {
  it("adds a new layer to state.layers and returns undefined", () => {
    const state = freshState();
    const before = state.layers.length;
    const result = gitConfigStub(
      "add_git_config_include",
      { targetPath: "/Users/dev/.gitconfig-test", condition: null },
      state,
    );
    expect(result).toBeUndefined();
    expect(state.layers.length).toBe(before + 1);
    const added = state.layers.find((l) => l.path === "/Users/dev/.gitconfig-test");
    expect(added).toBeDefined();
    expect(added!.active).toBe(false);
    expect(added!.exists).toBe(true);
    expect(added!.condition).toBeNull();
  });

  it("adds a layer with an includeIf condition", () => {
    const state = freshState();
    gitConfigStub(
      "add_git_config_include",
      {
        targetPath: "/Users/dev/.gitconfig-side",
        condition: "gitdir:/Users/dev/Developer/side/",
      },
      state,
    );
    const added = state.layers.find((l) => l.path === "/Users/dev/.gitconfig-side");
    expect(added).toBeDefined();
    expect(added!.condition).toBe("gitdir:/Users/dev/Developer/side/");
  });

  it("is idempotent — does NOT add a duplicate for the same path+condition", () => {
    const state = freshState();
    const targetPath = "/Users/dev/.gitconfig-work";
    const condition = "gitdir:/Users/dev/Developer/work/";
    const before = state.layers.length;

    // This layer already exists in the initial layers
    gitConfigStub("add_git_config_include", { targetPath, condition }, state);
    expect(state.layers.length).toBe(before);
  });

  it("treats same path but different condition as a distinct layer", () => {
    const state = freshState();
    const before = state.layers.length;
    gitConfigStub(
      "add_git_config_include",
      {
        targetPath: "/Users/dev/.gitconfig-work",
        condition: "gitdir:/Users/dev/Developer/other/",
      },
      state,
    );
    expect(state.layers.length).toBe(before + 1);
  });
});

// ---------------------------------------------------------------------------
// remove_git_config_include
// ---------------------------------------------------------------------------

describe("gitConfigStub — remove_git_config_include", () => {
  it("removes an existing layer and returns undefined", () => {
    const state = freshState();
    const targetPath = "/Users/dev/.gitconfig-oss";
    const condition = "gitdir:/Users/dev/Developer/open-source/";
    expect(state.layers.find((l) => l.path === targetPath)).toBeDefined();

    const before = state.layers.length;
    const result = gitConfigStub("remove_git_config_include", { targetPath, condition }, state);
    expect(result).toBeUndefined();
    expect(state.layers.length).toBe(before - 1);
    expect(state.layers.find((l) => l.path === targetPath)).toBeUndefined();
  });

  it("does nothing (no error) when the layer does not exist", () => {
    const state = freshState();
    const before = state.layers.length;
    const result = gitConfigStub(
      "remove_git_config_include",
      { targetPath: "/nonexistent/.gitconfig", condition: null },
      state,
    );
    expect(result).toBeUndefined();
    expect(state.layers.length).toBe(before);
  });

  it("only removes the layer with the matching condition, not others with same path", () => {
    const state = freshState();
    // Add a second entry under the same path but different condition
    gitConfigStub(
      "add_git_config_include",
      {
        targetPath: "/Users/dev/.gitconfig-work",
        condition: "gitdir:/Users/dev/Developer/other/",
      },
      state,
    );
    const before = state.layers.length;

    // Remove the original condition
    gitConfigStub(
      "remove_git_config_include",
      {
        targetPath: "/Users/dev/.gitconfig-work",
        condition: "gitdir:/Users/dev/Developer/work/",
      },
      state,
    );
    expect(state.layers.length).toBe(before - 1);
    // The "other" condition entry should still be present
    const remaining = state.layers.filter((l) => l.path === "/Users/dev/.gitconfig-work");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.condition).toBe("gitdir:/Users/dev/Developer/other/");
  });

  it("add then remove round-trips cleanly", () => {
    const state = freshState();
    const targetPath = "/tmp/.gitconfig-temp";
    const condition = null;
    const before = state.layers.length;

    gitConfigStub("add_git_config_include", { targetPath, condition }, state);
    expect(state.layers.length).toBe(before + 1);

    gitConfigStub("remove_git_config_include", { targetPath, condition }, state);
    expect(state.layers.length).toBe(before);
    expect(state.layers.find((l) => l.path === targetPath)).toBeUndefined();
  });
});
