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
manifest="$here/com.soft_ventures.Recrest.yml"

FBT_REPO="${FBT_REPO:-https://github.com/flatpak/flatpak-builder-tools.git}"

# The lockfiles are read from the COMMIT the manifest builds, not from the
# working tree. Those are different things and the difference is silent: a source
# list generated from the working tree describes a different dependency graph
# than the one that gets checked out, and it fails deep inside the offline build
# with something like
#
#   error Can't make a request in offline mode (".../motion-12.40.0.tgz")
#
# which reads as "the generator missed a package" and is really "you generated
# for a different commit". Verified the hard way: develop had motion@^13.0.0
# while v0.11.0 pinned motion@^12.40.0.
#
# `commit:` and not `tag:`, because the commit is what flatpak-builder actually
# checks out — reading the field both sides use is what keeps them in step.
ref="$(sed -n 's/^ *commit: *//p' "$manifest" | head -n1 | tr -d '"'"'"'"'"'")"
[ -n "$ref" ] || {
  echo "could not read 'commit:' from $manifest" >&2
  exit 1
}
git -C "$repo_root" rev-parse -q --verify "$ref^{commit}" >/dev/null || {
  echo "commit $ref (from the manifest) is not in this clone — fetch it first" >&2
  exit 1
}

# Staged INSIDE the repo, not in `mktemp -d`. On Windows, Git Bash hands out an
# MSYS path (`/tmp/tmp.XXXX`) that Docker Desktop reads as a container path — the
# mount silently comes up empty and the generators run against whatever was there
# before, which is exactly the wrong-commit bug this staging exists to prevent.
# The repo root is already mounted and its path is already translated correctly.
echo "==> lockfiles from $ref"
lockdir="$here/.locks"
trap 'rm -rf "$lockdir"' EXIT
rm -rf "$lockdir"
mkdir -p "$lockdir/app/src-tauri"
git -C "$repo_root" show "$ref:yarn.lock" > "$lockdir/yarn.lock"
git -C "$repo_root" show "$ref:app/src-tauri/Cargo.lock" > "$lockdir/app/src-tauri/Cargo.lock"

# Relative to the repo root, so it resolves inside the container's /repo mount.
lockdir_rel="packaging/flatpak/.locks"

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
  /repo/LOCKDIR/app/src-tauri/Cargo.lock \
  -o /repo/packaging/flatpak/cargo-sources.json

echo "==> node sources"
cd /repo/LOCKDIR
python3 -m flatpak_node_generator \
  -o /repo/packaging/flatpak/node-sources.json \
  yarn /repo/LOCKDIR/yarn.lock

python3 - <<'PY'
import json
for name in ("cargo-sources.json", "node-sources.json"):
    with open(f"/repo/packaging/flatpak/{name}") as fh:
        print(f"  {name}: {len(json.load(fh))} sources")
PY
INNER

script="${script//LOCKDIR/$lockdir_rel}"

if [ "${GENERATE_SOURCES_NATIVE:-0}" = "1" ]; then
  echo "==> native (GENERATE_SOURCES_NATIVE=1)"
  FBT_REPO="$FBT_REPO" bash -c "${script//\/repo/$repo_root}"
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
echo "Generated for $ref. When the manifest moves to a new commit or release tag,"
echo "change it there FIRST and re-run this — the two must describe the same commit."
