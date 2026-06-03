/// Plan-8 E.6.12 — Plans 04 + 05 (provider depth) backfill.
///
/// SKIPPED until test-id alignment work lands. The intended specs:
///
///   1. List MRs — the rows are `repo-detail-pr-row`, but the assertions
///      depend on `data-pr-author-name` / `data-pr-state` attributes that
///      the `RepoDetailPrRow` component doesn't currently emit. These
///      data-* attributes are part of the page-wrapper contract; adding
///      them is the same cost as adding a testid.
///   2. MR diff scaffold — `mr-detail-merge-btn` resolves cleanly, but
///      asserting the diff render needs `mr-diff-file` to be present in
///      the DOM with our mock fixtures returning a non-empty diff (the
///      Express mock servers don't currently serve diff payloads — they
///      focus on the merge action).
///
/// Closing this needs (a) data-attribute emission on the PR-row component
/// and (b) extending the GitHub/GitLab mock servers with diff-listing
/// routes that return the same JSON shape the Rust wiremock tests use.

describe.skip("Plans 4 + 5 — Provider depth (list + avatar + diff) [PENDING DATA ATTRS]", () => {
  it("loads the GitHub MR list and renders avatar + real name", () => {
    // Implementation pending — see file header.
  });
  it("opens the GitLab MR detail and shows the diff scaffold", () => {
    // Implementation pending — see file header.
  });
});
