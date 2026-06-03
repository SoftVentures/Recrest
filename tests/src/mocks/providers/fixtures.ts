import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/// Resolve a Rust-side wiremock fixture by relative path. The Plan-8 Express
/// mock servers reuse the same JSON the cargo-test wiremock harness uses —
/// having one source-of-truth fixture set keeps the contract pinned.
///
/// Example: `loadFixture("github/pulls.json")` reads
/// `<repo>/app/src-tauri/tests/fixtures/github/pulls.json`.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "app",
  "src-tauri",
  "tests",
  "fixtures",
);

export function loadFixture<T = unknown>(relativePath: string): T {
  const file = path.join(FIXTURE_ROOT, relativePath);
  const raw = readFileSync(file, "utf8");
  return JSON.parse(raw) as T;
}

/// Same as `loadFixture` but returns the raw text — used for the Bitbucket
/// `pr_combined_diff.txt` fixture and the GitLab pipelines YAML.
export function loadFixtureText(relativePath: string): string {
  return readFileSync(path.join(FIXTURE_ROOT, relativePath), "utf8");
}
