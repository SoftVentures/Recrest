/// Thin page wrapper for the WDIO-driven Tauri E2E suite. Selectors are
/// limited to `data-testid` attributes so spec changes never depend on
/// CSS/copy. Add a method here when a spec needs a new high-level
/// interaction — not a new selector — so the spec stays semantic.

/// Local mirror of the testids the wdio specs touch. Kept in lockstep with
/// `app/src/lib/constants/testIds.constants.ts`; the matching
/// `recrestPage.testids.spec.ts` integration test asserts every key here
/// also exists in the frontend registry so drift fails on PR.
export const T = {
  nav: {
    repos: "nav-repos",
    mergeRequests: "nav-merge-requests",
    settings: "nav-settings",
  },
  repos: {
    row: "repo-row",
    rowPinToggle: "repo-row-pin-toggle",
  },
  repo: {
    prRow: "repo-detail-pr-row",
  },
  mr: {
    detail: {
      mergeBtn: "mr-detail-merge-btn",
    },
    mergeModal: {
      root: "mr-merge-modal",
      strategy: (id: string) => `mr-merge-modal-strategy-${id}`,
      titleInput: "mr-merge-modal-title",
      descInput: "mr-merge-modal-desc",
      confirm: "mr-merge-modal-confirm",
      cancel: "mr-merge-modal-cancel",
      deleteBranch: "mr-merge-modal-delete-branch",
    },
  },
  /// `dev-ipc-toast-*` are emitted by `<DevIpcToastsHost />` for every
  /// thunk lifecycle. The MR merge thunk's `.fulfilled` fires
  /// `dev-ipc-toast-success`; `.rejected` fires `dev-ipc-toast-error`.
  toast: {
    success: "dev-ipc-toast-success",
    error: "dev-ipc-toast-error",
    info: "dev-ipc-toast-info",
    warning: "dev-ipc-toast-warning",
  },
} as const;

export class RecrestPage {
  constructor(private readonly browser: WebdriverIO.Browser) {}

  /// Wait until an element with the given testid is visible. Default 10s.
  async waitForTestId(id: string, timeoutMs = 10_000): Promise<void> {
    const el = this.browser.$(`[data-testid="${id}"]`);
    await el.waitForDisplayed({ timeout: timeoutMs, timeoutMsg: `testid "${id}" never appeared` });
  }

  byTestId(id: string) {
    return this.browser.$(`[data-testid="${id}"]`);
  }

  byTestIdAll(id: string) {
    return this.browser.$$(`[data-testid="${id}"]`);
  }

  async openRepo(repoId: string): Promise<void> {
    await this.click(T.nav.repos);
    const row = this.browser.$(`[data-testid="${T.repos.row}"][data-repo-id="${repoId}"]`);
    await row.waitForDisplayed({ timeout: 10_000 });
    await row.click();
  }

  async openMr(prNumber: number): Promise<void> {
    const row = this.browser.$(`[data-testid="${T.repo.prRow}"][data-pr-number="${prNumber}"]`);
    await row.waitForDisplayed({ timeout: 10_000 });
    await row.click();
  }

  async openMergeModal(): Promise<void> {
    await this.click(T.mr.detail.mergeBtn);
    await this.waitForTestId(T.mr.mergeModal.root);
  }

  async pickStrategy(strategy: "merge" | "squash" | "rebase"): Promise<void> {
    await this.byTestId(T.mr.mergeModal.strategy(strategy)).click();
  }

  async toggleDeleteSourceBranch(checked: boolean): Promise<void> {
    const el = this.byTestId(T.mr.mergeModal.deleteBranch);
    const current = await el.isSelected().catch(() => false);
    if (current !== checked) await el.click();
  }

  async confirmMerge(): Promise<void> {
    await this.click(T.mr.mergeModal.confirm);
  }

  async cancelMerge(): Promise<void> {
    await this.click(T.mr.mergeModal.cancel);
  }

  async strategyIsDisabled(strategy: "merge" | "squash" | "rebase"): Promise<boolean> {
    const el = this.byTestId(T.mr.mergeModal.strategy(strategy));
    return (await el.getAttribute("disabled")) !== null;
  }

  async expectMergedRowGone(prNumber: number): Promise<void> {
    // After a successful merge, the optimistic local update flips the row
    // state attribute (frontend pattern from `MrDetailPanel.onConfirmMerge`).
    // Specs assert via `data-pr-state` attribute on the row — emitted by
    // `RepoDetailPrRow` so the data layer stays addressable.
    await this.browser.waitUntil(
      async () => {
        const row = this.browser.$(`[data-testid="${T.repo.prRow}"][data-pr-number="${prNumber}"]`);
        if (!(await row.isExisting())) return true; // row removed entirely also counts
        const state = await row.getAttribute("data-pr-state");
        return state === "merged" || state === "closed";
      },
      { timeout: 15_000, interval: 250, timeoutMsg: `PR #${prNumber} never reached merged state` },
    );
  }

  async expectSuccessToast(): Promise<void> {
    await this.waitForTestId(T.toast.success, 10_000);
  }

  async expectErrorToast(): Promise<void> {
    await this.waitForTestId(T.toast.error, 10_000);
  }

  private async click(testId: string): Promise<void> {
    const el = this.byTestId(testId);
    await el.waitForClickable({ timeout: 10_000 });
    await el.click();
  }
}

export const TESTIDS = T;
