/**
 * Test-only data-testid registry used by Vitest component tests under
 * `src/components/`.
 *
 * These IDs are wrapper anchors and event targets that exist only during
 * unit-test render — they are not attached to production JSX. Keeping
 * them separate from `TEST_IDS` (the production E2E surface) prevents the
 * production registry from drifting into test-only churn while still
 * satisfying the no-magic-string lint rule, since this file lives under
 * `lib/constants/` and is exempt from the inline-testid syntax check.
 */
export const COMPONENT_TEST_IDS = {
  atoms: {
    logo: { wrap: "logo-wrap" },
    mascot: { wrap: "mascot-wrap" },
    avatar: { wrap: "avatar-wrap" },
    authorAvatar: { wrap: "author-wrap" },
    repoAvatar: { wrap: "repo-wrap" },
    button: { root: "btn" },
    iconButton: { root: "icon-btn" },
    buttonGroup: { root: "group", segA: "seg-a", segB: "seg-b" },
    card: { root: "card", body: "card-body" },
    tooltip: { trigger: "trigger" },
    searchInput: { root: "search", clear: "search-clear" },
    switchInput: { root: "switch" },
    loader: { root: "loader" },
    circularLoader: { root: "circ" },
    linearLoader: { root: "bar" },
    skeletonLoader: { root: "skel" },
    sparkline: { root: "spark" },
    pageTransition: { body: "page-body" },
    staggeredReveal: {
      wrap: "stagger-wrap",
      itemA: "item-a",
      itemB: "item-b",
      itemC: "item-c",
    },
    kbd: { root: "kbd-root" },
    aheadBehind: { root: "ahead-behind-root" },
  },
  molecules: {
    drawer: { body: "drawer-body" },
    toaster: { wrap: "toaster-wrap" },
    modal: { root: "modal", body: "modal-body" },
    providersPanel: { wrap: "panel-wrap" },
    kpiCard: { root: "kpi-card-root" },
  },
  organisms: {
    repoCard: { wrap: "repo-card-wrap" },
    repoRow: { wrap: "repo-row-wrap" },
    detailPane: { wrap: "detail-pane-wrap" },
    overallSearch: { wrap: "overall-search-wrap" },
    sidebar: { wrap: "sidebar-wrap" },
    header: { wrap: "header-wrap" },
    timeline: { wrap: "timeline-wrap" },
    updaterBanner: { wrap: "updater-banner-wrap" },
    titlebar: { wrap: "titlebar-wrap" },
    activityCard: { wrap: "activity-card-wrap" },
  },
} as const;
