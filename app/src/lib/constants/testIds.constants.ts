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
    changesPage: "changes-page",
    toolbar: "repos-toolbar",
    filterTrigger: "repos-filter-trigger",
    viewToggle: {
      grouped: "repo-view-toggle-grouped",
      card: "repo-view-toggle-card",
    },
    list: "repo-list",
    listEmpty: "repo-list-empty",
    row: "repo-row",
    rowName: "repo-row-name",
    rowDelete: "repo-row-delete",
    card: "repo-card",
    cardName: "repo-card-name",
    detailPane: "detail-pane",
    addScope: {
      root: "repo-add-scope",
      local: "repo-add-scope-local",
      global: "repo-add-scope-global",
    },
  },

  repoDetail: {
    page: "repo-detail-page",
    back: "repo-detail-back",
    sparkCell: "repo-detail-spark-cell",
    prRow: "repo-detail-pr-row",
    prDrawer: "repo-detail-pr-drawer",
  },

  addRepoDialog: {
    root: "add-repo-dialog",
    tab: {
      providers: "add-repo-tab-providers",
      local: "add-repo-tab-local",
      clone: "add-repo-tab-clone",
    },
    path: "add-repo-path",
    submit: "add-repo-submit",
    url: "add-repo-url",
    dest: "add-repo-dest",
    sub: "add-repo-sub",
    clone: "add-repo-clone",
    search: "add-repo-search",
    searchClear: "add-repo-search-clear",
    bulkDest: "add-repo-bulk-dest",
    import: "add-repo-import",
    rowCheckbox: "add-repo-row-checkbox",
  },

  mr: {
    page: "merge-requests-page",
    filterInput: "mr-filter-input",
    filterClear: "mr-filter-clear",
    filterBtn: "mr-filter-btn",
    drawer: "mr-drawer",
    row: "mr-row",
    detailPanel: "mr-detail-panel",
  },

  activity: {
    page: "activity-page",
    repoFilter: "activity-repo-filter",
    authorFilter: "activity-author-filter",
    timeline: {
      empty: "activity-timeline-empty",
      day: "activity-timeline-day",
      card: "activity-timeline-card",
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
      fontSizeSelect: "settings-font-size-select",
      a11yHighContrast: "settings-a11y-high-contrast",
      a11yReducedMotion: "settings-a11y-reduced-motion",
      a11yUnderlineLinks: "settings-a11y-underline-links",
      pollingInput: "settings-polling-input",
      defaultIdeSelect: "settings-default-ide-select",
      defaultTerminalSelect: "settings-default-terminal-select",
      defaultShellSelect: "settings-default-shell-select",
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

    integrations: {
      scanInput: "settings-scan-input",
      scanBrowse: "settings-scan-browse",
      scanAdd: "settings-scan-add",
      scanRemove: <T extends string>(path: T) => `settings-scan-remove-${path}` as const,
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

  emptyState: "empty-state",

  /** Marker the root error-boundary renders when the app crashes. Tests
   *  assert this element has count 0 to verify the boundary didn't fire. */
  errorBoundaryFallback: "error-boundary-fallback",
} as const;
