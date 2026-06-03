import { expect } from "expect-webdriverio";
import { promises as fs } from "node:fs";
import path from "node:path";

import { profileRoot } from "../helpers/tokenInjection";
import { type StartedE2E, seedSettings, startRecrestE2E } from "./fixtures/recrest";
import { SETTINGS_TAB, T } from "./page/recrestPage";

/// Plan-10 — Plan 02 (repo polish) E2E backfill.
/// Covers: pin direct-click, sortable header asc/desc + persistence,
/// default scan-path radio. Per the master spec these used to live in
/// Playwright-MCP smokes only; this file locks them in unattended.

declare const browser: WebdriverIO.Browser;

describe("Plan 2 — Repo polish", () => {
  let e2e: StartedE2E;

  afterEach(async () => {
    if (e2e) await e2e.cleanup();
  });

  it("clicking the inline pin indicator toggles the repo's pinned state", async () => {
    e2e = await startRecrestE2E();
    await seedTwoLocalRepos(e2e.profileId, { pinned: [] });
    await e2e.restart();

    await e2e.page.openReposPage();
    const pinBtn = await e2e.page.byPinToggle("repo-alpha");
    await pinBtn.click();

    await browser.waitUntil(
      async () => (await readPinnedIds(e2e.profileId)).includes("repo-alpha"),
      { timeout: 10_000, timeoutMsg: "repo-alpha never landed in pinnedRepoIds" },
    );

    await pinBtn.click();
    await browser.waitUntil(
      async () => !(await readPinnedIds(e2e.profileId)).includes("repo-alpha"),
      { timeout: 10_000, timeoutMsg: "repo-alpha never left pinnedRepoIds" },
    );
  });

  it("sort header reorders the list and the choice survives a session reload", async () => {
    e2e = await startRecrestE2E();
    await seedTwoLocalRepos(e2e.profileId, { pinned: [] });
    await e2e.restart();

    await e2e.page.openReposPage();

    await e2e.page.click(T.repos.sortHeader("name"));
    await e2e.page.expectSortActive("name");

    expect(await e2e.page.repoRowOrder()).toEqual(["repo-alpha", "repo-beta"]);

    await e2e.page.click(T.repos.sortHeader("name"));
    await browser.waitUntil(async () => (await e2e.page.repoRowOrder())[0] === "repo-beta", {
      timeout: 5_000,
      timeoutMsg: "desc order never materialised",
    });

    await e2e.restart();
    await e2e.page.openReposPage();
    expect((await e2e.page.repoRowOrder())[0]).toBe("repo-beta");
  });

  it("Settings → Integrations: default scan path radio persists to settings.json", async () => {
    e2e = await startRecrestE2E();
    const sandboxA = path.join(profileRoot(e2e.profileId), "scan-a");
    const sandboxB = path.join(profileRoot(e2e.profileId), "scan-b");
    await fs.mkdir(sandboxA, { recursive: true });
    await fs.mkdir(sandboxB, { recursive: true });
    await seedSettings(e2e.profileId, {
      repos: {},
      scanPaths: [sandboxA, sandboxB],
      defaultScanPath: sandboxA,
      locale: "en",
    });
    await e2e.restart();

    await e2e.page.openSettings(SETTINGS_TAB.INTEGRATIONS);
    await e2e.page.click(T.settings.integrations.scanDefaultRadio(sandboxB));

    await browser.waitUntil(async () => (await readDefaultScanPath(e2e.profileId)) === sandboxB, {
      timeout: 10_000,
      timeoutMsg: "defaultScanPath never updated to sandbox-b",
    });
  });
});

async function seedTwoLocalRepos(profileId: string, opts: { pinned: string[] }): Promise<void> {
  const root = profileRoot(profileId);
  await fs.mkdir(path.join(root, "alpha"), { recursive: true });
  await fs.mkdir(path.join(root, "beta"), { recursive: true });
  await seedSettings(profileId, {
    repos: {
      "repo-alpha": {
        id: "repo-alpha",
        name: "alpha",
        path: path.join(root, "alpha"),
        groupId: null,
        remoteUrl: null,
        providerId: null,
        manual: true,
      },
      "repo-beta": {
        id: "repo-beta",
        name: "beta",
        path: path.join(root, "beta"),
        groupId: null,
        remoteUrl: null,
        providerId: null,
        manual: true,
      },
    },
    pinnedRepoIds: opts.pinned,
    locale: "en",
  });
}

async function readSettings(profileId: string): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(path.join(profileRoot(profileId), "settings.json"), "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

async function readPinnedIds(profileId: string): Promise<string[]> {
  const s = await readSettings(profileId);
  const ids = s.pinnedRepoIds ?? s.pinned_repo_ids;
  return Array.isArray(ids) ? (ids as string[]) : [];
}

async function readDefaultScanPath(profileId: string): Promise<string | undefined> {
  const s = await readSettings(profileId);
  const v = s.defaultScanPath ?? s.default_scan_path;
  return typeof v === "string" ? v : undefined;
}
