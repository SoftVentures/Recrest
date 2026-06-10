#!/usr/bin/env bash
# Plan-8 — run the full Tauri E2E harness from the repo root.
#
# Behavior:
#   - If `RECREST_E2E_NATIVE=1`, runs the harness on the host (Linux only).
#     This is the path GitHub-Actions takes on `ubuntu-24.04` — no Docker
#     layer needed because the runner is already Linux.
#   - Otherwise, builds the Docker image if absent, then runs the suite
#     inside the container with the repo bind-mounted. Defaults are tuned
#     for macOS / Windows dev boxes.
#
# Extra args are forwarded to wdio so you can pin to one spec:
#   yarn test:e2e:tauri src/e2e-tauri/merge-pr.spec.ts
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Architecture selection. Default is `amd64` so a single container shape
# works identically on Mac (Apple Silicon → Rosetta translation), Linux
# (native), and Windows (Docker Desktop + WSL2 → native or WSL emulated).
# `amd64` is also the documented Tauri / `tauri-driver` golden path —
# `webkit2gtk-4.1` + `WebKitWebDriver` is well-tested there.
#
# Apple-Silicon dev boxes can opt into a faster native build with
# `RECREST_E2E_ARCH=arm64`, but webkit2gtk-driver's session handshake
# has known aarch64 quirks; treat that mode as experimental.
case "${RECREST_E2E_ARCH:-amd64}" in
  amd64|arm64) ARCH_TAG="${RECREST_E2E_ARCH:-amd64}" ;;
  *) echo "Unknown RECREST_E2E_ARCH '${RECREST_E2E_ARCH}', expected amd64 or arm64" >&2; exit 1 ;;
esac
PLATFORM_FLAG="--platform=linux/${ARCH_TAG}"
IMAGE_TAG="${RECREST_E2E_IMAGE:-recrest-e2e-${ARCH_TAG}}"
DOCKERFILE="${REPO_ROOT}/tests/docker/e2e.Dockerfile"

step() { printf '\033[1;34m[run-tauri-e2e]\033[0m %s\n' "$*"; }

if [ "${RECREST_E2E_NATIVE:-0}" = "1" ]; then
  step "native-mode (no Docker) — assumes Linux + webkit2gtk-driver + tauri-driver on PATH"
  # entrypoint.sh defaults REPO_ROOT to `/workspace` (the Docker bind-mount
  # path). On a bare host (GitHub Actions runner) that dir doesn't exist and
  # can't be created at the filesystem root — export the real repo root so the
  # log/build paths resolve under the checkout instead of `/workspace`.
  export REPO_ROOT
  exec bash "${REPO_ROOT}/tests/docker/entrypoint.sh" "$@"
fi

if ! command -v docker > /dev/null 2>&1; then
  step "ERROR: docker not on PATH and RECREST_E2E_NATIVE != 1"
  step "Either install Docker Desktop or run with RECREST_E2E_NATIVE=1 on a Linux host."
  exit 1
fi

# Build image if it doesn't exist locally. Honor `--rebuild` to force.
REBUILD=0
PASSTHROUGH=()
for arg in "$@"; do
  case "$arg" in
    --rebuild) REBUILD=1 ;;
    *) PASSTHROUGH+=("$arg") ;;
  esac
done

if [ "${REBUILD}" = "1" ] || ! docker image inspect "${IMAGE_TAG}" > /dev/null 2>&1; then
  step "building image ${IMAGE_TAG} (${PLATFORM_FLAG})"
  ( cd "${REPO_ROOT}" && docker build ${PLATFORM_FLAG} -f "${DOCKERFILE}" -t "${IMAGE_TAG}" . )
fi

step "running suite (image=${IMAGE_TAG}, arch=${ARCH_TAG})"
exec docker run --rm ${PLATFORM_FLAG} \
  -v "${REPO_ROOT}:/workspace" \
  -v "recrest-e2e-cargo-registry-${ARCH_TAG}:/root/.cargo/registry" \
  -v "recrest-e2e-cargo-target-${ARCH_TAG}:/workspace/app/src-tauri/target" \
  -v "recrest-e2e-node-modules-${ARCH_TAG}:/workspace/node_modules" \
  --shm-size=2g \
  -e RECREST_E2E_LOG_LEVEL="${RECREST_E2E_LOG_LEVEL:-info}" \
  "${IMAGE_TAG}" \
  ${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"}
