import type { RecentCommit, Repository, RepositoryGroup, RepositoryStatus } from "@recrest/shared";

/**
 * 8 repositories split across 3 groups. Only `Recrest` and `local-dev-stacks`
 * are real project names — everything else is fictional per user memory rule.
 * Data is deterministic: fixed SHAs, stable timestamps, stable commit
 * activity arrays so snapshot assertions don't flap.
 */

export const SEED_GROUPS: Record<string, RepositoryGroup> = {
  "open-source": { id: "open-source", name: "Open Source", color: "#d97757" },
  "acme-labs": { id: "acme-labs", name: "Acme Labs", color: "#2f66e6" },
  experiments: { id: "experiments", name: "Experiments", color: "#7c3aed" },
};

function commitActivity(pattern: number[]): number[] {
  // Ensure 14 entries — pad with zeros if the pattern is shorter.
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
      timestamp: "2026-04-15T10:12:00Z",
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
    status: makeStatus({
      branch: "main",
      head: "f2e1d0c9b8a7",
      lastCommit: {
        sha: "f2e1d0c9b8a7",
        summary: "feat(landing): ship responsive hero demo",
        author: "valentin",
        timestamp: "2026-04-18T16:30:00Z",
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
        timestamp: "2026-04-17T21:04:00Z",
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
    status: makeStatus({
      branch: "main",
      head: "77aa44bb11cc",
      ahead: 0,
      behind: 3,
      lastCommit: {
        sha: "77aa44bb11cc",
        summary: "ci(deps): bump axum to 0.8",
        author: "maren",
        timestamp: "2026-04-14T08:42:00Z",
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
        timestamp: "2026-04-18T11:19:00Z",
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
    status: makeStatus({
      branch: "main",
      head: "c0a7e2d5f9b1",
      lastCommit: {
        sha: "c0a7e2d5f9b1",
        summary: "fix(button): retain focus ring after click",
        author: "lea",
        timestamp: "2026-04-16T13:05:00Z",
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
        timestamp: "2026-04-18T22:40:00Z",
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
    status: makeStatus({
      branch: "main",
      head: "55ee77ffaa22",
      ahead: 1,
      lastCommit: {
        sha: "55ee77ffaa22",
        summary: "ci(deps): migrate to vite 5",
        author: "valentin",
        timestamp: "2026-04-13T09:00:00Z",
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
    status: makeStatus({
      branch: "ci/deps",
      head: "44bb66ddee99",
      behind: 5,
      lastCommit: {
        sha: "44bb66ddee99",
        summary: "ci(deps): quarterly bump",
        author: "valentin",
        timestamp: "2026-04-10T12:00:00Z",
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

/** Map author names to their commit email so Gravatar-based avatars work
 *  in the E2E stub the same way they do against real git data. */
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

export const SEED_RECENT_COMMITS: Record<string, RecentCommit[]> = Object.fromEntries(
  SEED_REPOS.map((repo) => {
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
    // Append two synthetic earlier commits so the "Recent commits" list has substance.
    commits.push(
      {
        sha: `${repo.id.slice(-6)}0a`,
        summary: "refactor: extract shared helpers",
        author: lc?.author ?? "valentin",
        authorEmail: emailFor(lc?.author ?? "valentin"),
        timestamp: "2026-04-11T08:12:00Z",
        repoId: repo.id,
        repoName: repo.name,
      },
      {
        sha: `${repo.id.slice(-6)}1b`,
        summary: "docs: README polish",
        author: lc?.author ?? "valentin",
        authorEmail: emailFor(lc?.author ?? "valentin"),
        timestamp: "2026-04-09T14:40:00Z",
        repoId: repo.id,
        repoName: repo.name,
      },
    );
    return [repo.id, commits];
  }),
);
