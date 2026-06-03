import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { buildBitbucketApp } from "./bitbucket";
import { buildGithubApp } from "./github";
import { buildGitlabApp } from "./gitlab";
import { type MockState, type ProviderId, freshScenarioFlags, freshState } from "./state";

/// One bundle of all three mock provider servers + their shared mutable
/// state. Lifecycle: `start()` → wdio specs run with the returned URLs
/// → `stop()` between tests (and on cleanup). `reset()` wipes the in-memory
/// state without closing the sockets, so cross-spec teardown costs nothing.
///
/// Each server listens on port 0 so the kernel hands us a free port — tests
/// running in parallel don't fight for fixed ports, and CI doesn't need
/// stickiness. The actual port is returned in `urls`.
export class MockProviderSuite {
  private servers: { github?: Server; gitlab?: Server; bitbucket?: Server } = {};
  private _state: MockState = freshState();

  get state(): MockState {
    return this._state;
  }

  async start(): Promise<{ githubUrl: string; gitlabUrl: string; bitbucketUrl: string }> {
    const [github, gitlab, bitbucket] = await Promise.all([
      listen(buildGithubApp(this._state)),
      listen(buildGitlabApp(this._state)),
      listen(buildBitbucketApp(this._state)),
    ]);
    this.servers.github = github.server;
    this.servers.gitlab = gitlab.server;
    this.servers.bitbucket = bitbucket.server;
    return {
      githubUrl: github.url,
      gitlabUrl: gitlab.url,
      bitbucketUrl: bitbucket.url,
    };
  }

  /// Wipe in-memory state. Server sockets stay open. Useful between
  /// individual specs inside the same suite run.
  ///
  /// We mutate in place rather than reassigning `_state`, because each
  /// route handler captured a reference to the *original* state object at
  /// `start()` time. Reassigning `_state = freshState()` would leave the
  /// handlers talking to the stale object — bugs that only show up after
  /// the first reset.
  reset(): void {
    const s = this._state;
    s.deletedBranches.github.clear();
    s.deletedBranches.gitlab.clear();
    s.deletedBranches.bitbucket.clear();
    s.mergedPrs.github.clear();
    s.mergedPrs.gitlab.clear();
    s.mergedPrs.bitbucket.clear();
    s.requests.github.length = 0;
    s.requests.gitlab.length = 0;
    s.requests.bitbucket.length = 0;
    (["github", "gitlab", "bitbucket"] as ProviderId[]).forEach((p) => {
      // Reset every flag — assign via freshScenarioFlags() so adding a new
      // flag to ProviderScenarioFlags can't silently leak across specs.
      Object.assign(s.scenarios[p], freshScenarioFlags());
    });
  }

  async stop(): Promise<void> {
    await Promise.all(
      (["github", "gitlab", "bitbucket"] as const).map(
        (k) =>
          new Promise<void>((resolve) => {
            const s = this.servers[k];
            if (!s) {
              resolve();
              return;
            }
            s.close(() => resolve());
          }),
      ),
    );
    this.servers = {};
  }
}

/// Boot an Express app on an ephemeral port. Returns the server + the
/// fully-qualified URL `http://localhost:<port>` ready for the Tauri client.
async function listen(
  app: ReturnType<typeof buildGithubApp>,
): Promise<{ server: Server; url: string }> {
  return new Promise((resolve, reject) => {
    const server = app
      .listen(0, "127.0.0.1", () => {
        const addr = server.address() as AddressInfo;
        resolve({ server, url: `http://127.0.0.1:${addr.port}` });
      })
      .on("error", reject);
  });
}

export type { MockState, ProviderId } from "./state";
export type { RequestRecord, MergedPrRecord } from "./state";
