# Recrest E2E Docker harness

Plan-8 (see `docs/plans/03/08-e2e-test-harness.md`) ships a Linux container that runs the **full Tauri stack** — Rust backend, embedded WebKit, real IPC — and drives it through `tauri-driver` + WDIO. macOS WKWebView has no WebDriver path, so this container is what lets the harness run unattended on a dev box (via Docker Desktop) and in CI (via the native `ubuntu-24.04` runner).

## Build

```bash
# From the repo root:
docker build -f tests/docker/e2e.Dockerfile -t recrest-e2e .
```

Cold build: ~10–15 min (NodeSource apt, rustup, `cargo install tauri-driver`).
Warm rebuild with cache: ~30s.

## Run

```bash
docker run --rm \
  -v "$PWD:/workspace" \
  -v recrest-cargo-registry:/root/.cargo/registry \
  -v recrest-cargo-target:/workspace/app/src-tauri/target \
  recrest-e2e
```

The two named volumes preserve the Cargo registry + the target dir between runs — without them the first `cargo build` rebuilds libgit2, reqwest, et al. from scratch every time (~8 min). With the volumes, second run is ~30s.

Pass a specific WDIO command:

```bash
docker run --rm -v "$PWD:/workspace" recrest-e2e \
  yarn workspace @recrest/tests test:e2e:tauri src/e2e-tauri/merge-pr.spec.ts
```

## What the entrypoint does

1. `yarn install` if `node_modules/` is missing
2. `yarn workspace @recrest/shared build` + `@recrest/app build`
3. `cargo build --target x86_64-unknown-linux-gnu` (debug)
4. Start `Xvfb` on `:99` (webkit2gtk needs a display)
5. Start `tauri-driver --port 4444`
6. Run `yarn workspace @recrest/tests test:e2e:tauri` (or your passthrough)
7. Pipe everything to `target/e2e-logs/run-<timestamp>/`

## Logs

Every run lands under `target/e2e-logs/run-<id>/`:

- `build.log` — shared + app + cargo
- `xvfb.log`
- `tauri-driver.log`
- `wdio.log` — spec output, what the user sees first when CI fails
- `mock-{github,gitlab,bitbucket}.log` — Express mock servers (when wdio fixtures emit them)

## Caveats

- macOS-specific code paths (Apple-grid icons, tray-on-mac templating, NSDistributedNotificationCenter polling) are **not** covered. Those stay in the manual-smoke bucket — by design.
- `tauri-driver` is pinned via a `--build-arg` in the Dockerfile. Bump together with the Tauri-core upgrade so the WebDriver layer doesn't drift.
- The container is single-session — wdio's `maxInstances: 1` is a hard requirement of `tauri-driver`. CI shards across multiple jobs, not multiple sessions per job.
