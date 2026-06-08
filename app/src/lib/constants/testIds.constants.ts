/**
 * Central registry of every `data-testid` value in the frontend.
 *
 * Every JSX `data-testid={...}` and every Playwright `getByTestId(...)`
 * must reference a value from this table — never an inline string. The
 * ESLint rule in `app/eslint.config.js` enforces it.
 *
 * Conventions:
 *  - Static IDs nested by domain. Inner keys are camelCase, the string
 *    values are kebab-case to match the historical Playwright selectors.
 *  - Dynamic IDs are exposed as generator functions returning a literal
 *    template (`<T extends string>(id: T) => `prefix-${id}` as const`).
 *    Consumers get a narrowed return type they can pass into `getByTestId`.
 *  - When you add a new test id, add it here first and import the symbol
 *    on the call site. Adding it inline is a lint error.
 */

/** Sidebar nav slot — id is the route slug after the leading `/`, with
 *  slashes collapsed to dashes (`/merge-requests` → `merge-requests`). */
export function navTestId<T extends string>(routePath: T): `nav-${string}` {
  return `nav-${routePath.replace(/^\//, "").replace(/\//g, "-")}` as `nav-${string}`;
}

export function navCountTestId<T extends string>(routePath: T): `nav-${string}-count` {
  return `${navTestId(routePath)}-count` as `nav-${string}-count`;
}

