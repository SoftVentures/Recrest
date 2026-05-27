import type { RecentCommit, Repository, RepositoryGroup, RepositoryStatus } from "@recrest/shared";

import { daysAgo } from "@/lib/dev/seed/time";

/**
 * Dev-stub repos, mirrored from `tests/src/helpers/seed/repos.ts`.
 * Only `Recrest` and `local-dev-stacks` are real project names — everything
 * else is fictional per the user-memory rule.
 *
 * Timestamps are computed relative to `Date.now()` at module-load time so the
 * Activity page (which filters to "last 14 days") always has data to chart,
 * regardless of when the dev server is started. Hard-coded ISO strings used
 * to drift outside the window once the calendar advanced past the seed date.
 */

export const SEED_GROUPS: Record<string, RepositoryGroup> = {
  "open-source": { id: "open-source", name: "Open Source", color: "#d97757" },
  "acme-labs": { id: "acme-labs", name: "Acme Labs", color: "#2f66e6" },
  experiments: { id: "experiments", name: "Experiments", color: "#7c3aed" },
};

function commitActivity(pattern: number[]): number[] {
  const arr = [...pattern];
  while (arr.length < 14) arr.unshift(0);
  return arr.slice(-14);
}

function makeStatus(overrides: Partial<RepositoryStatus>): RepositoryStatus {
  return {
    branch: "main",
    head: "a1b2c3d4e5f6",
    ahead: 0,
    behind: 0,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    conflicted: 0,
    dirty: false,
    lastCommit: {
      sha: "a1b2c3d4e5f6",
      summary: "ci(deps): bump dependencies",
      author: "renovate-bot",
      timestamp: daysAgo(4),
    },
    remoteUrl: null,
    changedFiles: [],
    changedFilesTruncated: false,
    commitActivity: commitActivity([1, 0, 0, 2, 3, 0, 1, 0, 2, 4, 1, 0, 0, 1]),
    addedLines: 0,
    removedLines: 0,
    language: "TypeScript",
    languages: null,
    ...overrides,
  };
}

