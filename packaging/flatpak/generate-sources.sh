#!/usr/bin/env bash
#
# Regenerates the vendored dependency manifests the Flathub build needs.
#
# Flathub builds with no network access, so every crate and every npm package
# has to be listed as a source ahead of time. Two upstream generators do that:
#
#   flatpak-cargo-generator  app/src-tauri/Cargo.lock  -> cargo-sources.json
#   flatpak_node_generator   yarn.lock                 -> node-sources.json
#
# Run this after ANY dependency change. The `flatpak.yml` workflow rebuilds the
# manifest offline on every push that touches a lockfile, so a stale pair fails
# CI rather than the Flathub review.
#
# Runs inside a container by default. The generators are Linux-oriented Python
# with their own dependency sets, and pinning them to a container keeps the
# output reproducible and makes the script work from a Windows or macOS
# checkout too. Set GENERATE_SOURCES_NATIVE=1 to use a local python3 instead —
# then you need `aiohttp`, `tomlkit` and the `flatpak_node_generator` package
# installed yourself.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$here/../.." && pwd)"

FBT_REPO="${FBT_REPO:-https://github.com/flatpak/flatpak-builder-tools.git}"

# The work both paths perform, as a single shell program. `flatpak_node_generator`
# is installed as a package and invoked with `-m`; the cargo one stays a plain
# script. Neither takes `--xdg-layout` any more — that layout is the default now,
# and passing the old flag fails with "expected one argument".
read -r -d '' script <<'INNER' || true
set -e
git clone --depth 1 -q "$FBT_REPO" /tmp/fbt
pip install --quiet aiohttp tomlkit /tmp/fbt/node

echo "==> cargo sources"
python3 /tmp/fbt/cargo/flatpak-cargo-generator.py \
  /repo/app/src-tauri/Cargo.lock \
  -o /repo/packaging/flatpak/cargo-sources.json

echo "==> node sources"
cd /repo
python3 -m flatpak_node_generator \
  -o /repo/packaging/flatpak/node-sources.json \
  yarn /repo/yarn.lock

python3 - <<'PY'
import json
for name in ("cargo-sources.json", "node-sources.json"):
    with open(f"/repo/packaging/flatpak/{name}") as fh:
        print(f"  {name}: {len(json.load(fh))} sources")
PY
INNER

if [ "${GENERATE_SOURCES_NATIVE:-0}" = "1" ]; then
  echo "==> native (GENERATE_SOURCES_NATIVE=1)"
  FBT_REPO="$FBT_REPO" repo="$repo_root" bash -c "${script//\/repo/$repo_root}"
else
  command -v docker >/dev/null || {
    echo "docker is required (or set GENERATE_SOURCES_NATIVE=1)" >&2
    exit 1
  }
  echo "==> containerised (python:3.12-slim)"
  # MSYS_NO_PATHCONV stops Git Bash on Windows from rewriting /repo into a
  # Windows path before docker ever sees it.
  MSYS_NO_PATHCONV=1 docker run --rm \
    -v "$repo_root:/repo" \
    -e FBT_REPO="$FBT_REPO" \
    python:3.12-slim \
    bash -c "apt-get update -qq >/dev/null && apt-get install -y -qq git >/dev/null; $script"
fi

echo
echo "Regenerated:"
ls -la "$here/cargo-sources.json" "$here/node-sources.json"
echo
echo "Commit both, and bump 'tag' + 'commit' in eu.softventures.recrest.yml if the release moved."
