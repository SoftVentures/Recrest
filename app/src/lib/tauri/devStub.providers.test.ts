import { describe, expect, it } from "vitest";

import { UNHANDLED, providerFeatureStub } from "@/lib/tauri/devStub.providers";

// ---------------------------------------------------------------------------
// UNHANDLED symbol
// ---------------------------------------------------------------------------

describe("UNHANDLED", () => {
  it("is a Symbol", () => {
    expect(typeof UNHANDLED).toBe("symbol");
  });

  it("has description 'unhandled'", () => {
    expect(UNHANDLED.description).toBe("unhandled");
  });
});

// ---------------------------------------------------------------------------
// get_pr_diff
// ---------------------------------------------------------------------------

describe("providerFeatureStub / get_pr_diff", () => {
  it("returns an array of file diff objects", () => {
    const result = providerFeatureStub("get_pr_diff", {});
    expect(Array.isArray(result)).toBe(true);
    const files = result as Array<Record<string, unknown>>;
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it("first file has path, oldPath, status, hunks", () => {
    const files = providerFeatureStub("get_pr_diff", {}) as Array<Record<string, unknown>>;
    const first = files[0]!;
    expect(first).toHaveProperty("path");
    expect(first).toHaveProperty("oldPath");
    expect(first).toHaveProperty("status");
    expect(Array.isArray(first.hunks)).toBe(true);
  });

  it("first file is a modified file with null oldPath", () => {
    const files = providerFeatureStub("get_pr_diff", {}) as Array<Record<string, unknown>>;
    const first = files[0]!;
    expect(first.path).toBe("src/lib.rs");
    expect(first.oldPath).toBeNull();
    expect(first.status).toBe("modified");
  });

  it("second file is a renamed file with non-null oldPath", () => {
    const files = providerFeatureStub("get_pr_diff", {}) as Array<Record<string, unknown>>;
    const second = files[1]!;
    expect(second.path).toBe("README.md");
    expect(second.oldPath).toBe("OLD-README.md");
    expect(second.status).toBe("renamed");
  });

  it("hunks contain lines with kind, content, oldLineNo, newLineNo", () => {
    const files = providerFeatureStub("get_pr_diff", {}) as Array<Record<string, unknown>>;
    const hunk = (files[0]!.hunks as Array<Record<string, unknown>>)[0]!;
    const lines = hunk.lines as Array<Record<string, unknown>>;
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).toHaveProperty("kind");
      expect(line).toHaveProperty("content");
      expect(line).toHaveProperty("oldLineNo");
      expect(line).toHaveProperty("newLineNo");
    }
  });

  it("first file hunk has correct oldStart/oldLines/newStart/newLines", () => {
    const files = providerFeatureStub("get_pr_diff", {}) as Array<Record<string, unknown>>;
    const hunk = (files[0]!.hunks as Array<Record<string, unknown>>)[0]!;
    expect(hunk.oldStart).toBe(1);
    expect(hunk.oldLines).toBe(3);
    expect(hunk.newStart).toBe(1);
    expect(hunk.newLines).toBe(4);
  });

  it("includes remove lines with null newLineNo and add lines with null oldLineNo", () => {
    const files = providerFeatureStub("get_pr_diff", {}) as Array<Record<string, unknown>>;
    const lines = (files[0]!.hunks as Array<Record<string, unknown>>)[0]!.lines as Array<
      Record<string, unknown>
    >;
    const removeLine = lines.find((l) => l.kind === "remove")!;
    expect(removeLine.newLineNo).toBeNull();
    expect(removeLine.oldLineNo).not.toBeNull();

    const addLine = lines.find((l) => l.kind === "add")!;
    expect(addLine.oldLineNo).toBeNull();
    expect(addLine.newLineNo).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// post_pr_comment — single-line anchor (no start)
// ---------------------------------------------------------------------------

describe("providerFeatureStub / post_pr_comment — single-line anchor", () => {
  const singleLineArgs = {
    body: "Looks good!",
    path: "src/lib.rs",
    position: {
      start: null,
      end: { side: "RIGHT" as const, oldLineNo: null, newLineNo: 10 },
    },
  };

  it("returns an object with the expected shape", () => {
    const result = providerFeatureStub("post_pr_comment", singleLineArgs) as Record<
      string,
      unknown
    >;
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("author");
    expect(result).toHaveProperty("authorAvatarUrl");
    expect(result).toHaveProperty("body");
    expect(result).toHaveProperty("path");
    expect(result).toHaveProperty("side");
    expect(result).toHaveProperty("line");
    expect(result).toHaveProperty("startLine");
    expect(result).toHaveProperty("startSide");
    expect(result).toHaveProperty("createdAt");
  });

  it("id starts with 'dev-'", () => {
    const result = providerFeatureStub("post_pr_comment", singleLineArgs) as Record<
      string,
      unknown
    >;
    expect((result.id as string).startsWith("dev-")).toBe(true);
  });

  it("echoes body", () => {
    const result = providerFeatureStub("post_pr_comment", singleLineArgs) as Record<
      string,
      unknown
    >;
    expect(result.body).toBe("Looks good!");
  });

  it("echoes path", () => {
    const result = providerFeatureStub("post_pr_comment", singleLineArgs) as Record<
      string,
      unknown
    >;
    expect(result.path).toBe("src/lib.rs");
  });

  it("echoes end side and line", () => {
    const result = providerFeatureStub("post_pr_comment", singleLineArgs) as Record<
      string,
      unknown
    >;
    expect(result.side).toBe("RIGHT");
    expect(result.line).toBe(10);
  });

  it("startLine is null for a single-line anchor", () => {
    const result = providerFeatureStub("post_pr_comment", singleLineArgs) as Record<
      string,
      unknown
    >;
    expect(result.startLine).toBeNull();
  });

  it("startSide is null for a single-line anchor", () => {
    const result = providerFeatureStub("post_pr_comment", singleLineArgs) as Record<
      string,
      unknown
    >;
    expect(result.startSide).toBeNull();
  });

  it("handles null position (general / PR-level comment)", () => {
    const result = providerFeatureStub("post_pr_comment", {
      body: "General comment",
      path: null,
      position: null,
    }) as Record<string, unknown>;
    expect(result.line).toBeNull();
    expect(result.side).toBeNull();
    expect(result.startLine).toBeNull();
    expect(result.startSide).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// post_pr_comment — multi-line range anchor (start differs from end)
// ---------------------------------------------------------------------------

describe("providerFeatureStub / post_pr_comment — multi-line range", () => {
  const rangeArgs = {
    body: "Range nit",
    path: "src/lib.rs",
    position: {
      start: { side: "LEFT" as const, oldLineNo: 5, newLineNo: null },
      end: { side: "RIGHT" as const, oldLineNo: null, newLineNo: 10 },
    },
  };

  it("startLine is non-null for a range anchor", () => {
    const result = providerFeatureStub("post_pr_comment", rangeArgs) as Record<string, unknown>;
    expect(result.startLine).not.toBeNull();
    expect(result.startLine).toBe(5);
  });

  it("startSide is set to the start anchor's side", () => {
    const result = providerFeatureStub("post_pr_comment", rangeArgs) as Record<string, unknown>;
    expect(result.startSide).toBe("LEFT");
  });

  it("line reflects the end anchor's resolved line number", () => {
    const result = providerFeatureStub("post_pr_comment", rangeArgs) as Record<string, unknown>;
    expect(result.line).toBe(10);
  });

  it("side reflects the end anchor's side", () => {
    const result = providerFeatureStub("post_pr_comment", rangeArgs) as Record<string, unknown>;
    expect(result.side).toBe("RIGHT");
  });

  it("same-line same-side with start set is NOT treated as a range", () => {
    // start.side === end.side AND resolved lines are equal → isRange = false
    const sameSideLineArgs = {
      body: "nit",
      path: "src/lib.rs",
      position: {
        start: { side: "RIGHT" as const, oldLineNo: null, newLineNo: 10 },
        end: { side: "RIGHT" as const, oldLineNo: null, newLineNo: 10 },
      },
    };
    const result = providerFeatureStub("post_pr_comment", sameSideLineArgs) as Record<
      string,
      unknown
    >;
    expect(result.startLine).toBeNull();
    expect(result.startSide).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// list_workflows
// ---------------------------------------------------------------------------

describe("providerFeatureStub / list_workflows", () => {
  it("returns an array", () => {
    const result = providerFeatureStub("list_workflows", {});
    expect(Array.isArray(result)).toBe(true);
  });

  it("contains at least one workflow", () => {
    const workflows = providerFeatureStub("list_workflows", {}) as Array<Record<string, unknown>>;
    expect(workflows.length).toBeGreaterThanOrEqual(1);
  });

  it("first workflow has id, name, path, state, inputsSchema", () => {
    const workflows = providerFeatureStub("list_workflows", {}) as Array<Record<string, unknown>>;
    const wf = workflows[0]!;
    expect(wf).toHaveProperty("id");
    expect(wf).toHaveProperty("name");
    expect(wf).toHaveProperty("path");
    expect(wf).toHaveProperty("state");
    expect(wf).toHaveProperty("inputsSchema");
  });

  it("first workflow is active CI workflow", () => {
    const workflows = providerFeatureStub("list_workflows", {}) as Array<Record<string, unknown>>;
    const wf = workflows[0]!;
    expect(wf.id).toBe("1");
    expect(wf.name).toBe("CI");
    expect(wf.state).toBe("active");
    expect(wf.path).toBe(".github/workflows/ci.yml");
  });

  it("inputsSchema has three entries with different types", () => {
    const workflows = providerFeatureStub("list_workflows", {}) as Array<Record<string, unknown>>;
    const schema = workflows[0]!.inputsSchema as Array<Record<string, unknown>>;
    expect(schema).toHaveLength(3);
    const types = schema.map((s) => s.type);
    expect(types).toContain("choice");
    expect(types).toContain("string");
    expect(types).toContain("boolean");
  });

  it("choice input has a choices array", () => {
    const workflows = providerFeatureStub("list_workflows", {}) as Array<Record<string, unknown>>;
    const schema = workflows[0]!.inputsSchema as Array<Record<string, unknown>>;
    const choiceInput = schema.find((s) => s.type === "choice")!;
    expect(Array.isArray(choiceInput.choices)).toBe(true);
    expect((choiceInput.choices as string[]).length).toBeGreaterThan(0);
  });

  it("string input has null choices and a default value", () => {
    const workflows = providerFeatureStub("list_workflows", {}) as Array<Record<string, unknown>>;
    const schema = workflows[0]!.inputsSchema as Array<Record<string, unknown>>;
    const stringInput = schema.find((s) => s.type === "string")!;
    expect(stringInput.choices).toBeNull();
    expect(stringInput.default).toBe("latest");
  });
});

// ---------------------------------------------------------------------------
// list_workflow_runs
// ---------------------------------------------------------------------------

describe("providerFeatureStub / list_workflow_runs", () => {
  it("returns an array of two runs", () => {
    const runs = providerFeatureStub("list_workflow_runs", {}) as Array<Record<string, unknown>>;
    expect(runs).toHaveLength(2);
  });

  it("runs have id, runNumber, status, conclusion, headSha, createdAt, htmlUrl, actor", () => {
    const runs = providerFeatureStub("list_workflow_runs", {}) as Array<Record<string, unknown>>;
    for (const run of runs) {
      expect(run).toHaveProperty("id");
      expect(run).toHaveProperty("runNumber");
      expect(run).toHaveProperty("status");
      expect(run).toHaveProperty("conclusion");
      expect(run).toHaveProperty("headSha");
      expect(run).toHaveProperty("createdAt");
      expect(run).toHaveProperty("htmlUrl");
      expect(run).toHaveProperty("actor");
    }
  });

  it("first run is the most recent successful one", () => {
    const runs = providerFeatureStub("list_workflow_runs", {}) as Array<Record<string, unknown>>;
    const first = runs[0]!;
    expect(first.id).toBe("9001");
    expect(first.runNumber).toBe(42);
    expect(first.conclusion).toBe("success");
    expect(first.actor).toBe("alice");
  });

  it("second run has failure conclusion", () => {
    const runs = providerFeatureStub("list_workflow_runs", {}) as Array<Record<string, unknown>>;
    const second = runs[1]!;
    expect(second.id).toBe("9000");
    expect(second.conclusion).toBe("failure");
    expect(second.actor).toBe("bob");
  });

  it("first run was created more recently than second", () => {
    const runs = providerFeatureStub("list_workflow_runs", {}) as Array<Record<string, unknown>>;
    const t1 = new Date(runs[0]!.createdAt as string).getTime();
    const t2 = new Date(runs[1]!.createdAt as string).getTime();
    expect(t1).toBeGreaterThan(t2);
  });
});

// ---------------------------------------------------------------------------
// trigger_workflow
// ---------------------------------------------------------------------------

describe("providerFeatureStub / trigger_workflow", () => {
  it("returns a run object with queued status", () => {
    const result = providerFeatureStub("trigger_workflow", {}) as Record<string, unknown>;
    expect(result).toHaveProperty("id");
    expect(result.status).toBe("queued");
    expect(result.conclusion).toBeNull();
  });

  it("id starts with 'dev-'", () => {
    const result = providerFeatureStub("trigger_workflow", {}) as Record<string, unknown>;
    expect((result.id as string).startsWith("dev-")).toBe(true);
  });

  it("runNumber is 43", () => {
    const result = providerFeatureStub("trigger_workflow", {}) as Record<string, unknown>;
    expect(result.runNumber).toBe(43);
  });

  it("actor is 'you'", () => {
    const result = providerFeatureStub("trigger_workflow", {}) as Record<string, unknown>;
    expect(result.actor).toBe("you");
  });

  it("htmlUrl is a string", () => {
    const result = providerFeatureStub("trigger_workflow", {}) as Record<string, unknown>;
    expect(typeof result.htmlUrl).toBe("string");
    expect((result.htmlUrl as string).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// cancel_workflow_run
// ---------------------------------------------------------------------------

describe("providerFeatureStub / cancel_workflow_run", () => {
  it("returns undefined (fire-and-forget acknowledgment)", () => {
    const result = providerFeatureStub("cancel_workflow_run", {});
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// get_pages_status
// ---------------------------------------------------------------------------

describe("providerFeatureStub / get_pages_status", () => {
  it("returns an object with url, status, lastDeployedAt, customDomain", () => {
    const result = providerFeatureStub("get_pages_status", {}) as Record<string, unknown>;
    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("lastDeployedAt");
    expect(result).toHaveProperty("customDomain");
  });

  it("status is 'built'", () => {
    const result = providerFeatureStub("get_pages_status", {}) as Record<string, unknown>;
    expect(result.status).toBe("built");
  });

  it("url and customDomain are non-empty strings", () => {
    const result = providerFeatureStub("get_pages_status", {}) as Record<string, unknown>;
    expect(typeof result.url).toBe("string");
    expect((result.url as string).length).toBeGreaterThan(0);
    expect(typeof result.customDomain).toBe("string");
    expect((result.customDomain as string).length).toBeGreaterThan(0);
  });

  it("lastDeployedAt is a valid ISO date string in the past", () => {
    const result = providerFeatureStub("get_pages_status", {}) as Record<string, unknown>;
    const t = new Date(result.lastDeployedAt as string).getTime();
    expect(t).toBeLessThan(Date.now());
  });
});

// ---------------------------------------------------------------------------
// Unknown command — must return UNHANDLED
// ---------------------------------------------------------------------------

describe("providerFeatureStub / unknown command", () => {
  it("returns the UNHANDLED symbol for an unrecognized command", () => {
    const result = providerFeatureStub("completely_unknown", {});
    expect(result).toBe(UNHANDLED);
  });

  it("returns UNHANDLED, not null or undefined", () => {
    const result = providerFeatureStub("no_such_command", {});
    expect(result).not.toBeNull();
    expect(result).not.toBeUndefined();
    expect(result).toBe(UNHANDLED);
  });
});
