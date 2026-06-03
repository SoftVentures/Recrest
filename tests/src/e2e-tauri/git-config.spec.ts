/// Plan-8 E.6.12 — Plan 06 (full git config view/edit) deferred E2E.
///
/// SKIPPED until the test-id wiring is completed. The spec writes an
/// `[includeIf]` block via the Settings → Git config → "Add include"
/// modal and asserts the change lands in `~/.gitconfig`. Blockers:
///
///   1. `repo-row` rows + the settings nav resolve fine, but the
///      Git-config settings panel uses dynamic test-ids of the form
///      `git-config-include-row-${condition}` (see
///      `app/src/lib/constants/testIds.constants.ts:457-462`). Specs
///      using these need to pass concrete `condition` strings that match
///      what the Add-modal writes; that wiring is straightforward but
///      hasn't been done yet.
///   2. The Tauri harness today shares one binary across specs (Plan-8
///      C2/C3). For this spec to assert `.gitconfig` mutations, the
///      backend needs `HOME` set BEFORE the binary launches; that needs
///      to land in `wdio.conf.ts::onPrepare` similar to
///      `RECREST_TEST_PROFILE`.
///
/// Track in: docs/plans/03/08-e2e-test-harness.md follow-up.

describe.skip("Plan 6 — Git config full (add/remove identity) [PENDING TESTIDS]", () => {
  it("add identity writes an [includeIf] block; remove strips it", () => {
    // Implementation pending — see file header.
  });
});
