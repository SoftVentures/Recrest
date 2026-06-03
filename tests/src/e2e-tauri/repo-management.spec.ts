/// Plan-8 E.6.12 — Plan 02 (repo polish) backfill.
///
/// SKIPPED until test-id alignment work lands. The intended spec:
///   1. Pin direct-click — `repo-row-pin-toggle` exists, but the spec
///      needs a fresh-binary launch (Plan-8 C3) to see the seeded
///      `pinnedRepoIds` from `settings.json`.
///   2. Flat-view sortable header — the registry exposes
///      `repos.toolbar`, `repos.view.{grouped,card}`, but `flat` and the
///      sortable header testids aren't in the registry yet.
///   3. Default-radio scan path — the Settings → General testids exist
///      under `settings.general.*` but no `scanPathDefaultRadio`-shape id.
///
/// The Plan-2 Done-check already records Playwright-MCP coverage for these
/// items (`docs/plans/03/02-repo-polish.md:467`), so the unattended-E2E
/// gap closes on the same follow-up that wires the testids.

describe.skip("Plan 2 — Repo polish [PENDING TESTIDS]", () => {
  it("clicking the inline pin indicator unpins the repo", () => {
    // Implementation pending — see file header.
  });
  it("flat-view sortable header reorders rows by Name", () => {
    // Implementation pending — see file header.
  });
});
