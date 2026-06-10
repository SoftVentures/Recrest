// Shared state + layered git-config seed for the dev:web Tauri stub. Lives
// next to `devStub.ts` so the entry stays under the line-ceiling and so each
// handler module can import only the helpers it needs.

export interface DevRepo {
  id: string;
  name: string;
  path: string;
  remoteUrl: string | null;
  sshKeyPath?: string | null;
  logoPath?: string | null;
  logoIsCustom?: boolean;
  status: { head?: string | null } & Record<string, unknown>;
}

export interface DevPullRequest {
  id: string;
  number: number;
  title: string;
  url: string;
  author: string;
  state: "open" | "merged" | "closed" | string;
  draft: boolean;
  sourceBranch: string;
  targetBranch: string;
  createdAt: string;
  updatedAt: string;
  additions: number;
  deletions: number;
  ciStatus: string;
}

export interface DevSeed {
  repos: DevRepo[];
  groups: Record<string, unknown>;
  prs: Record<string, DevPullRequest[]>;
  recentCommits: Record<string, Array<{ timestamp: string }>>;
  providers: Record<string, unknown>;
  settings: unknown;
}

export interface StubStashEntry {
  index: number;
  message: string;
  oid: string;
}

export interface StubLayer {
  path: string;
  condition: string | null;
  active: boolean;
  exists: boolean;
  entries: Record<string, string>;
}

export interface DevStubState {
  seed: DevSeed;
  stashByRepo: Map<string, StubStashEntry[]>;
  globalGitConfig: Record<string, string>;
  layers: StubLayer[];
  preCommitHookRepos: Set<string>;
}

export function createInitialLayers(): StubLayer[] {
  return [
    {
      path: "/Users/dev/.gitconfig",
      condition: null,
      active: true,
      exists: true,
      entries: {
        "user.name": "Dev Stub",
        "user.email": "dev@example.invalid",
        "core.editor": "vim",
        "core.autocrlf": "input",
        "init.defaultBranch": "main",
        "pull.rebase": "true",
        "push.default": "current",
        "push.autoSetupRemote": "true",
        "rebase.autoSquash": "true",
        "fetch.prune": "true",
        "commit.gpgsign": "false",
        "alias.co": "checkout",
        "alias.lol": "log --oneline --graph --decorate --all",
        "url.https://github.com/.insteadOf": "git@github.com:",
        "diff.tool": "vscode",
      },
    },
    {
      path: "/Users/dev/.gitconfig-work",
      condition: "gitdir:/Users/dev/Developer/work/",
      active: false,
      exists: true,
      entries: {
        "user.name": "Dev Stub (Work)",
        "user.email": "work@example.invalid",
        "user.signingkey": "ABC1234DEF",
        "commit.gpgsign": "true",
        "gpg.format": "ssh",
      },
    },
    {
      path: "/Users/dev/.gitconfig-oss",
      condition: "gitdir:/Users/dev/Developer/open-source/",
      active: false,
      exists: true,
      entries: {
        "user.email": "oss@example.invalid",
        "commit.gpgsign": "true",
      },
    },
    {
      path: "/Users/dev/.gitconfig-private",
      condition: "gitdir:/Users/dev/Developer/private/",
      active: false,
      exists: true,
      entries: {
        "user.email": "private@example.invalid",
        "user.signingkey": "PRIV5678",
      },
    },
  ];
}

export function createDevStubState(seed: DevSeed): DevStubState {
  return {
    seed,
    stashByRepo: new Map(),
    globalGitConfig: {
      "user.name": "Dev Stub",
      "user.email": "dev@example.invalid",
    },
    layers: createInitialLayers(),
    // Mark a single dev repo as having a pre-commit hook so the CommitDialog
    // "Hooks active" badge has something to show without a real .git/hooks/.
    preCommitHookRepos: new Set(["repo-octo-notes"]),
  };
}

// Mirrors the backend's `gitdir_matches`: literal prefix with trailing `/`
// means "directory and everything under it".
export function gitdirMatches(condition: string, target: string): boolean {
  if (!condition.startsWith("gitdir:")) return false;
  const pattern = condition.slice("gitdir:".length).trim();
  if (pattern.includes("*") || pattern.includes("?")) return false;
  if (pattern.endsWith("/")) return target.startsWith(pattern);
  return target === pattern;
}

export function repoLocalConfigPath(repoId: string): string {
  return `/Users/dev/Developer/${repoId}/.git/config`;
}

export function resolveLayers(state: DevStubState, repoId: string | null): StubLayer[] {
  const targetPath = repoId ? `/Users/dev/Developer/${repoId.replace(/^repo-/, "")}` : null;
  const out: StubLayer[] = [];
  for (const layer of state.layers) {
    if (layer.condition === null) {
      out.push({ ...layer });
      continue;
    }
    // No target = global view → treat every includeIf as active so the
    // Settings tab shows merged values. Repo scope keeps strict matching.
    const matches = targetPath === null || gitdirMatches(layer.condition, targetPath);
    out.push({ ...layer, active: matches });
  }
  if (repoId) {
    out.push({
      path: repoLocalConfigPath(repoId),
      condition: null,
      active: true,
      exists: true,
      entries: { "remote.origin.url": `git@github.com:dev/${repoId.replace(/^repo-/, "")}.git` },
    });
  }
  return out;
}

export interface ResolvedOrigin {
  value: string;
  sourcePath: string;
  sourceCondition: string | null;
}

export function resolveOrigins(layers: StubLayer[]): Record<string, ResolvedOrigin> {
  const out: Record<string, ResolvedOrigin> = {};
  for (const layer of layers) {
    if (!layer.active) continue;
    for (const [k, v] of Object.entries(layer.entries)) {
      out[k] = { value: v, sourcePath: layer.path, sourceCondition: layer.condition };
    }
  }
  return out;
}

export function findStubLayer(state: DevStubState, path: string): StubLayer | undefined {
  return state.layers.find((l) => l.path === path);
}

// Names matched by the backend's discard-protection filter. Mirrored here so
// `git_discard` in the stub can prompt the same confirmation flow.
export function isStubProtected(path: string): boolean {
  const name = path.split("/").pop() ?? path;
  return (
    name === ".env" ||
    name === ".npmrc" ||
    name.startsWith(".env.") ||
    name.startsWith("id_") ||
    name.endsWith(".pem") ||
    name.endsWith(".key") ||
    name.endsWith(".p12") ||
    name.endsWith(".pfx") ||
    name.endsWith(".jks")
  );
}
