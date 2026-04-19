export type Remote = "github" | "gitlab" | "bitbucket";

export type CiState = "ok" | "fail" | "run" | "idle";

export type Badge =
  | { kind: "ahead"; label: string }
  | { kind: "behind"; label: string }
  | { kind: "dirty" }
  | { kind: "ok"; label: string }
  | { kind: "mr"; count: number };

export type MockRepo = {
  remote: Remote;
  name: string;
  branch: string;
  meta: string[];
  badges: Badge[];
  ci: CiState[];
};

export const mockRepos: MockRepo[] = [
  {
    remote: "github",
    name: "recrest",
    branch: "main",
    meta: ["14 commits ahead", "·", "3 changed files"],
    badges: [{ kind: "ahead", label: "↑14" }, { kind: "dirty" }],
    ci: ["ok", "ok", "ok", "ok", "run"],
  },
  {
    remote: "gitlab",
    name: "benova/dashboard-api",
    branch: "feat/auth-rework",
    meta: ["2 open merge requests", "·", "updated 2h ago"],
    badges: [
      { kind: "mr", count: 2 },
      { kind: "ok", label: "clean" },
    ],
    ci: ["ok", "ok", "ok", "ok", "ok"],
  },
  {
    remote: "bitbucket",
    name: "legacy/billing-service",
    branch: "develop",
    meta: ["CI failing on 2 jobs", "·", "updated yesterday"],
    badges: [{ kind: "ahead", label: "↑3" }, { kind: "dirty" }],
    ci: ["ok", "fail", "ok", "fail", "idle"],
  },
  {
    remote: "github",
    name: "portfolio.dev",
    branch: "main",
    meta: ["in sync", "·", "updated 3d ago"],
    badges: [
      { kind: "ok", label: "synced" },
      { kind: "ok", label: "clean" },
    ],
    ci: ["ok", "ok", "ok", "ok", "ok"],
  },
  {
    remote: "gitlab",
    name: "benova/mobile-app",
    branch: "release/2.4",
    meta: ["behind origin by 7 commits", "·", "1 open MR"],
    badges: [
      { kind: "behind", label: "↓7" },
      { kind: "mr", count: 1 },
    ],
    ci: ["ok", "ok", "run", "idle", "idle"],
  },
];