export const TEST_IDS = {
  // --- Shell / Layout
  app: "app",
  appMain: "app-main",

  header: {
    root: "app-header",
    title: "app-header-title",
    meta: "app-header-meta",
    searchTrigger: "search-trigger",
    btnRefresh: "btn-refresh",
    btnAddRepo: "btn-add-repo",
    btnFindAcross: "btn-find-across",
  },

  sidebar: {
    root: "sidebar",
    foldBtn: "sidebar-fold-btn",
    navSettings: "nav-settings",
    nav: navTestId,
    navCount: navCountTestId,
  },

  titlebar: {
    win11: "titlebar-win11",
    mac: "titlebar-mac",
    gnome: "titlebar-gnome",
    min: "titlebar-min",
    max: "titlebar-max",
    close: "titlebar-close",
  },

  searchOverlay: {
    root: "search-overlay",
    panel: "search-panel",
    input: "search-overlay-input",
    clear: "search-overlay-clear",
    row: <T extends string>(kind: T) => `search-row-${kind}` as const,
  },

  // --- Pages
  dashboard: {
    page: "dashboard-page",
    qa: {
      clone: "dash-qa-clone",
      workspace: "dash-qa-workspace",
      openIde: "dash-qa-open-ide",
      recentCommits: "dash-qa-recent-commits",
      createBranch: "dash-qa-create-branch",
      pullAll: "dash-qa-pull-all",
    },
  },

  repos: {
    page: "repos-page",
    toolbar: "repos-toolbar",
    filterTrigger: "repos-filter-trigger",
    filterGroupOption: <T extends string>(group: T) => `repos-filter-group-${group}` as const,
    viewToggle: {
      grouped: "repo-view-toggle-grouped",
      card: "repo-view-toggle-card",
    },
    list: "repo-list",
    listEmpty: "repo-list-empty",
    sortHeader: <T extends string>(col: T) => `repo-list-sort-${col}` as const,
    row: "repo-row",
    rowName: "repo-row-name",
    rowDelete: "repo-row-delete",
    rowPinToggle: "repo-row-pin-toggle",
    card: "repo-card",
    cardName: "repo-card-name",
    contextMenu: "repo-context-menu",
    detailPane: "detail-pane",
    addScope: {
      root: "repo-add-scope",
      local: "repo-add-scope-local",
      global: "repo-add-scope-global",
    },
  },

  contextMenu: {
    item: (key: string) => `context-menu-item-${key}`,
  },

  repoDetail: {
    page: "repo-detail-page",
    back: "repo-detail-back",
    avatarEdit: "repo-detail-avatar-edit",
    avatarReset: "repo-detail-avatar-reset",
    sparkCell: "repo-detail-spark-cell",
    mrRow: "repo-detail-mr-row",
    mrDrawer: "repo-detail-mr-drawer",
    ssh: {
      trigger: "repo-ssh-trigger",
      modal: "repo-ssh-modal",
      passphrase: "repo-ssh-passphrase",
      unlock: "repo-ssh-unlock",
      test: "repo-ssh-test",
    },
    gitConfig: {
      root: "repo-git-config-card",
      identitySection: "repo-git-config-identity",
      chainList: "repo-git-config-chain",
      chainRow: (path: string) => `repo-git-config-chain-row-${path}` as const,
      fullSettingsLink: "repo-git-config-full-settings",
      empty: "repo-git-config-empty",
      error: "repo-git-config-error",
      loading: "repo-git-config-loading",
    },
  },

  // Shared SSH key picker (used in Settings → Accounts and the RepoDetail SSH card).
  ssh: {
    field: "ssh-field",
    option: <T extends string>(name: T) => `ssh-option-${name}` as const,
    none: "ssh-option-none",
    browse: "ssh-browse",
    guideOpen: "ssh-guide-open",
    guideModal: "ssh-guide-modal",
    guideCopy: "ssh-guide-copy",
  },

  addRepoDialog: {
    root: "add-repo-dialog",
    tab: {
      providers: "add-repo-tab-providers",
      local: "add-repo-tab-local",
      clone: "add-repo-tab-clone",
    },
    path: "add-repo-path",
    pathBrowse: "add-repo-path-browse",
    submit: "add-repo-submit",
    url: "add-repo-url",
    dest: "add-repo-dest",
    destBrowse: "add-repo-dest-browse",
    sub: "add-repo-sub",
    clone: "add-repo-clone",
    search: "add-repo-search",
    searchClear: "add-repo-search-clear",
    bulkDest: "add-repo-bulk-dest",
    bulkDestBrowse: "add-repo-bulk-dest-browse",
    import: "add-repo-import",
    rowCheckbox: "add-repo-row-checkbox",
    providerItem: (id: string) => `add-repo-provider-${id}`,
    rememberDefault: "add-repo-remember-default",
  },

  changes: {
    page: "changes-page",
    row: "changes-row",
    contextMenu: "changes-row-context-menu",
  },

  mr: {
    page: "merge-requests-page",
    filterInput: "mr-filter-input",
    filterClear: "mr-filter-clear",
    filterBtn: "mr-filter-btn",
    filterBadge: "mr-filter-badge",
    filterPopover: "mr-filter-popover",
    filterRepoOption: (id: string) => `mr-filter-repo-${id}`,
    filterAuthorOption: (login: string) => `mr-filter-author-${login}`,
    filterDraftToggle: "mr-filter-include-drafts",
    filterCiOption: (status: string) => `mr-filter-ci-${status}`,
    filterReset: "mr-filter-reset",
    groupHead: (repoId: string) => `mr-group-${repoId}`,
    contextMenu: "mr-row-context-menu",
    drawer: "mr-drawer",
    row: "mr-row",
    detailPanel: "mr-detail-panel",
    detailPage: "mr-detail-page",
    openFullView: "mr-detail-open-full",
    backToList: "mr-detail-back",
    editDescription: "mr-detail-edit-description",
    descriptionInput: "mr-detail-description-input",
    descriptionSave: "mr-detail-description-save",
    descriptionCancel: "mr-detail-description-cancel",
    addReviewer: "mr-detail-add-reviewer",
    reviewerInput: "mr-detail-reviewer-input",
    reviewerSubmit: "mr-detail-reviewer-submit",
    mergeBtn: "mr-detail-merge-btn",
    targetChip: "mr-detail-target-chip",
    targetPopover: "mr-detail-target-popover",
    targetSearch: "mr-detail-target-search",
    targetOption: (name: string) => `mr-detail-target-option-${name}`,
    targetApply: "mr-detail-target-apply",
    descriptionToggle: "mr-detail-description-toggle",
    mergeModal: {
      root: "mr-merge-modal",
      strategy: (id: string) => `mr-merge-modal-strategy-${id}`,
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

  ci: {
    section: "ci-section",
    workflow: "ci-workflow",
    run: "ci-run",
    runBtn: "ci-run-btn",
    runForm: "ci-run-form",
    runFormField: (key: string) => `ci-run-form-field-${key}`,
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

  activity: {
    page: "activity-page",
    truncatedBanner: "activity-truncated-banner",
    repoFilter: "activity-repo-filter",
    authorFilter: "activity-author-filter",
    timeline: {
      empty: "activity-timeline-empty",
      day: "activity-timeline-day",
      card: "activity-timeline-card",
      showMore: "activity-timeline-show-more",
    },
    heatmap: {
      root: "activity-heatmap",
      cell: "activity-heatmap-cell",
      card: "activity-heatmap-card",
    },
    stacked: {
      chart: "activity-stacked-chart",
      col: "activity-stacked-col",
      card: "activity-stacked-card",
    },
    chartTooltip: "activity-chart-tooltip",
    rangePicker: {
      root: "activity-range-picker",
      preset: (p: string) => `activity-range-preset-${p}` as const,
    },
    cards: {
      reviewQueue: "activity-review-queue-card",
      reviewQueueEmpty: "activity-card-review-queue-empty",
      reviewQueueList: "activity-card-review-queue-list",
      timeToMerge: "activity-ttm-card",
      flakyRepos: "activity-flaky-card",
      churn: "activity-churn-card",
      authorClock: "activity-clock-card",
      ciPassRate: "activity-ci-card",
      busiestPeak: "activity-busiest-peak-card",
      leaderboard: "activity-leaderboard-card",
      language: "activity-language-card",
      prVelocity: "activity-velocity-card",
      quietestRepos: "activity-quietest-card",
      insights: {
        streak: "activity-insight-streak",
        trend: "activity-insight-trend",
        topAuthors: "activity-insight-top-authors",
        activeWeekday: "activity-insight-active-weekday",
        avgPerWeek: "activity-insight-avg-per-week",
        longestGap: "activity-insight-longest-gap",
      },
    },
  },

  branches: {
    page: "branches-page",
    search: "branches-search",
    searchClear: "branches-search-clear",
    fetchAll: "branches-fetch-all",
    filterTrigger: "branches-filter-trigger",
    group: "branches-group",
    checkout: "branch-checkout",
    checkoutRemote: "branch-checkout-remote",
  },

  settings: {
    view: "settings-view",
    tabs: "settings-tabs",
    navFooter: "settings-nav-footer",
    tab: <T extends string>(id: T) => `settings-tab-${id}` as const,
    panel: <T extends string>(id: T) => `settings-panel-${id}` as const,

    general: {
      themeSelect: "settings-theme-select",
      localeSelect: "settings-locale-select",
      accentSwatches: "settings-accent-swatches",
      accentChip: <T extends string>(id: T) => `accent-chip-${id}` as const,
      fontSelect: "settings-font-select",
      codeFontSelect: "settings-code-font-select",
      codeLigaturesSelect: "settings-code-ligatures-select",
      fontSizeSelect: "settings-font-size-select",
      customFontUpload: "settings-custom-font-upload",
      customFontDelete: <T extends string>(id: T) => `settings-custom-font-delete-${id}` as const,
      customFontChip: <T extends string>(id: T) => `settings-custom-font-chip-${id}` as const,
      a11yHighContrast: "settings-a11y-high-contrast",
      a11yReducedMotion: "settings-a11y-reduced-motion",
      a11yUnderlineLinks: "settings-a11y-underline-links",
      pollingInput: "settings-polling-input",
      defaultIdeSelect: "settings-default-ide-select",
      defaultTerminalSelect: "settings-default-terminal-select",
      defaultShellSelect: "settings-default-shell-select",
      terminalProfileInput: "settings-terminal-profile-input",
      terminalCustomCommandInput: "settings-terminal-custom-command-input",
      desktopAutoStart: "settings-desktop-auto-start",
      desktopStartMinimized: "settings-desktop-start-minimized",
      desktopCloseToTray: "settings-desktop-close-to-tray",
      notificationsMaster: "settings-notifications-master",
      notifications: <T extends string>(id: T) => `settings-notifications-${id}` as const,
      notificationsField: {
        newPr: "new-pr",
        ciFailed: "ci-failed",
        mergeReady: "merge-ready",
      },
      updateModeSelect: "settings-update-mode-select",
      updateCheckNow: "settings-update-check-now",
    },

    accounts: {
      connectButton: "settings-accounts-connect",
      tokenCreateLink: "settings-accounts-token-create-link",
    },

    integrations: {
      scanInput: "settings-scan-input",
      scanBrowse: "settings-scan-browse",
      scanAdd: "settings-scan-add",
      scanRemove: <T extends string>(path: T) => `settings-scan-remove-${path}` as const,
      scanDefaultRadio: <T extends string>(path: T) => `settings-scan-default-${path}` as const,
    },

    developer: {
      tab: "developer-tab",
      sections: {
        build: "dev-section-build",
        updater: "dev-section-updater",
        notifications: "dev-section-notifications",
        storage: "dev-section-storage",
        ipc: "dev-section-ipc",
        i18n: "dev-section-i18n",
        flags: "dev-section-flags",
        factoryReset: "dev-section-factory-reset",
      },
      updater: {
        forceCheck: "dev-updater-force-check",
        forceFallback: "dev-updater-force-fallback",
        endpointOverride: "dev-updater-endpoint-override",
        simVersion: "dev-updater-sim-version",
        simCanAutoInstall: "dev-updater-sim-can-auto-install",
        emit: "dev-updater-emit",
        resetLastSeen: "dev-updater-reset-last-seen",
      },
      notif: {
        sendBurst: "dev-notif-send-burst",
        clearBurst: "dev-notif-clear-burst",
        clearBaseline: "dev-notif-clear-baseline",
      },
      storage: {
        copyState: "dev-storage-copy-state",
        wipeLocal: "dev-storage-wipe-local",
        resetSettings: "dev-storage-reset-settings",
        clearTokens: "dev-storage-clear-tokens",
        retriggerOnboarding: "dev-storage-retrigger-onboarding",
        rescan: "dev-storage-rescan",
        openOnboarding: "dev-storage-open-onboarding",
      },
      ipc: {
        toggleDevtools: "dev-ipc-toggle-devtools",
        traceSwitch: "dev-ipc-trace-switch",
        rendererCrash: "dev-ipc-renderer-crash",
        rustPanic: "dev-ipc-rust-panic",
        toastSuccess: "dev-ipc-toast-success",
        toastError: "dev-ipc-toast-error",
        toastInfo: "dev-ipc-toast-info",
        toastWarning: "dev-ipc-toast-warning",
        toastLoading: "dev-ipc-toast-loading",
      },
      i18n: {
        highlightSwitch: "dev-i18n-highlight-switch",
        copyMissing: "dev-i18n-copy-missing",
        localeEn: "dev-i18n-locale-en",
        localeDe: "dev-i18n-locale-de",
      },
      flag: <T extends string>(name: T) => `dev-flag-${name}` as const,
      flagCustomName: "dev-flag-custom-name",
      flagCustomValue: "dev-flag-custom-value",
      flagAdd: "dev-flag-add",
      flagResetAll: "dev-flag-reset-all",
      factoryResetButton: "dev-factory-reset-button",
    },
  },

  updaterBanner: {
    root: "updater-banner",
    install: "updater-banner-install",
    download: "updater-banner-download",
    dismiss: "updater-banner-dismiss",
  },

  confirmDialog: {
    root: "confirm-dialog",
    cancel: "confirm-dialog-cancel",
    confirm: "confirm-dialog-confirm",
  },

  createBranchDialog: {
    root: "create-branch-dialog",
    name: "create-branch-name",
    checkout: "create-branch-checkout",
    submit: "create-branch-submit",
    cancel: "create-branch-cancel",
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

  gitConfigSettings: {
    root: "git-config-settings",
    field: (key: string) => `git-config-field-${key}` as const,
    save: "git-config-save",
    sectionCard: <T extends string>(id: T) => `git-config-section-${id}` as const,
    layeredField: (key: string) => `git-config-layered-field-${key}` as const,
    layeredFieldSourceBadge: (key: string) => `git-config-source-${key}` as const,
    layeredFieldLayerSelect: (key: string) => `git-config-layer-select-${key}` as const,
    customKeysList: "git-config-custom-keys",
    customKeyRow: (key: string) => `git-config-custom-row-${key}` as const,
    customKeyRowRemove: (key: string) => `git-config-custom-row-remove-${key}` as const,
    customKeyAdd: "git-config-custom-add",
    customKeyAddKeyInput: "git-config-custom-add-key",
    customKeyAddValueInput: "git-config-custom-add-value",
    customKeyAddLayerInput: "git-config-custom-add-layer",
    customKeyAddSubmit: "git-config-custom-add-submit",
    customKeyAddCancel: "git-config-custom-add-cancel",
    includeManager: {
      root: "git-config-include-manager",
      row: (condition: string) => `git-config-include-row-${condition}` as const,
      rowReveal: (condition: string) => `git-config-include-reveal-${condition}` as const,
      rowRemove: (condition: string) => `git-config-include-remove-${condition}` as const,
      rowUserName: (condition: string) => `git-config-include-user-name-${condition}` as const,
      rowUserEmail: (condition: string) => `git-config-include-user-email-${condition}` as const,
      addButton: "git-config-include-add",
      empty: "git-config-include-empty",
    },
    addIncludeModal: {
      root: "add-git-config-include-modal",
      directoryInput: "add-include-directory",
      directoryPicker: "add-include-directory-picker",
      targetInput: "add-include-target",
      skeletonToggle: "add-include-skeleton-toggle",
      submit: "add-include-submit",
      cancel: "add-include-cancel",
    },
    removeIncludeConfirm: {
      root: "remove-include-confirm",
      deleteFileToggle: "remove-include-delete-toggle",
      confirm: "remove-include-confirm-submit",
      cancel: "remove-include-confirm-cancel",
    },
    aliasesEditor: {
      root: "git-config-aliases-editor",
      row: (name: string) => `git-config-alias-row-${name}` as const,
      remove: (name: string) => `git-config-alias-remove-${name}` as const,
      addNameInput: "git-config-alias-add-name",
      addCommandInput: "git-config-alias-add-command",
      addLayerSelect: "git-config-alias-add-layer",
      addSubmit: "git-config-alias-add-submit",
    },
    urlRewritesEditor: {
      root: "git-config-url-rewrites-editor",
      row: (key: string) => `git-config-url-row-${key}` as const,
      remove: (key: string) => `git-config-url-remove-${key}` as const,
      addFromInput: "git-config-url-add-from",
      addToInput: "git-config-url-add-to",
      addDirectionSelect: "git-config-url-add-direction",
      addLayerSelect: "git-config-url-add-layer",
      addSubmit: "git-config-url-add-submit",
    },
  },

  findAcrossDialog: {
    root: "find-across-dialog",
    input: "find-across-input",
    clear: "find-across-clear",
    repoFilter: "find-across-repo-filter",
    list: "find-across-list",
    group: <T extends string>(id: T) => `find-across-group-${id}` as const,
    row: <T extends string>(id: T) => `find-across-row-${id}` as const,
    empty: "find-across-empty",
  },

  changedFilesList: {
    root: "changed-files-list",
    row: "changed-files-row",
    truncated: "changed-files-truncated",
  },

  workingCopy: {
    root: "working-copy",
    section: <T extends "staged" | "unstaged">(s: T) => `working-copy-section-${s}` as const,
    /** Row testid is section-scoped because a file with both staged AND
     *  worktree changes appears in both sections (matches `git status`),
     *  so a path-only testid would collide. */
    row: <T extends "staged" | "unstaged">(section: T, path: string) =>
      `working-copy-row-${section}-${path}` as const,
    stageRow: (path: string) => `working-copy-stage-${path}` as const,
    unstageRow: (path: string) => `working-copy-unstage-${path}` as const,
    discardRow: (path: string) => `working-copy-discard-${path}` as const,
    stageAll: "working-copy-stage-all",
    unstageAll: "working-copy-unstage-all",
    discardAll: "working-copy-discard-all",
    stashSave: "working-copy-stash-save",
    stashList: "working-copy-stash-list",
    stashRow: (index: number) => `working-copy-stash-row-${index}` as const,
    stashPop: (index: number) => `working-copy-stash-pop-${index}` as const,
    stashDrop: (index: number) => `working-copy-stash-drop-${index}` as const,
    commit: "working-copy-commit",
  },

  repoStats: {
    root: "repo-stats",
    aheadBehind: "repo-stats-ahead-behind",
    changedLines: "repo-stats-changed-lines",
    commits14d: "repo-stats-commits-14d",
    openMrs: "repo-stats-open-mrs",
    lastCommit: "repo-stats-last-commit",
  },

  onboarding: {
    root: "onboarding-wizard",
    progress: "onboarding-progress",
    step: <T extends string>(id: T) => `onboarding-step-${id}` as const,
    welcomeNext: "onboarding-welcome-next",
    basicsNext: "onboarding-basics-next",
    basicsBack: "onboarding-basics-back",
    pickFolderInput: "onboarding-pick-folder-input",
    pickFolderBrowse: "onboarding-pick-folder-browse",
    pickFolderAdd: "onboarding-pick-folder-add",
    pickFolderRemove: <T extends string>(path: T) =>
      `onboarding-pick-folder-remove-${path}` as const,
    pickFolderNext: "onboarding-pick-folder-next",
    pickFolderBack: "onboarding-pick-folder-back",
    providerNext: "onboarding-provider-next",
    providerBack: "onboarding-provider-back",
    providerSkip: "onboarding-provider-skip",
    providerToken: "onboarding-provider-token",
    providerConnect: "onboarding-provider-connect",
    scanNext: "onboarding-scan-next",
    scanBack: "onboarding-scan-back",
    doneFinish: "onboarding-done-finish",
  },

  emptyState: "empty-state",

  /** Marker the root error-boundary renders when the app crashes. Tests
   *  assert this element has count 0 to verify the boundary didn't fire. */
  errorBoundaryFallback: "error-boundary-fallback",
} as const;
