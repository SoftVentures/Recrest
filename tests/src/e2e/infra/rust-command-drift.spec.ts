import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_SEED } from "../../helpers/seed/index.js";
import { buildTauriStub } from "../../helpers/tauri-stub.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..", "..", "..");
const LIB_RS = resolve(REPO_ROOT, "app", "src-tauri", "src", "lib.rs");
const STUB_TS = resolve(REPO_ROOT, "tests", "src", "helpers", "tauri-stub.ts");

async function loadRustCommandNames(): Promise<string[]> {
  const src = await readFile(LIB_RS, "utf8");
  const startIdx = src.indexOf("generate_handler![");
  if (startIdx === -1) throw new Error("generate_handler![] not found in lib.rs");
  const closeIdx = src.indexOf("])", startIdx);
  if (closeIdx === -1) throw new Error("generate_handler![...] unterminated");
  const block = src.slice(startIdx + "generate_handler![".length, closeIdx);
  return block
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split("::");
      return parts[parts.length - 1] ?? entry;
    });
}

async function loadStubCommandCases(): Promise<Set<string>> {
  const src = await readFile(STUB_TS, "utf8");
  const cases = new Set<string>();
  const re = /case\s+"([a-z0-9_]+)":/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    cases.add(m[1]!);
  }
  return cases;
}

test.describe("infra / rust-command-drift", () => {
  test("every `generate_handler!` command is handled by the stub", async () => {
    const rust = await loadRustCommandNames();
    const stub = await loadStubCommandCases();
    const missing = rust.filter((cmd) => !stub.has(cmd));
    expect(
      missing,
      `Tauri stub missing cases for ${missing.length} Rust command(s): ${missing.join(", ")}`,
    ).toEqual([]);
  });

  test("stub produces valid JavaScript embedding the seed", () => {
    const script = buildTauriStub(DEFAULT_SEED);
    expect(script).toContain("__TAURI_INTERNALS__");
    for (const repo of DEFAULT_SEED.repos) {
      expect(script).toContain(repo.id);
    }
  });
});
