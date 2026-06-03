import { execFile as execFileCb } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { profileRoot } from "./tokenInjection";

const execFile = promisify(execFileCb);

/// On-disk git repo seeded under the test-profile root. Lives entirely
/// inside `<tmpdir>/recrest-test-${profileId}/<repoId>/` so a crashed test
/// leaves no trace under the user's home.
///
/// The repo starts with one committed baseline file so `HEAD` resolves —
/// the working-copy commands the spec exercises (stage, unstage, discard,
/// stash) all rely on a present HEAD.
export interface ScratchRepo {
  repoId: string;
  repoPath: string;
}

export async function seedScratchRepo(
  profileId: string,
  repoId: string,
  opts: { withPreCommitHook?: boolean } = {},
): Promise<ScratchRepo> {
  const repoPath = path.join(profileRoot(profileId), repoId);
  await fs.mkdir(repoPath, { recursive: true });

  await git(repoPath, ["init", "-q", "--initial-branch=main"]);
  await git(repoPath, ["config", "user.email", "e2e@example.com"]);
  await git(repoPath, ["config", "user.name", "E2E Tester"]);
  await git(repoPath, ["config", "commit.gpgsign", "false"]);

  await fs.writeFile(path.join(repoPath, "README.md"), "# scratch\n");
  await git(repoPath, ["add", "README.md"]);
  await git(repoPath, ["commit", "-q", "-m", "initial"]);

  if (opts.withPreCommitHook) {
    const hookPath = path.join(repoPath, ".git", "hooks", "pre-commit");
    await fs.writeFile(hookPath, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  }

  return { repoId, repoPath };
}

export async function writeWorktreeFile(
  repo: ScratchRepo,
  relPath: string,
  contents: string,
): Promise<void> {
  const full = path.join(repo.repoPath, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, contents);
}

export async function readGitLogSubjects(repo: ScratchRepo, limit = 5): Promise<string[]> {
  const { stdout } = await execFile("git", ["log", `-n${limit}`, "--format=%s"], {
    cwd: repo.repoPath,
  });
  return stdout
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function git(cwd: string, args: string[]): Promise<void> {
  await execFile("git", args, { cwd });
}
