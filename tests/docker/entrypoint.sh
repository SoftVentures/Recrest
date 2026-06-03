#!/usr/bin/env bash
# Plan-8 entrypoint for the Tauri E2E container.
#
# Responsibilities, in order:
#   1. Install JS deps (idempotent under a cached node_modules volume)
#   2. Build the Tauri binary for Linux (debug, no installer bundles)
#   3. Launch `tauri-driver` on :4444 under Xvfb
#   4. Run wdio (or any command passed as arguments) with the harness env
#   5. Clean up — kill tauri-driver, fold its log into the test logs
#
# Designed to be re-entrant: `yarn install` is skipped if `node_modules`
# is already present, `cargo build` reuses the target dir cache, and the
# Xvfb display is unique per run so two containers don't collide.
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/workspace}"
LOG_DIR="${RECREST_E2E_LOG_DIR:-${REPO_ROOT}/target/e2e-logs}"
RUN_ID="${RECREST_E2E_RUN_ID:-$(date +%Y%m%d-%H%M%S)-$$}"
RUN_LOG_DIR="${LOG_DIR}/run-${RUN_ID}"

# Rust target triple — written into the image at build time so the
# harness runs natively on whichever arch Docker is launched against
# (amd64 in CI, arm64 on Apple-Silicon dev boxes). Override with
# RECREST_E2E_RUST_TARGET only when cross-compiling on purpose.
RUST_TARGET="${RECREST_E2E_RUST_TARGET:-$(cat /etc/rust-target 2>/dev/null || echo x86_64-unknown-linux-gnu)}"
TAURI_TARGET_DIR="${REPO_ROOT}/app/src-tauri/target/${RUST_TARGET}/debug"
# Tauri names the binary from `productName` in tauri.conf.json (here: "Recrest"
# from the overlay's "Recrest E2E"). It then writes a launcher script.
# The launcher = the kebab-cased name + matching capitalisation rules.
# Pick whichever matches what cargo actually wrote.
XVFB_DISPLAY=":${RECREST_E2E_DISPLAY:-99}"

mkdir -p "${RUN_LOG_DIR}"
cd "${REPO_ROOT}"

step() { echo "[recrest-e2e] $*"; }

# 1. JS deps. Skip only when node_modules already holds the typescript
# binary — a named docker volume mount creates an empty `node_modules` dir
# that would trip a naive `-d node_modules` check (exit 127 on `tsc`).
if [ -x "node_modules/.bin/tsc" ] && [ "${RECREST_E2E_FORCE_INSTALL:-0}" != "1" ]; then
  step "node_modules populated — skip yarn install"
else
  step "yarn install (force=${RECREST_E2E_FORCE_INSTALL:-0})"
  yarn install --frozen-lockfile 2>&1 | tee "${RUN_LOG_DIR}/yarn-install.log"
fi

# 2. Build the Linux Tauri binary. The frontend bundle has to land first
# so `tauri:build` can pick it up.
step "build shared + app frontend"
yarn workspace @recrest/shared build 2>&1 | tee -a "${RUN_LOG_DIR}/build.log"
yarn workspace @recrest/app build 2>&1 | tee -a "${RUN_LOG_DIR}/build.log"

step "build Tauri Linux binary (debug) via tauri-cli"
# Use the Tauri CLI's `--config` so `tauri.e2e.conf.json` actually merges
# into the build (updater off, bundle off, identifier .e2e). Plain
# `cargo build` ignores Tauri config overlays. `--no-bundle` keeps us at
# the bare binary that tauri-driver launches — we don't need installers.
#
# `CARGO_PROFILE_DEV_DEBUG=0` strips debug-info from the build. E2E
# doesn't need symbols and the full debug profile easily blows past 10
# GB of `target/` under Docker — the OrbStack/Docker-Desktop VM overlay
# is typically 20-30 GB total, so unstripped builds run out of disk
# halfway through linking. With this set, target stays well under 4 GB.
#
# RAM ceiling — under Rosetta translation on Apple Silicon hosts every
# parallel rustc process eats 1-2 GB resident. cargo defaults to one job
# per logical core (8+ on most Macs), so a full Tauri build will push the
# host into swap and freeze unrelated apps. `CARGO_BUILD_JOBS` caps
# concurrency at a value the typical 16 GB dev box can absorb. Override
# with `RECREST_E2E_CARGO_JOBS` on bigger workstations / CI runners.
( cd "${REPO_ROOT}/app/src-tauri" && \
  CARGO_PROFILE_DEV_DEBUG=0 \
  CARGO_BUILD_JOBS="${RECREST_E2E_CARGO_JOBS:-2}" \
  cargo tauri build \
    --debug \
    --no-bundle \
    --target "${RUST_TARGET}" \
    --config tauri.e2e.conf.json \
    2>&1 | tee -a "${RUN_LOG_DIR}/build.log" )

# Resolve the actual binary name — Tauri derives it from the Cargo bin
# name (and casing in tauri.conf.json `productName`), which has been
# observed as "Recrest" on this codebase but could legitimately drift to
# "recrest", "recrest-e2e", or "Recrest E2E" if either config moves.
# Pick the newest extension-less executable in the target dir instead of
# enumerating expected names — that survives any rename in `productName`
# or Cargo.toml `[[bin]]`.
TAURI_BIN="$(find "${TAURI_TARGET_DIR}" -maxdepth 1 -type f -executable \
  ! -name '*.d' ! -name '*.rlib' ! -name '*.rmeta' ! -name '*.so' \
  ! -name '*.so.*' ! -name '*.dylib' -printf '%T@ %p\n' 2>/dev/null \
  | sort -rn | head -n1 | cut -d' ' -f2- || true)"
