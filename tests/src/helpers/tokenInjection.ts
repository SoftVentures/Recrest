import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/// Tokens to inject for the Plan-8 E2E harness. Keys are provider ids that
/// `auth::token::FileBackend` recognizes (`github`, `gitlab`, `bitbucket`).
/// Values are the raw PAT strings the mock servers expect in the
/// `Authorization` header.
///
/// `auth::token::FileBackend` stores tokens as a flat `BTreeMap<String, String>`
/// — there is no `username` slot, so we don't expose one here. If the Rust
/// schema ever grows fields, update this helper and the Rust struct together.
export type InjectedTokens = Partial<Record<"github" | "gitlab" | "bitbucket", string>>;

/// Absolute path of the test-profile root for a given `id`. Mirrors
/// `identity::test_profile_root()` (Rust) — `<tmpdir>/recrest-test-<id>/`.
/// Keep the two implementations in lockstep.
export function profileRoot(id: string): string {
  return path.join(tmpdir(), `recrest-test-${id}`);
}

/// Absolute path of a file inside the test profile.
export function profilePath(id: string, ...segments: string[]): string {
  return path.join(profileRoot(id), ...segments);
}

/// Write a `dev-tokens.json` into the test profile that
/// `auth::token::FileBackend` will read on next launch. Creates the profile
/// dir if missing, and on Unix sets mode `0600` to match what the Rust
/// backend re-`chmod`s on every save — so a launched Tauri binary doesn't
/// observe a more permissive file and complain.
export async function injectTokens(profileId: string, tokens: InjectedTokens): Promise<string> {
  const dir = profileRoot(profileId);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "dev-tokens.json");
  const payload: Record<string, string> = {};
  for (const [k, v] of Object.entries(tokens)) {
    if (typeof v === "string" && v.length > 0) payload[k] = v;
  }
  const json = JSON.stringify(payload, null, 2);
  await fs.writeFile(file, json, { encoding: "utf8" });
  if (process.platform !== "win32") {
    await fs.chmod(file, 0o600);
  }
  return file;
}

/// Remove the entire test-profile dir. Idempotent — missing-dir is a success.
export async function removeProfile(profileId: string): Promise<void> {
  await fs.rm(profileRoot(profileId), { recursive: true, force: true });
}
