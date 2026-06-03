/// Plan-8 E.6.12 — Plan 03 (working copy) backfill.
///
/// SKIPPED until test-id alignment work lands. The intended spec stages
/// a worktree change, commits via the commit-dialog, and asserts the
/// commit lands via `git log`. The registry already exposes the needed
/// testids (`working-copy-stage-all`, `commit-dialog-{subject,submit}`,
/// `changes-page`), but the spec also needs:
///
///   1. A path-stable scratch repo seeded in `settings.json` BEFORE the
///      Tauri binary boots (Plan-8 C2 fix — currently the fixture seeds
///      after-the-fact, which the running backend ignores).
///   2. A way to trigger the working-copy view to re-poll after the
///      test mutates a file outside Recrest's awareness — the file
///      watcher will catch it on Linux, but only if the seeded path is
///      under a watched directory.
///
/// Both are tractable; tracking on the same follow-up that wires the
/// E.6 backfill specs to passing.

describe.skip("Plan 3 — Working copy (stage / commit) [PENDING SEED ORDER]", () => {
  it("stage → commit → log shows the new commit", () => {
    // Implementation pending — see file header.
  });
});
