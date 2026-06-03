# Plan-8 Tauri E2E harness image.
#
# Builds a Linux container that can compile the Recrest Tauri app for
# `x86_64-unknown-linux-gnu`, launch it under `xvfb`, drive it through
# `tauri-driver` over WebDriver, and run WDIO specs against the result.
#
# macOS WKWebView has no WebDriver path (Apple's safaridriver doesn't
# expose embedded WKWebViews); Linux webkit2gtk does via `WebKitWebDriver`,
# which `tauri-driver` shells out to. This image is what makes the
# harness portable from a macOS dev box to GitHub-hosted Linux runners.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Etc/UTC \
    PATH="/root/.cargo/bin:/usr/local/bin:${PATH}" \
    RUSTUP_HOME=/root/.rustup \
    CARGO_HOME=/root/.cargo

# System dependencies. Pinned to Ubuntu 24.04's APT versions to avoid the
# 22.04 ↔ 24.04 webkit2gtk-4.0 / 4.1 split (Recrest's Tauri 2 already uses 4.1).
RUN apt-get update && apt-get install -y --no-install-recommends \
        at-spi2-core \
        build-essential \
        ca-certificates \
        curl \
        dbus \
        dbus-x11 \
        file \
        git \
        gnupg \
        libayatana-appindicator3-dev \
        libgtk-3-dev \
        libjavascriptcoregtk-4.1-dev \
        librsvg2-dev \
        libsoup-3.0-dev \
        libssl-dev \
        libwebkit2gtk-4.1-dev \
        libxdo-dev \
        pkg-config \
        webkit2gtk-driver \
        wget \
        xauth \
        xvfb \
    && rm -rf /var/lib/apt/lists/*

# Node 22.20.0 — `engines.node` in package.json + check-node.cjs enforce
# exact match. NodeSource only ships the latest 22.x, so install Node from
# the upstream tarball at the pinned version. The tarball name uses Node's
# own arch suffix (`x64` / `arm64`) which differs from Docker's TARGETARCH
# (`amd64` / `arm64`) — map explicitly so the right binary lands on the
# right host.
ARG TARGETARCH
ARG NODE_VERSION=22.20.0
RUN case "${TARGETARCH}" in \
        amd64) NODE_ARCH=x64 ;; \
        arm64) NODE_ARCH=arm64 ;; \
        *) echo "Unsupported TARGETARCH for Node: ${TARGETARCH}"; exit 1 ;; \
    esac \
    && curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    && tar -xJf "node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
    && rm "node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    && npm i -g yarn@1.22.22

# Rustup (no `rust-toolchain.toml` in the repo → use stable). The
# `--default-toolchain stable` keeps the image hermetic in CI.
#
# Target triple is chosen from Docker's TARGETARCH so the harness can run
# natively on both linux/amd64 (CI runners) and linux/arm64 (Apple-Silicon
# dev boxes). Forcing x86_64 on aarch64 hosts kicks in QEMU emulation,
# which has been observed to crash OrbStack mid cargo-recompile (~600
# crates is too much for emulated builds). The chosen triple is persisted
# to /etc/rust-target so the entrypoint can read it back without
# duplicating the arch-detection logic. TARGETARCH from line 52 is still
# in scope here — no need to re-declare ARG.
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
    | sh -s -- -y --default-toolchain stable --profile minimal \
    && case "${TARGETARCH}" in \
        amd64) RUST_TARGET=x86_64-unknown-linux-gnu ;; \
        arm64) RUST_TARGET=aarch64-unknown-linux-gnu ;; \
        *) echo "Unsupported TARGETARCH: ${TARGETARCH}"; exit 1 ;; \
       esac \
    && rustup target add "${RUST_TARGET}" \
    && echo "${RUST_TARGET}" > /etc/rust-target

# tauri-driver — pin the version so a breaking upstream change can't
# silently fail the harness. Bump in lockstep with the Tauri version.
ARG TAURI_DRIVER_VERSION=0.1.3
RUN cargo install --version "${TAURI_DRIVER_VERSION}" tauri-driver --locked

# tauri-cli — used by the entrypoint to merge `tauri.e2e.conf.json` into
# the build via `cargo tauri build --config`. Without this the overlay is
# inert (cargo build alone doesn't merge Tauri config files).
ARG TAURI_CLI_VERSION=2.4.0
RUN cargo install --version "${TAURI_CLI_VERSION}" tauri-cli --locked

WORKDIR /workspace

# Entrypoint owns three jobs: ensure deps, build the Tauri Linux bundle,
# launch tauri-driver + wdio under xvfb. Keep the script under
# `tests/docker/` so it ships with the image config.
COPY tests/docker/entrypoint.sh /usr/local/bin/recrest-e2e-entrypoint
RUN chmod +x /usr/local/bin/recrest-e2e-entrypoint

ENTRYPOINT ["/usr/local/bin/recrest-e2e-entrypoint"]
