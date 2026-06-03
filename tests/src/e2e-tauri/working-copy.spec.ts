import { expect } from "expect-webdriverio";

import {
  type ScratchRepo,
  readGitLogSubjects,
  seedScratchRepo,
  writeWorktreeFile,
} from "../helpers/scratchRepo";
import { type StartedE2E, seedSettings, startRecrestE2E } from "./fixtures/recrest";
import { T } from "./page/recrestPage";

/// Plan-10 — Plan 03 (working copy) E2E backfill.
/// Stage / commit / discard-guard / stash / hooks-badge.

declare const browser: WebdriverIO.Browser;

describe("Plan 3 — Working copy", () => {
  let e2e: StartedE2E;
  let repo: ScratchRepo;

  afterEach(async () => {
    if (e2e) await e2e.cleanup();
  });

  it("stage all → commit dialog template fills subject → submit lands in git log", async () => {
    e2e = await startRecrestE2E();
    repo = await seedScratchRepo(e2e.profileId, "scratch");
    await seedRepoInSettings(e2e.profileId, repo);
    await writeWorktreeFile(repo, "src/new.ts", "export const x = 1;\n");
    await e2e.restart();

    await e2e.page.openRepo(repo.repoId);
    await e2e.page.click(T.workingCopy.stageAll);
    await e2e.page.click(T.workingCopy.commit);
    await e2e.page.waitForTestId(T.commitDialog.root);

    await e2e.page.click(T.commitDialog.insertTemplate);
    const subjectEl = e2e.page.byTestId(T.commitDialog.subject);
    const subject = await subjectEl.getValue();
    expect(subject.length).toBeGreaterThan(0);

    await e2e.page.click(T.commitDialog.submit);
    await e2e.page.expectSuccessToast();

    await browser.waitUntil(async () => (await readGitLogSubjects(repo)).includes(subject), {
      timeout: 10_000,
      timeoutMsg: `commit subject "${subject}" never appeared in git log`,
    });
  });

  it("discarding an untracked .env triggers the confirm dialog", async () => {
    e2e = await startRecrestE2E();
    repo = await seedScratchRepo(e2e.profileId, "scratch");
    await seedRepoInSettings(e2e.profileId, repo);
    await writeWorktreeFile(repo, ".env", "SECRET=value\n");
    await e2e.restart();

    await e2e.page.openRepo(repo.repoId);
    await e2e.page.click(T.workingCopy.discardRow(".env"));

    await e2e.page.waitForTestId(T.confirmDialog.root);
    await e2e.page.click(T.confirmDialog.cancel);
  });

  it("stash save → entry appears → pop restores the dirty worktree", async () => {
    e2e = await startRecrestE2E();
    repo = await seedScratchRepo(e2e.profileId, "scratch");
    await seedRepoInSettings(e2e.profileId, repo);
    await writeWorktreeFile(repo, "src/new.ts", "export const x = 1;\n");
    await e2e.restart();

    await e2e.page.openRepo(repo.repoId);
    await e2e.page.click(T.workingCopy.stashSave);
    await e2e.page.waitForTestId(T.workingCopy.stashRow(0));

    await e2e.page.click(T.workingCopy.stashPop(0));

    await browser.waitUntil(
      async () => {
        const section = e2e.page.byTestId(T.workingCopy.section("unstaged"));
        return await section.isDisplayed();
      },
      { timeout: 10_000, timeoutMsg: "unstaged section never re-appeared after stash pop" },
    );
  });

  it("hooks badge appears when .git/hooks/pre-commit exists", async () => {
    e2e = await startRecrestE2E();
    repo = await seedScratchRepo(e2e.profileId, "scratch", { withPreCommitHook: true });
    await seedRepoInSettings(e2e.profileId, repo);
    await writeWorktreeFile(repo, "src/new.ts", "x");
    await e2e.restart();

    await e2e.page.openRepo(repo.repoId);
    await e2e.page.click(T.workingCopy.stageAll);
    await e2e.page.click(T.workingCopy.commit);
    await e2e.page.waitForTestId(T.commitDialog.hooksBadge);
  });
});

async function seedRepoInSettings(profileId: string, repo: ScratchRepo): Promise<void> {
  await seedSettings(profileId, {
    repos: {
      [repo.repoId]: {
        id: repo.repoId,
        name: repo.repoId,
        path: repo.repoPath,
        groupId: null,
        remoteUrl: null,
        providerId: null,
        manual: true,
      },
    },
    locale: "en",
  });
}
