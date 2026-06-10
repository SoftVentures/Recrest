import { promises as fs } from "node:fs";
import path from "node:path";

import { profileRoot } from "../helpers/tokenInjection";
import { type StartedE2E, seedSettings, startRecrestE2E } from "./fixtures/recrest";
import { SETTINGS_TAB, T } from "./page/recrestPage";

/// Plan-10 — Plan 06 (git config full) E2E backfill.
/// Closes Plan-06's deferred Done-check: Settings → Git config → add
/// identity → assert `.gitconfig` mutation → remove → assert block gone.
///
/// Runs under the wdio harness which already redirects `$HOME` and
/// `GIT_CONFIG_GLOBAL` to the test-profile root (`wdio.conf.ts:42-47`),
/// so this spec reads/writes a sandboxed `.gitconfig` — never the user's.

declare const browser: WebdriverIO.Browser;

describe("Plan 6 — Git config (full)", () => {
  let e2e: StartedE2E;

  afterEach(async () => {
    if (e2e) await e2e.cleanup();
  });

  it("add includeIf identity writes a block; remove strips it", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(e2e.profileId, { repos: {}, locale: "en" });
    await resetGlobalGitconfig(e2e.profileId);
    await e2e.restart();

    const scratchDir = path.join(profileRoot(e2e.profileId), "scratch");
    await fs.mkdir(scratchDir, { recursive: true });
    const condition = `gitdir:${scratchDir}/`;

    await e2e.page.openSettings(SETTINGS_TAB.GIT);
    await e2e.page.waitForTestId(T.gitConfigSettings.root);

    await e2e.page.click(T.gitConfigSettings.includeManager.addButton);
    await e2e.page.waitForTestId(T.gitConfigSettings.addIncludeModal.root);

    await e2e.page.type(T.gitConfigSettings.addIncludeModal.directoryInput, scratchDir);
    await e2e.page.type(
      T.gitConfigSettings.addIncludeModal.targetInput,
      path.join(profileRoot(e2e.profileId), ".gitconfig-scratch"),
    );
    await e2e.page.click(T.gitConfigSettings.addIncludeModal.submit);

    await browser.waitUntil(
      async () => (await readGlobalGitconfig(e2e.profileId)).includes(condition),
      {
        timeout: 10_000,
        timeoutMsg: `includeIf block for "${condition}" never landed in .gitconfig`,
      },
    );

    await e2e.page.waitForTestId(T.gitConfigSettings.includeManager.row(condition));
    await e2e.page.click(T.gitConfigSettings.includeManager.rowRemove(condition));
    await e2e.page.waitForTestId(T.gitConfigSettings.removeIncludeConfirm.root);
    await e2e.page.click(T.gitConfigSettings.removeIncludeConfirm.confirm);

    await browser.waitUntil(
      async () => !(await readGlobalGitconfig(e2e.profileId)).includes(condition),
      { timeout: 10_000, timeoutMsg: `includeIf block was not stripped from .gitconfig` },
    );
  });

  it("custom-key add: row appears and the value lands in .gitconfig", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(e2e.profileId, { repos: {}, locale: "en" });
    await resetGlobalGitconfig(e2e.profileId);
    await e2e.restart();

    const key = "test.flag";
    const value = "enabled";

    await e2e.page.openSettings(SETTINGS_TAB.GIT);
    await e2e.page.waitForTestId(T.gitConfigSettings.root);
    await e2e.page.click(T.gitConfigSettings.customKeyAdd);

    await e2e.page.type(T.gitConfigSettings.customKeyAddKeyInput, key);
    await e2e.page.type(T.gitConfigSettings.customKeyAddValueInput, value);
    await e2e.page.click(T.gitConfigSettings.customKeyAddSubmit);

    await e2e.page.waitForTestId(T.gitConfigSettings.customKeyRow(key));

    await browser.waitUntil(
      async () => (await readGlobalGitconfig(e2e.profileId)).includes(value),
      { timeout: 10_000, timeoutMsg: `custom key "${key}" never landed in .gitconfig` },
    );
  });

  it("alias add: row appears and the alias lands in .gitconfig", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(e2e.profileId, { repos: {}, locale: "en" });
    await resetGlobalGitconfig(e2e.profileId);
    await e2e.restart();

    const aliasName = "co";

    await e2e.page.openSettings(SETTINGS_TAB.GIT);
    await e2e.page.waitForTestId(T.gitConfigSettings.root);

    await e2e.page.type(T.gitConfigSettings.aliasesEditor.addNameInput, aliasName);
    await e2e.page.type(T.gitConfigSettings.aliasesEditor.addCommandInput, "checkout");
    await e2e.page.click(T.gitConfigSettings.aliasesEditor.addSubmit);

    await e2e.page.waitForTestId(T.gitConfigSettings.aliasesEditor.row(aliasName));

    await browser.waitUntil(
      async () =>
        /\[alias\][\s\S]*\bco\s*=\s*checkout/.test(await readGlobalGitconfig(e2e.profileId)),
      { timeout: 10_000, timeoutMsg: "alias co = checkout never landed in .gitconfig" },
    );
  });

  it("URL rewrite add: row appears and lands in .gitconfig", async () => {
    e2e = await startRecrestE2E();
    await seedSettings(e2e.profileId, { repos: {}, locale: "en" });
    await resetGlobalGitconfig(e2e.profileId);
    await e2e.restart();

    const fromUrl = "ssh://git@github.com/";

    await e2e.page.openSettings(SETTINGS_TAB.GIT);
    await e2e.page.waitForTestId(T.gitConfigSettings.root);

    await e2e.page.type(T.gitConfigSettings.urlRewritesEditor.addFromInput, fromUrl);
    await e2e.page.type(T.gitConfigSettings.urlRewritesEditor.addToInput, "https://github.com/");
    await e2e.page.click(T.gitConfigSettings.urlRewritesEditor.addSubmit);

    await e2e.page.waitForTestId(T.gitConfigSettings.urlRewritesEditor.row(fromUrl));

    await browser.waitUntil(
      async () => (await readGlobalGitconfig(e2e.profileId)).includes("insteadOf"),
      { timeout: 10_000, timeoutMsg: "URL rewrite never landed in .gitconfig" },
    );
  });
});

async function readGlobalGitconfig(profileId: string): Promise<string> {
  const file = path.join(profileRoot(profileId), ".gitconfig");
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return "";
  }
}

async function resetGlobalGitconfig(profileId: string): Promise<void> {
  const file = path.join(profileRoot(profileId), ".gitconfig");
  await fs.writeFile(file, "");
}
