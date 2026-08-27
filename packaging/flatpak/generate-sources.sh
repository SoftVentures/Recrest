#!/usr/bin/env bash
#
# Regenerates the vendored dependency manifests the Flathub build needs.
#
# Flathub builds with no network access, so every crate and every npm package
# has to be listed as a source ahead of time. Two upstream generators do that:
#
#   flatpak-cargo-generator  app/src-tauri/Cargo.lock  -> cargo-sources.json
#   flatpak-node-generator   yarn.lock                 -> node-sources.json
#
# Run this after ANY dependency change. The `flatpak.yml` workflow rebuilds the
# manifest offline on every push that touches a lockfile, so a stale pair of
# files fails CI rather than the Flathub review.
#
# Requires: python3, flatpak-builder-tools checked out (see README.md).

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$here/../.." && pwd)"

: "${FLATPAK_BUILDER_TOOLS:?set FLATPAK_BUILDER_TOOLS to a flatpak-builder-tools checkout}"

cargo_gen="$FLATPAK_BUILDER_TOOLS/cargo/flatpak-cargo-generator.py"
node_gen="$FLATPAK_BUILDER_TOOLS/node/flatpak-node-generator.py"

for tool in "$cargo_gen" "$node_gen"; do
  [ -f "$tool" ] || {
    echo "missing generator: $tool" >&2
    exit 1
  }
done

echo "==> cargo sources"
python3 "$cargo_gen" "$repo_root/app/src-tauri/Cargo.lock" -o "$here/cargo-sources.json"

echo "==> node sources"
# `--xdg-layout` keeps the generated cache paths in step with the XDG_CACHE_HOME
# the manifest sets; without it the offline install looks in the wrong place.
python3 "$node_gen" --xdg-layout yarn "$repo_root/yarn.lock" -o "$here/node-sources.json"

echo
echo "Regenerated:"
ls -la "$here/cargo-sources.json" "$here/node-sources.json"
echo
echo "Commit both, and bump 'tag' + 'commit' in eu.softventures.recrest.yml if the release moved."
