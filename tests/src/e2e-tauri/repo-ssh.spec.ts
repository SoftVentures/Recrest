import { expect } from "expect-webdriverio";
import { promises as fs } from "node:fs";
import path from "node:path";

import { profileRoot } from "../helpers/tokenInjection";
import { type StartedE2E, seedSettings, startRecrestE2E } from "./fixtures/recrest";
import { T } from "./page/recrestPage";

/// Plan-10 — Plan 02 §B.6 (per-repo SSH key) E2E backfill.
/// Repo-detail SSH modal: pick None / pick discovered key / open guide.

declare const browser: WebdriverIO.Browser;

const REPO_ID = "e2e-ssh-repo";
const KEY_NAME = "id_ed25519";

describe("Plan 2 — Per-repo SSH key", () => {
  let e2e: StartedE2E;

  afterEach(async () => {
    if (e2e) await e2e.cleanup();
  });

  it("picking the 'None' option clears sshKeyPath in settings.json", async () => {
    e2e = await startRecrestE2E();
    await seedSshKey(e2e.profileId);
    await seedRepoWithSsh(e2e.profileId, path.join(profileRoot(e2e.profileId), ".ssh", KEY_NAME));
    await e2e.restart();

    await e2e.page.openRepo(REPO_ID);
    await e2e.page.click(T.repoDetail.ssh.trigger);
    await e2e.page.waitForTestId(T.repoDetail.ssh.modal);
    await e2e.page.click(T.ssh.none);

    await browser.waitUntil(
      async () => (await readRepoSshKeyPath(e2e.profileId, REPO_ID)) === null,
      { timeout: 10_000, timeoutMsg: "sshKeyPath never cleared in settings.json" },
    );
  });

  it("picking a discovered key persists its path in settings.json", async () => {
    e2e = await startRecrestE2E();
    await seedSshKey(e2e.profileId);
    await seedRepoWithSsh(e2e.profileId, null);
    await e2e.restart();

    await e2e.page.openRepo(REPO_ID);
    await e2e.page.click(T.repoDetail.ssh.trigger);
    await e2e.page.waitForTestId(T.repoDetail.ssh.modal);
    await e2e.page.click(T.ssh.option(KEY_NAME));

    const expectedPath = path.join(profileRoot(e2e.profileId), ".ssh", KEY_NAME);
    await browser.waitUntil(
      async () => (await readRepoSshKeyPath(e2e.profileId, REPO_ID)) === expectedPath,
      { timeout: 10_000, timeoutMsg: `sshKeyPath never updated to ${expectedPath}` },
    );
  });

  it("SSH guide modal opens", async () => {
    e2e = await startRecrestE2E();
    await seedSshKey(e2e.profileId);
    await seedRepoWithSsh(e2e.profileId, null);
    await e2e.restart();

    await e2e.page.openRepo(REPO_ID);
    await e2e.page.click(T.repoDetail.ssh.trigger);
    await e2e.page.waitForTestId(T.repoDetail.ssh.modal);
    await e2e.page.click(T.ssh.guideOpen);
    await e2e.page.waitForTestId(T.ssh.guideModal);

    const visible = await e2e.page.byTestId(T.ssh.guideModal).isDisplayed();
    expect(visible).toBe(true);
  });
});

async function seedSshKey(profileId: string): Promise<void> {
  const sshDir = path.join(profileRoot(profileId), ".ssh");
  await fs.mkdir(sshDir, { recursive: true, mode: 0o700 });
  const keyPath = path.join(sshDir, KEY_NAME);
  // Dummy key body — the SSH discovery only reads the file metadata to
  // surface a chooser option; it never opens the key for signing in tests.
  await fs.writeFile(
    keyPath,
    "-----BEGIN OPENSSH PRIVATE KEY-----\nfake\n-----END OPENSSH PRIVATE KEY-----\n",
    { mode: 0o600 },
  );
  await fs.writeFile(`${keyPath}.pub`, "ssh-ed25519 AAAA fake\n", { mode: 0o644 });
}

async function seedRepoWithSsh(profileId: string, sshKeyPath: string | null): Promise<void> {
  const repoPath = path.join(profileRoot(profileId), REPO_ID);
  await fs.mkdir(repoPath, { recursive: true });
  await seedSettings(profileId, {
    repos: {
      [REPO_ID]: {
        id: REPO_ID,
        name: REPO_ID,
        path: repoPath,
        groupId: null,
        remoteUrl: "git@github.com:test-org/test-repo.git",
        providerId: "github",
        manual: true,
        sshKeyPath,
      },
    },
    locale: "en",
  });
}

async function readRepoSshKeyPath(profileId: string, repoId: string): Promise<string | null> {
  const raw = await fs.readFile(path.join(profileRoot(profileId), "settings.json"), "utf8");
  const parsed = JSON.parse(raw) as {
    repos?: Record<string, { sshKeyPath?: unknown; ssh_key_path?: unknown }>;
  };
  const repo = parsed.repos?.[repoId];
  if (!repo) return null;
  const v = repo.sshKeyPath ?? repo.ssh_key_path;
  return typeof v === "string" ? v : null;
}
