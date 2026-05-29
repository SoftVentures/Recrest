// Plan 03/04 dev:web stubs for the provider-depth commands (PR diff + inline
// comments, CI workflows, Pages). Split out of `devStub.ts` to keep that file
// under the 800-line ceiling. Returns `UNHANDLED` for any command this module
// doesn't own so the caller falls through to its own switch.

export const UNHANDLED = Symbol("unhandled");

type Args = Record<string, unknown>;

export function providerFeatureStub(cmd: string, a: Args): unknown | typeof UNHANDLED {
  switch (cmd) {
    case "get_pr_diff":
      return [
        {
          path: "src/lib.rs",
          oldPath: null,
          status: "modified",
          hunks: [
            {
              oldStart: 1,
              oldLines: 3,
              newStart: 1,
              newLines: 4,
              lines: [
                { kind: "context", content: "use foo;", oldLineNo: 1, newLineNo: 1 },
                { kind: "remove", content: "use bar;", oldLineNo: 2, newLineNo: null },
                { kind: "add", content: "use bar2;", oldLineNo: null, newLineNo: 2 },
                { kind: "add", content: "use baz;", oldLineNo: null, newLineNo: 3 },
                { kind: "context", content: "pub fn x() {}", oldLineNo: 3, newLineNo: 4 },
              ],
            },
          ],
        },
        {
          path: "README.md",
          oldPath: "OLD-README.md",
          status: "renamed",
          hunks: [
            {
              oldStart: 10,
              oldLines: 1,
              newStart: 10,
              newLines: 1,
              lines: [
                { kind: "remove", content: "old line", oldLineNo: 10, newLineNo: null },
                { kind: "add", content: "new line", oldLineNo: null, newLineNo: 10 },
              ],
            },
          ],
        },
      ];
    case "post_pr_comment":
      return {
        id: `dev-${Date.now()}`,
        author: "you",
        body: String(a.body ?? ""),
        path: (a.path as string | null) ?? null,
        createdAt: new Date().toISOString(),
      };
    case "list_workflows":
      return [
        {
          id: "1",
          name: "CI",
          path: ".github/workflows/ci.yml",
          state: "active",
          inputsSchema: [
            {
              key: "environment",
              label: "Target environment",
              type: "choice",
              required: true,
              default: null,
              choices: ["staging", "production"],
            },
            {
              key: "version",
              label: "Version tag",
              type: "string",
              required: false,
              default: "latest",
              choices: null,
            },
            {
              key: "dry_run",
              label: "Dry run only",
              type: "boolean",
              required: false,
              default: "true",
              choices: null,
            },
          ],
        },
      ];
    case "list_workflow_runs":
      return [
        {
          id: "9001",
          runNumber: 42,
          status: "completed",
          conclusion: "success",
          headSha: "abc123def456abc123def456abc123def456abcd",
          createdAt: new Date(Date.now() - 3_600_000).toISOString(),
          htmlUrl: "https://example.com/runs/42",
          actor: "alice",
        },
        {
          id: "9000",
          runNumber: 41,
          status: "completed",
          conclusion: "failure",
          headSha: "0000000000000000000000000000000000000000",
          createdAt: new Date(Date.now() - 7_200_000).toISOString(),
          htmlUrl: "https://example.com/runs/41",
          actor: "bob",
        },
      ];
    case "trigger_workflow":
      return {
        id: `dev-${Date.now()}`,
        runNumber: 43,
        status: "queued",
        conclusion: null,
        headSha: "abc123def456abc123def456abc123def456abcd",
        createdAt: new Date().toISOString(),
        htmlUrl: "https://example.com/runs/43",
        actor: "you",
      };
    case "cancel_workflow_run":
      return undefined;
    case "get_pages_status":
      return {
        url: "https://acme.github.io/widget/",
        status: "built",
        lastDeployedAt: new Date(Date.now() - 86_400_000).toISOString(),
        customDomain: "docs.acme.dev",
      };
    default:
      return UNHANDLED;
  }
}