if [ -z "${TAURI_BIN}" ] || [ ! -x "${TAURI_BIN}" ]; then
  step "ERROR: Tauri binary not found in ${TAURI_TARGET_DIR}"
  ls -la "${TAURI_TARGET_DIR}" 2>&1 | head -20 || true
  exit 1
fi
step "Tauri binary: ${TAURI_BIN}"

# 3. Xvfb — webkit2gtk needs an X display even when fully headless.
step "start Xvfb on ${XVFB_DISPLAY}"
Xvfb "${XVFB_DISPLAY}" -screen 0 1440x900x24 -ac \
  > "${RUN_LOG_DIR}/xvfb.log" 2>&1 &
XVFB_PID=$!
export DISPLAY="${XVFB_DISPLAY}"

# D-Bus session bus. Tauri's libayatana-appindicator and libdbusmenu try
# to connect to a session bus during plugin init; without it those calls
# warn loudly AND can stall the webkit2gtk WebDriver handshake (observed
# in Plan-8 emulation runs — session creation timed out at 30s with
# "dbus-launch: No such file or directory" in the binary log).
step "start dbus session"
eval "$(dbus-launch --sh-syntax)"
export DBUS_SESSION_BUS_ADDRESS DBUS_SESSION_BUS_PID

# Accessibility (a11y) D-Bus service. Without it webkit2gtk-4.1 prints
# "The name org.a11y.Bus was not provided by any .service files" during
# webview init, and the WebDriver `POST /session` handshake hangs because
# WebKit's inspector setup waits on the a11y bus to advertise itself.
# at-spi2-core's `at-spi-bus-launcher` provides the service.
step "start at-spi (a11y) bus"
/usr/libexec/at-spi-bus-launcher --launch-immediately \
  > "${RUN_LOG_DIR}/at-spi.log" 2>&1 &
AT_SPI_PID=$!
# Give it a moment to claim the bus name before WebKit starts looking.
sleep 0.5

cleanup() {
  step "cleanup (xvfb pid=${XVFB_PID})"
  kill "${TAURI_DRIVER_PID:-0}" 2>/dev/null || true
  kill "${AT_SPI_PID:-0}" 2>/dev/null || true
  kill "${XVFB_PID}" 2>/dev/null || true
  kill "${DBUS_SESSION_BUS_PID:-0}" 2>/dev/null || true
}
trap cleanup EXIT

# WebKit2GTK runtime tweaks. Without these, WebKitWebDriver hangs the
# `POST /session` handshake forever under Xvfb on aarch64 Ubuntu 24.04:
# the network/web-process inspector connection never completes (observed
# locally — all subprocesses alive, no errors, just no session ID
# returned). Disabling the bubblewrap sandbox + the DMA-BUF renderer is
# the documented workaround; both are no-ops on production launches.
#
# `WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS` replaced the older
# `WEBKIT_FORCE_SANDBOX=0` in webkit2gtk-4.1 — using the legacy name
# prints a deprecation warning and silently leaves the sandbox enabled.
export WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1
export WEBKIT_DISABLE_DMABUF_RENDERER=1
export WEBKIT_DISABLE_COMPOSITING_MODE=1

# 4. tauri-driver on :4444. WDIO connects to this; tauri-driver in turn
# spawns the Recrest binary and `WebKitWebDriver` together.
# RUST_LOG=trace surfaces tauri-driver's session-forwarding logic for
# diagnosing handshake hangs.
step "start tauri-driver on :4444"
RUST_LOG="${RECREST_E2E_TAURI_DRIVER_LOG:-info}" \
  tauri-driver --port 4444 \
    > "${RUN_LOG_DIR}/tauri-driver.log" 2>&1 &
TAURI_DRIVER_PID=$!

# Wait for tauri-driver to be ready. It binds immediately, so a few
# 100ms polls is enough.
for _ in $(seq 1 50); do
  if curl -fsS http://localhost:4444/status > /dev/null 2>&1; then
    step "tauri-driver ready"
    break
  fi
  sleep 0.1
done

# 5. Forward to wdio (or whatever command was passed). Keep stdout
# streaming so CI users see progress in real time; mirror to a log file.
export RECREST_E2E_TAURI_BIN="${TAURI_BIN}"
export RECREST_E2E_LOG_DIR="${RUN_LOG_DIR}"

# Argument forwarding. Three modes:
#   - no args                       → run all default specs
#   - first arg starts with `src/`  → forward as spec path(s) to wdio
#   - anything else                 → execute as a passthrough command
# The middle case (spec paths) is what `yarn test:e2e:tauri src/...`
# expects. The passthrough escape hatch stays for `bash` debugging inside
# the container.
if [ "$#" -eq 0 ]; then
  step "run wdio (default specs)"
  yarn workspace @recrest/tests test:e2e:tauri 2>&1 \
    | tee "${RUN_LOG_DIR}/wdio.log"
elif [[ "$1" == src/* || "$1" == ./src/* ]]; then
  step "run wdio (specs: $*)"
  yarn workspace @recrest/tests test:e2e:tauri "$@" 2>&1 \
    | tee "${RUN_LOG_DIR}/wdio.log"
else
  step "run passthrough: $*"
  "$@" 2>&1 | tee "${RUN_LOG_DIR}/passthrough.log"
fi
