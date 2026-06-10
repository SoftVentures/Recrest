/// Thin page wrapper for the WDIO-driven Tauri E2E suite. Selectors are
/// limited to `data-testid` attributes so spec changes never depend on
/// CSS/copy. Add a method here when a spec needs a new high-level
/// interaction — not a new selector — so the spec stays semantic.

/// Local mirror of the test-ids the wdio specs touch. **Kept in lockstep
/// with `app/src/lib/constants/testIds.constants.ts`.** Tests cannot
/// import from `@recrest/app` (no path alias and shipping the registry
/// through `@recrest/shared` would force the app to depend on test code),
/// so this mirror is the seam.
///
/// Every spec and every method on `RecrestPage` MUST go through `T` —
/// inline test-id strings are forbidden by repo convention (root CLAUDE.md
/// "no magic strings"). Likewise every data-* attribute we assert on
/// comes from `DATA_ATTR`.
export const T = {
  header: {
    btnAddRepo: "btn-add-repo",
  },
  nav: {
    repos: "nav-repos",
    mergeRequests: "nav-merge-requests",
    settings: "nav-settings",
  },
  repos: {
    row: "repo-row",
    rowPinToggle: "repo-row-pin-toggle",
    sortHeader: (col: string) => `repo-list-sort-${col}` as const,
    viewToggleGrouped: "repo-view-toggle-grouped",
    viewToggleCard: "repo-view-toggle-card",
  },
  repo: {
    mrRow: "repo-detail-mr-row",
  },
  ssh: {
    field: "ssh-field",
    option: (name: string) => `ssh-option-${name}` as const,
    none: "ssh-option-none",
    browse: "ssh-browse",
    guideOpen: "ssh-guide-open",
    guideModal: "ssh-guide-modal",
    guideCopy: "ssh-guide-copy",
  },
  repoDetail: {
    ssh: {
      trigger: "repo-ssh-trigger",
      modal: "repo-ssh-modal",
      passphrase: "repo-ssh-passphrase",
      unlock: "repo-ssh-unlock",
      test: "repo-ssh-test",
    },
  },
  addRepoDialog: {
    root: "add-repo-dialog",
    providerItem: (id: string) => `add-repo-provider-${id}` as const,
  },
  settings: {
    tab: (id: string) => `settings-tab-${id}` as const,
    integrations: {
      scanDefaultRadio: (p: string) => `settings-scan-default-${p}` as const,
    },
  },
  workingCopy: {
    root: "working-copy",
    section: (s: "staged" | "unstaged") => `working-copy-section-${s}` as const,
    row: (section: "staged" | "unstaged", p: string) => `working-copy-${section}-${p}` as const,
    stageRow: (p: string) => `working-copy-stage-${p}` as const,
    unstageRow: (p: string) => `working-copy-unstage-${p}` as const,
    discardRow: (p: string) => `working-copy-discard-${p}` as const,
    stageAll: "working-copy-stage-all",
    unstageAll: "working-copy-unstage-all",
    discardAll: "working-copy-discard-all",
    stashSave: "working-copy-stash-save",
    stashList: "working-copy-stash-list",
    stashRow: (i: number) => `working-copy-stash-row-${i}` as const,
    stashPop: (i: number) => `working-copy-stash-pop-${i}` as const,
    stashDrop: (i: number) => `working-copy-stash-drop-${i}` as const,
    commit: "working-copy-commit",
  },
  commitDialog: {
    root: "commit-dialog",
    subject: "commit-dialog-subject",
    body: "commit-dialog-body",
    insertTemplate: "commit-dialog-insert-template",
    hooksBadge: "commit-dialog-hooks-badge",
    filesToggle: "commit-dialog-files-toggle",
    filesList: "commit-dialog-files-list",
    submit: "commit-dialog-submit",
    cancel: "commit-dialog-cancel",
  },
  confirmDialog: {
    root: "confirm-dialog",
    cancel: "confirm-dialog-cancel",
    confirm: "confirm-dialog-confirm",
  },
  gitConfigSettings: {
    root: "git-config-settings",
    save: "git-config-save",
    includeManager: {
      root: "git-config-include-manager",
      addButton: "git-config-include-add",
      row: (cond: string) => `git-config-include-row-${cond}` as const,
      rowRemove: (cond: string) => `git-config-include-remove-${cond}` as const,
      empty: "git-config-include-empty",
    },
    addIncludeModal: {
      root: "add-git-config-include-modal",
      directoryInput: "add-include-directory",
      targetInput: "add-include-target",
      submit: "add-include-submit",
      cancel: "add-include-cancel",
    },
    removeIncludeConfirm: {
      root: "remove-include-confirm",
      deleteFileToggle: "remove-include-delete-toggle",
      confirm: "remove-include-confirm-submit",
      cancel: "remove-include-confirm-cancel",
    },
    customKeyAdd: "git-config-custom-add",
    customKeyAddKeyInput: "git-config-custom-add-key",
    customKeyAddValueInput: "git-config-custom-add-value",
    customKeyAddLayerInput: "git-config-custom-add-layer",
    customKeyAddSubmit: "git-config-custom-add-submit",
    customKeyRow: (k: string) => `git-config-custom-row-${k}` as const,
    aliasesEditor: {
      addNameInput: "git-config-alias-add-name",
      addCommandInput: "git-config-alias-add-command",
      addSubmit: "git-config-alias-add-submit",
      row: (n: string) => `git-config-alias-row-${n}` as const,
    },
    urlRewritesEditor: {
      addFromInput: "git-config-url-add-from",
      addToInput: "git-config-url-add-to",
      addSubmit: "git-config-url-add-submit",
      row: (k: string) => `git-config-url-row-${k}` as const,
    },
  },
  ci: {
    section: "ci-section",
    workflow: "ci-workflow",
    run: "ci-run",
    runBtn: "ci-run-btn",
    runForm: "ci-run-form",
    runFormField: (k: string) => `ci-run-form-field-${k}` as const,
    runFormRef: "ci-run-form-ref",
    runFormSubmit: "ci-run-form-submit",
    runFormCancel: "ci-run-form-cancel",
    cancelRun: "ci-cancel-run",
  },
  deployments: {
    block: "deployments-block",
    link: "deployments-link",
    status: "deployments-status",
  },
  mr: {
    detail: {
      mergeBtn: "mr-detail-merge-btn",
    },
    mergeModal: {
      root: "mr-merge-modal",
      strategy: (id: string) => `mr-merge-modal-strategy-${id}` as const,
      titleInput: "mr-merge-modal-title",
      descInput: "mr-merge-modal-desc",
      confirm: "mr-merge-modal-confirm",
      cancel: "mr-merge-modal-cancel",
      deleteBranch: "mr-merge-modal-delete-branch",
    },
    diff: {
      file: "mr-diff-file",
      line: "mr-diff-line",
      commentBtn: "mr-diff-comment-btn",
      composer: "mr-diff-composer",
      composerInput: "mr-diff-composer-input",
      composerSubmit: "mr-diff-composer-submit",
      composerCancel: "mr-diff-composer-cancel",
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

/// Data-attribute names the specs assert on. Kept here (NOT inlined) so
/// renaming an attribute on the React side surfaces in one place and the
/// spec doesn't grow opaque `getAttribute("data-…")` strings.
///
/// Naming follows the codebase convention: the user-facing surface is
/// always **MR** (Merge Request), even though the data type is
/// `PullRequest`. Components are `MrRow`/`MrDetail`/`MrDetailDrawer`;
/// the rendered data-* attributes mirror that.
export const DATA_ATTR = {
  repoId: "data-repo-id",
  pinned: "data-pinned",
  active: "data-active",
  mrNumber: "data-mr-number",
  mrState: "data-mr-state",
  mrAuthor: "data-mr-author",
} as const;

/// Mirror of `app/src/lib/constants/settings.constants.ts::SettingsTab`.
/// Tests can't import from `@recrest/app`, so this is the seam.
export const SETTINGS_TAB = {
  GENERAL: "general",
  ACCOUNTS: "accounts",
  INTEGRATIONS: "integrations",
  GIT: "git",
  SHORTCUTS: "shortcuts",
  STORAGE: "storage",
  ABOUT: "about",
  DEVELOPER: "developer",
} as const;
export type SettingsTabId = (typeof SETTINGS_TAB)[keyof typeof SETTINGS_TAB];

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

  /// Element matcher composed of a testid plus a single data-* qualifier.
  /// Used to address one of N elements that share a testid (e.g. one MR row
  /// among many — `repo-detail-mr-row` + `data-mr-number=1`).
  byTestIdAttr(id: string, attr: string, value: string | number) {
    return this.browser.$(`[data-testid="${id}"][${attr}="${value}"]`);
  }

  async openRepo(repoId: string): Promise<void> {
    await this.openReposPage();
    const row = this.byTestIdAttr(T.repos.row, DATA_ATTR.repoId, repoId);
    await row.waitForDisplayed({ timeout: 10_000 });
    await row.click();
  }

  async openReposPage(): Promise<void> {
    await this.click(T.nav.repos);
    await this.waitForTestId(T.repos.row);
  }

  async openSettings(tabId: SettingsTabId): Promise<void> {
    await this.click(T.nav.settings);
    await this.click(T.settings.tab(tabId));
  }

  async byPinToggle(repoId: string) {
    const row = this.byTestIdAttr(T.repos.row, DATA_ATTR.repoId, repoId);
    await row.waitForExist({ timeout: 10_000 });
    return row.$(`[data-testid="${T.repos.rowPinToggle}"]`);
  }

  async repoRowOrder(): Promise<string[]> {
    const rows = await this.byTestIdAll(T.repos.row).getElements();
    const ids: string[] = [];
    for (const r of rows) {
      const id = await r.getAttribute(DATA_ATTR.repoId);
      if (typeof id === "string" && id.length > 0) ids.push(id);
    }
    return ids;
  }

  async firstMrRow() {
    const row = this.byTestId(T.repo.mrRow);
    await row.waitForDisplayed({ timeout: 10_000 });
    return row;
  }

  async openRemoteImport(providerId: "github" | "gitlab" | "bitbucket"): Promise<void> {
    await this.openReposPage();
    await this.click(T.header.btnAddRepo);
    await this.click(T.addRepoDialog.providerItem(providerId));
  }

  /// The remote-import panel issues the `list_organizations` IPC call on
  /// mount. The mock server records the request synchronously, so we just
  /// need a short settle window before the spec reads the request log.
  async waitForOrgsRequest(): Promise<void> {
    await this.browser.pause(750);
  }

  async expectSortActive(col: string): Promise<void> {
    const head = this.byTestId(T.repos.sortHeader(col));
    await head.waitForDisplayed({ timeout: 5_000 });
    await this.browser.waitUntil(
      async () => (await head.getAttribute(DATA_ATTR.active)) === "true",
      { timeout: 5_000, timeoutMsg: `sort header "${col}" never became active` },
    );
  }

  async openMr(mrNumber: number): Promise<void> {
    const row = this.byTestIdAttr(T.repo.mrRow, DATA_ATTR.mrNumber, mrNumber);
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

  async expectMergedRowGone(mrNumber: number): Promise<void> {
    await this.browser.waitUntil(
      async () => {
        const row = this.byTestIdAttr(T.repo.mrRow, DATA_ATTR.mrNumber, mrNumber);
        if (!(await row.isExisting())) return true;
        const state = await row.getAttribute(DATA_ATTR.mrState);
        return state === "merged" || state === "closed";
      },
      { timeout: 15_000, interval: 250, timeoutMsg: `MR #${mrNumber} never reached merged state` },
    );
  }

  async expectSuccessToast(): Promise<void> {
    await this.waitForTestId(T.toast.success, 10_000);
  }

  async expectErrorToast(): Promise<void> {
    await this.waitForTestId(T.toast.error, 10_000);
  }

  async click(testId: string): Promise<void> {
    const el = this.byTestId(testId);
    await el.waitForClickable({ timeout: 10_000 });
    await el.click();
  }

  async type(testId: string, value: string): Promise<void> {
    const el = this.byTestId(testId);
    await el.waitForDisplayed({ timeout: 10_000 });
    await el.setValue(value);
  }
}

export const TESTIDS = T;
