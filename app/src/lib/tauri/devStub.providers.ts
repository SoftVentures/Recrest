// Plan 03/04 dev:web stubs for the provider-depth commands (PR diff + inline
// comments, CI workflows, Pages). Split out of `devStub.ts` to keep that file
// under the 800-line ceiling. Returns `UNHANDLED` for any command this module
// doesn't own so the caller falls through to its own switch.

export const UNHANDLED = Symbol("unhandled");

/** Realistic Dependabot-shaped PR body (GFM tables, links, inline code,
 *  blockquotes, `<details>`) so dev:web exercises the MarkdownView +
 *  ExpandableContent paths without a live provider. Lives here so `devStub.ts`
 *  stays under the 800-line ceiling. */
export const DEV_PR_DETAIL_BODY = `Bumps the **npm-all** group with 3 updates in the \`/\` directory.

**What changed**

- React-Redux now ships **proper TS overloads** for \`useSelector\` with default equality
- TipTap v3 dropped the legacy \`emitUpdate\` argument shape — code already migrated
- \`@tauri-apps/api\` got a new \`isTauri()\` helper we should adopt long-term

**Checklist**

1. Verify \`yarn test\` passes locally
2. Run the smoke screen on dev:web (3200)
3. Approve and merge using **Squash**

Quick links: [release notes](https://github.com/reduxjs/redux-toolkit/releases) · [diff](https://github.com/reduxjs/redux-toolkit/compare/v2.11.2...v2.12.0)

---

### Package table

| Package | From | To |
| --- | --- | --- |
| [@reduxjs/toolkit](https://github.com/reduxjs/redux-toolkit) | \`2.11.2\` | \`2.12.0\` |
| [@tauri-apps/api](https://github.com/tauri-apps/tauri) | \`2.10.1\` | \`2.11.0\` |
| [react](https://github.com/facebook/react) | \`19.2.5\` | \`19.2.6\` |

Updates \`@reduxjs/toolkit\` from 2.11.2 to 2.12.0.

<details>
<summary>Release notes</summary>

> Sourced from [@reduxjs/toolkit's releases](https://github.com/reduxjs/redux-toolkit/releases).

### v2.12.0

This feature release adds three new helpers and tightens up several existing ones.

- Adds \`createListenerMiddleware().clearListeners()\`
- Fixes a bug where \`combineSlices\` would drop typing under \`exactOptionalPropertyTypes\`
- Improves devtool action labels for nested \`createAsyncThunk\` calls

</details>

<details>
<summary>Commits</summary>

- See full diff [here](https://github.com/reduxjs/redux-toolkit/compare/v2.11.2...v2.12.0).

</details>

---

Dependabot will resolve any conflicts with this PR as long as you don't alter it yourself.
You can also trigger a rebase manually by commenting \`@dependabot rebase\`.`;

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