export const SEED_REPOS: Repository[] = [
  {
    id: "repo-recrest",
    name: "Recrest",
    path: "~/Code/open-source/recrest",
    groupId: "open-source",
    remoteUrl: "https://github.com/SoftVentures/Recrest",
    providerId: "github",
    logoPath: null,
    logoDarkPath: null,
    sshKeyPath: null,
    status: makeStatus({
      branch: "main",
      head: "f2e1d0c9b8a7",
      lastCommit: {
        sha: "f2e1d0c9b8a7",
        summary: "feat(landing): ship responsive hero demo",
        author: "valentin",
        timestamp: daysAgo(1),
      },
      commitActivity: commitActivity([2, 3, 4, 6, 5, 2, 3, 4, 7, 8, 5, 3, 4, 6]),
      addedLines: 482,
      removedLines: 117,
      language: "TypeScript",
      languages: {
        TypeScript: 612_000,
        Rust: 148_000,
        CSS: 86_000,
        HTML: 24_000,
        JavaScript: 18_000,
        Shell: 9_500,
      },
    }),
  },
  {
    id: "repo-local-dev-stacks",
    name: "local-dev-stacks",
    path: "~/Code/open-source/local-dev-stacks",
    groupId: "open-source",
    remoteUrl: "https://github.com/SoftVentures/local-dev-stacks",
    providerId: "github",
    logoPath: null,
    logoDarkPath: null,
    sshKeyPath: null,
    status: makeStatus({
      branch: "feat/compose-v2",
      head: "e11f3a9c2b88",
      ahead: 2,
      behind: 0,
      staged: 1,
      unstaged: 2,
      untracked: 0,
      dirty: true,
      lastCommit: {
        sha: "e11f3a9c2b88",
        summary: "refactor: split compose profiles per stack",
        author: "valentin",
        timestamp: daysAgo(2),
      },
      changedFiles: [
        {
          path: "compose/nginx.yml",
          status: "staged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "compose/postgres.yml",
          status: "unstaged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        { path: "scripts/up.sh", status: "unstaged", kind: "modified", hasUnstagedChanges: false },
      ],
      commitActivity: commitActivity([0, 1, 2, 1, 0, 0, 3, 2, 1, 0, 1, 2, 0, 1]),
      addedLines: 112,
      removedLines: 48,
      language: "Shell",
      languages: {
        Shell: 102_000,
        YAML: 74_000,
        Dockerfile: 32_000,
        Makefile: 18_000,
        Python: 12_000,
        JavaScript: 7_800,
      },
    }),
  },
  {
    id: "repo-ledger-api",
    name: "ledger-api",
    path: "~/Code/acme-labs/ledger-api",
    groupId: "acme-labs",
    remoteUrl: "https://github.com/acme-labs/ledger-api",
    providerId: "github",
    logoPath: null,
    logoDarkPath: null,
    sshKeyPath: null,
    status: makeStatus({
      branch: "main",
      head: "77aa44bb11cc",
      ahead: 0,
      behind: 3,
      lastCommit: {
        sha: "77aa44bb11cc",
        summary: "ci(deps): bump axum to 0.8",
        author: "maren",
        timestamp: daysAgo(5),
      },
      commitActivity: commitActivity([0, 0, 2, 3, 4, 1, 0, 0, 1, 2, 1, 0, 0, 0]),
      language: "Rust",
      languages: {
        Rust: 412_000,
        SQL: 38_000,
        Shell: 14_000,
        TOML: 9_400,
        Python: 6_800,
        Dockerfile: 4_200,
      },
    }),
  },
  {
    id: "repo-pulse-ios",
    name: "pulse-ios",
    path: "~/Code/acme-labs/pulse-ios",
    groupId: "acme-labs",
    remoteUrl: "https://gitlab.com/acme-labs/pulse-ios",
    providerId: "gitlab",
    logoPath: null,
    logoDarkPath: null,
    sshKeyPath: null,
    status: makeStatus({
      branch: "feat/home-v2",
      head: "4d5e6f7a8b9c",
      ahead: 4,
      behind: 1,
      staged: 3,
      unstaged: 4,
      untracked: 0,
      dirty: true,
      lastCommit: {
        sha: "4d5e6f7a8b9c",
        summary: "feat(home): redesign hero timeline",
        author: "tomi",
        timestamp: daysAgo(1),
      },
      changedFiles: [
        {
          path: "Pulse/Views/HomeHero.swift",
          status: "staged",
          kind: "modified",
          hasUnstagedChanges: true,
        },
        {
          path: "Pulse/Views/HeroTimeline.swift",
          status: "staged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "Pulse/Views/Cards/AlertCard.swift",
          status: "staged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "Pulse/Theme/Color+Semantic.swift",
          status: "unstaged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "Pulse.xcodeproj/project.pbxproj",
          status: "unstaged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "PulseTests/HomeViewTests.swift",
          status: "unstaged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "Pulse/Resources/HomeMockData.json",
          status: "unstaged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
      ],
      commitActivity: commitActivity([1, 1, 0, 2, 3, 5, 2, 1, 4, 3, 2, 1, 3, 4]),
      addedLines: 398,
      removedLines: 142,
      language: "Swift",
      languages: {
        Swift: 548_000,
        "Objective-C": 86_000,
        Shell: 12_000,
        Ruby: 9_800,
        Metal: 4_200,
      },
    }),
  },
  {
    id: "repo-starlight-ui",
    name: "starlight-ui",
    path: "~/Code/acme-labs/starlight-ui",
    groupId: "acme-labs",
    remoteUrl: "https://github.com/acme-labs/starlight-ui",
    providerId: "github",
    logoPath: null,
    logoDarkPath: null,
    sshKeyPath: null,
    status: makeStatus({
      branch: "main",
      head: "c0a7e2d5f9b1",
      lastCommit: {
        sha: "c0a7e2d5f9b1",
        summary: "fix(button): retain focus ring after click",
        author: "lea",
        timestamp: daysAgo(3),
      },
      commitActivity: commitActivity([3, 2, 1, 0, 2, 3, 4, 2, 1, 3, 2, 1, 2, 3]),
      language: "TypeScript",
      languages: {
        TypeScript: 482_000,
        CSS: 126_000,
        MDX: 78_000,
        HTML: 22_000,
        JavaScript: 18_000,
        SCSS: 9_000,
      },
    }),
  },
  {
    id: "repo-octo-notes",
    name: "octo-notes",
    path: "~/Code/experiments/octo-notes",
    groupId: "experiments",
    remoteUrl: "https://github.com/valentin/octo-notes",
    providerId: "github",
    logoPath: null,
    logoDarkPath: null,
    sshKeyPath: null,
    status: makeStatus({
      branch: "wip/markdown-editor",
      head: "887ab0112233",
      staged: 4,
      unstaged: 6,
      untracked: 2,
      dirty: true,
      lastCommit: {
        sha: "887ab0112233",
        summary: "wip: editor lane with frontmatter parser",
        author: "valentin",
        timestamp: daysAgo(1),
      },
      changedFiles: [
        {
          path: "src/editor/Frontmatter.ts",
          status: "staged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "src/editor/Lane.tsx",
          status: "staged",
          kind: "modified",
          hasUnstagedChanges: true,
        },
        {
          path: "src/editor/Toolbar.tsx",
          status: "staged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "src/editor/useMarkdown.ts",
          status: "staged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "src/app/Sidebar.tsx",
          status: "unstaged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "src/app/routes.ts",
          status: "unstaged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "src/theme/tokens.css",
          status: "unstaged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "tests/editor.spec.ts",
          status: "unstaged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "src/editor/preview.ts",
          status: "unstaged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "src/editor/keymap.ts",
          status: "unstaged",
          kind: "modified",
          hasUnstagedChanges: false,
        },
        {
          path: "sandbox/sample.md",
          status: "untracked",
          kind: "added",
          hasUnstagedChanges: false,
        },
        { path: "sandbox/notes.md", status: "untracked", kind: "added", hasUnstagedChanges: false },
      ],
      commitActivity: commitActivity([0, 0, 0, 1, 2, 3, 4, 5, 6, 4, 3, 2, 4, 5]),
      addedLines: 612,
      removedLines: 211,
      language: "TypeScript",
      languages: {
        TypeScript: 368_000,
        CSS: 92_000,
        JavaScript: 41_000,
        Rust: 28_000,
        HTML: 14_000,
        Shell: 6_400,
      },
    }),
  },
  {
    id: "repo-glyph-sandbox",
    name: "glyph-sandbox",
    path: "~/Code/experiments/glyph-sandbox",
    groupId: "experiments",
    remoteUrl: "https://github.com/valentin/glyph-sandbox",
    providerId: "github",
    logoPath: null,
    logoDarkPath: null,
    sshKeyPath: null,
    status: makeStatus({
      branch: "main",
      head: "55ee77ffaa22",
      ahead: 1,
      lastCommit: {
        sha: "55ee77ffaa22",
        summary: "ci(deps): migrate to vite 5",
        author: "valentin",
        timestamp: daysAgo(6),
      },
      commitActivity: commitActivity([0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0]),
      language: "JavaScript",
      languages: {
        JavaScript: 184_000,
        CSS: 42_000,
        Vue: 28_000,
        HTML: 16_000,
        Svelte: 11_000,
      },
    }),
  },
  {
    id: "repo-signal-lab",
    name: "signal-lab",
    path: "~/Code/experiments/signal-lab",
    groupId: "experiments",
    remoteUrl: "https://bitbucket.org/valentin/signal-lab",
    providerId: "bitbucket",
    logoPath: null,
    logoDarkPath: null,
    sshKeyPath: null,
    status: makeStatus({
      branch: "ci/deps",
      head: "44bb66ddee99",
      behind: 5,
      lastCommit: {
        sha: "44bb66ddee99",
        summary: "ci(deps): quarterly bump",
        author: "valentin",
        timestamp: daysAgo(9),
      },
      commitActivity: commitActivity([0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]),
      language: "Python",
      languages: {
        Python: 206_000,
        Jupyter: 48_000,
        Shell: 14_000,
        TeX: 9_800,
        Go: 6_400,
      },
    }),
  },
];

const AUTHOR_EMAILS: Record<string, string> = {
  valentin: "valentin@example.com",
  maren: "maren@example.com",
  tomi: "tomi@example.com",
  lea: "lea@example.com",
  "renovate-bot": "bot@renovateapp.com",
};

function emailFor(author: string): string | null {
  return AUTHOR_EMAILS[author] ?? null;
}

// Rotating commit summaries so each repo's history reads like real work rather
// than three copies of "refactor: extract shared helpers". Picked by index so
// the dataset stays deterministic across reloads.
const COMMIT_SUMMARIES = [
  "refactor: extract shared helpers",
  "docs: README polish",
  "fix: edge case in pagination",
  "feat: add keyboard shortcut",
  "chore: bump dev deps",
  "test: cover error path",
  "style: align spacing in header",
  "perf: memoize expensive selector",
  "feat: light/dark toggle",
  "fix(a11y): aria-label on icon button",
  "refactor: split util module",
  "docs: changelog entry",
] as const;

const CO_AUTHORS = ["valentin", "maren", "tomi", "lea"] as const;

// Spread commits across the 14-day window AND across varied weekday hours so
// the heatmap/author-clock cards light up in multiple cells. Twelve commits
// per repo × 8 repos ≈ 96 data points, enough for visible texture.
const COMMIT_SCHEDULE: ReadonlyArray<{ days: number; hour: number; minute: number }> = [
  { days: 0, hour: 10, minute: 12 },
  { days: 1, hour: 14, minute: 38 },
  { days: 2, hour: 9, minute: 5 },
  { days: 3, hour: 16, minute: 27 },
  { days: 4, hour: 11, minute: 51 },
  { days: 5, hour: 17, minute: 8 },
  { days: 6, hour: 13, minute: 33 },
  { days: 7, hour: 20, minute: 15 },
  { days: 8, hour: 8, minute: 47 },
  { days: 10, hour: 15, minute: 22 },
  { days: 11, hour: 12, minute: 4 },
  { days: 13, hour: 18, minute: 41 },
];

export const SEED_RECENT_COMMITS: Record<string, RecentCommit[]> = Object.fromEntries(
  SEED_REPOS.map((repo, repoIdx) => {
    const lc = repo.status.lastCommit;
    const commits: RecentCommit[] = lc
      ? [
          {
            sha: lc.sha,
            summary: lc.summary,
            author: lc.author,
            authorEmail: emailFor(lc.author),
            timestamp: lc.timestamp,
            repoId: repo.id,
            repoName: repo.name,
          },
        ]
      : [];
    for (let i = 0; i < COMMIT_SCHEDULE.length; i += 1) {
      const slot = COMMIT_SCHEDULE[i]!;
      const author = CO_AUTHORS[(repoIdx + i) % CO_AUTHORS.length]!;
      const summary = COMMIT_SUMMARIES[(repoIdx * 3 + i) % COMMIT_SUMMARIES.length]!;
      commits.push({
        // `r{idx}c{i}` keeps shas unique across repos even when two repos share
        // a tail in their id (`repo.id.slice(-6)` previously came close to
        // colliding for similarly-named repos).
        sha: `r${repoIdx}c${i.toString(16)}${repo.id.slice(-4)}`,
        summary,
        author,
        authorEmail: emailFor(author),
        timestamp: daysAgo(slot.days, slot.hour, slot.minute),
        repoId: repo.id,
        repoName: repo.name,
      });
    }
    return [repo.id, commits];
  }),
);
