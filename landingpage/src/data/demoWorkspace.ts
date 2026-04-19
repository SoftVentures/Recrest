import type { CiState, Remote } from "./mockRepos";

export type Language = "typescript" | "rust" | "python" | "go" | "swift" | "markdown";

export type DemoRepo = {
  id: string;
  remote: Remote;
  name: string;
  path: string;
  branch: string;
  ahead: number;
  behind: number;
  dirty: boolean;
  changed: number;
  added: number;
  removed: number;
  stale?: boolean;
  language: Language;
  statusDotColor: "green" | "amber" | "red" | "gray" | "blue";
  lastCommit: {
    author: string;
    initials: string;
    avatarColor: string;
    message: string;
    when: string;
  };
  ci: CiState[];
  openPrs: number;
  activity: number[];
  pinned?: boolean;
};

/**
 * Avatar-palette — mirrors the real app's deterministic letter-tile scheme.
 * (DirectionA.jsx `AVATAR_PALETTE`.)
 */
const AVATAR_PALETTE = [
  "#d97757",
  "#2f66e6",
  "#16a34a",
  "#7c3aed",
  "#eab308",
  "#ec4899",
  "#0891b2",
  "#64748b",
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function repoAvatarColor(id: string): string {
  const palette = AVATAR_PALETTE;
  return palette[hashCode(id) % palette.length]!;
}

export type DemoGroup = {
  id: string;
  label: string;
  repos: DemoRepo[];
};

export const LANGUAGE_COLORS: Record<Language, string> = {
  typescript: "#3178c6",
  rust: "#dea584",
  python: "#3572A5",
  go: "#00ADD8",
  swift: "#F05138",
  markdown: "#083fa1",
};

/**
 * Demo data shown in the landing hero.
 *
 * Public surface: only Recrest (the product) and local-dev-stacks (public repo)
 * are real. Every other entry is an invented placeholder project to illustrate
 * the dashboard with a believable mix of statuses, languages and groups.
 */
export const demoGroups: DemoGroup[] = [
  {
    id: "open-source",
    label: "Open Source",
    repos: [
      {
        id: "recrest",
        remote: "github",
        name: "Recrest",
        path: "~/open-source/recrest",
        branch: "feature/detail-pane",
        ahead: 4,
        behind: 0,
        dirty: true,
        changed: 7,
        added: 128,
        removed: 42,
        language: "rust",
        statusDotColor: "amber",
        lastCommit: {
          author: "Angelina N.",
          initials: "AN",
          avatarColor: "#d97757",
          message: "feat(detail): slide-in pane + keyboard nav",
          when: "12 min",
        },
        ci: ["ok", "ok", "run", "idle", "idle"],
        openPrs: 2,
        activity: [4, 9, 6, 12, 18, 8, 14, 22, 16, 28, 24, 20, 14, 10],
        pinned: true,
      },
      {
        id: "local-dev-stacks",
        remote: "github",
        name: "local-dev-stacks",
        path: "~/open-source/local-dev-stacks",
        branch: "main",
        ahead: 0,
        behind: 0,
        dirty: false,
        changed: 0,
        added: 0,
        removed: 0,
        language: "python",
        statusDotColor: "blue",
        lastCommit: {
          author: "Angelina N.",
          initials: "AN",
          avatarColor: "#d97757",
          message: "chore: bump docker-compose to v2.29",
          when: "1 w",
        },
        ci: ["ok", "ok", "ok", "ok", "ok"],
        openPrs: 0,
        activity: [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    ],
  },
  {
    id: "acme",
    label: "Acme Labs",
    repos: [
      {
        id: "ledger-api",
        remote: "gitlab",
        name: "ledger-api",
        path: "~/work/acme/ledger-api",
        branch: "feat/multi-currency",
        ahead: 2,
        behind: 1,
        dirty: true,
        changed: 12,
        added: 346,
        removed: 88,
        language: "go",
        statusDotColor: "amber",
        lastCommit: {
          author: "Lukas B.",
          initials: "LB",
          avatarColor: "#7c3aed",
          message: "refactor: split currency conversion",
          when: "2 h",
        },
        ci: ["ok", "ok", "ok", "fail", "idle"],
        openPrs: 1,
        activity: [2, 6, 4, 10, 12, 16, 14, 18, 20, 14, 12, 18, 22, 16],
      },
      {
        id: "pulse-ios",
        remote: "bitbucket",
        name: "pulse-ios",
        path: "~/work/acme/pulse-ios",
        branch: "release/3.2",
        ahead: 0,
        behind: 7,
        dirty: false,
        changed: 0,
        added: 0,
        removed: 0,
        language: "swift",
        statusDotColor: "red",
        lastCommit: {
          author: "Mira W.",
          initials: "MW",
          avatarColor: "#2f66e6",
          message: "chore(release): 3.2.0-rc.2",
          when: "1 d",
        },
        ci: ["ok", "ok", "run", "idle", "idle"],
        openPrs: 1,
        activity: [22, 26, 18, 30, 28, 36, 44, 32, 28, 24, 18, 22, 12, 8],
      },
      {
        id: "starlight-ui",
        remote: "github",
        name: "starlight-ui",
        path: "~/work/acme/starlight-ui",
        branch: "main",
        ahead: 3,
        behind: 0,
        dirty: false,
        changed: 0,
        added: 0,
        removed: 0,
        language: "typescript",
        statusDotColor: "blue",
        lastCommit: {
          author: "Eli K.",
          initials: "EK",
          avatarColor: "#16a34a",
          message: "docs: storybook for tooltip variants",
          when: "5 h",
        },
        ci: ["ok", "ok", "ok", "ok", "ok"],
        openPrs: 0,
        activity: [3, 5, 2, 7, 9, 4, 8, 12, 6, 10, 14, 6, 8, 4],
      },
    ],
  },
  {
    id: "experiments",
    label: "Experiments",
    repos: [
      {
        id: "octo-notes",
        remote: "github",
        name: "octo-notes",
        path: "~/experiments/octo-notes",
        branch: "main",
        ahead: 0,
        behind: 0,
        dirty: false,
        changed: 0,
        added: 0,
        removed: 0,
        language: "typescript",
        statusDotColor: "gray",
        lastCommit: {
          author: "Sam T.",
          initials: "ST",
          avatarColor: "#eab308",
          message: "prototype: markdown outline side panel",
          when: "3 d",
        },
        ci: ["ok", "ok", "ok", "ok", "ok"],
        openPrs: 0,
        activity: [0, 2, 1, 3, 2, 8, 12, 6, 2, 1, 1, 0, 1, 0],
        stale: true,
      },
      {
        id: "glyph-sandbox",
        remote: "github",
        name: "glyph-sandbox",
        path: "~/experiments/glyph-sandbox",
        branch: "playground",
        ahead: 0,
        behind: 0,
        dirty: true,
        changed: 3,
        added: 18,
        removed: 7,
        language: "typescript",
        statusDotColor: "amber",
        lastCommit: {
          author: "Angelina N.",
          initials: "AN",
          avatarColor: "#d97757",
          message: "tinker: variable-font weight morph",
          when: "yesterday",
        },
        ci: ["idle", "idle", "idle", "idle", "idle"],
        openPrs: 0,
        activity: [0, 0, 0, 0, 0, 0, 1, 0, 0, 4, 8, 2, 6, 0],
      },
    ],
  },
];

export const flatDemoRepos: DemoRepo[] = demoGroups.flatMap((g) => g.repos);

export const DEFAULT_SELECTED_ID = "recrest";
