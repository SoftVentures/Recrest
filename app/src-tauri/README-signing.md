# Updater Signing Keys

The `plugins.updater.pubkey` value in `tauri.conf.json` is a **DEV** minisign
public key generated with a placeholder password. It exists so the updater
plugin can initialize and CI release builds don't crash on missing config, but
it is **not suitable for production use**.

## Before the first real signed release

1. Regenerate the keypair with a strong password:
   ```bash
   yarn workspace @recrest/app tauri signer generate -p "<strong-password>" -f -w /tmp/recrest-prod.key
   ```
2. Store both artefacts in 1Password (SoftVentures vault, item "Recrest updater signing"):
   - the private key file contents (`recrest-prod.key`), base64-encoded
   - the password used in step 1
3. Add GitHub Actions secrets on `SoftVentures/Recrest`:
   - `TAURI_SIGNING_PRIVATE_KEY` — contents of `recrest-prod.key` (base64, single line)
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the strong password
4. Replace the `pubkey` value in `app/src-tauri/tauri.conf.json` with the
   contents of the matching `recrest-prod.key.pub` (the whole base64 blob,
   comment line and key line are both included — Tauri accepts the file
   content verbatim).
5. Delete `/tmp/recrest-prod.key` from disk once secrets are populated.
6. Commit the pubkey change, tag a release, verify the resulting `latest.json`
   and `.sig` files on the Release page.

## Why a placeholder pubkey is committed now

The `tauri-plugin-updater` crate validates the pubkey format at startup. A
literal `REPLACE_WITH_MINISIGN_PUBKEY` string would fail schema checks and
prevent the app from launching in release mode, so we ship a real (but
throwaway) keypair. The private key is **not** in the repo; it was discarded
right after the pubkey was extracted. Any release built against this key will
carry matching signatures but anyone with the placeholder password can forge
update payloads — hence this must be rotated before the first production
release.

The release workflow (`.github/workflows/release-tauri.yml`) contains a grep
guard that refuses to build if the pubkey is still the literal placeholder
sentinel `REPLACE_WITH_MINISIGN_PUBKEY`.
