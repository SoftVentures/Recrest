import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const appSrc = join(repoRoot, "app/src");

const SENTINEL = "audit:ignore-fact";

type Hit = { file: string; line: number; text: string };

function walk(dir: string, predicate: (path: string) => boolean): string[] {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      continue;
    }
    for (const name of entries) {
      const full = join(current, name);
      let st: ReturnType<typeof statSync>;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) stack.push(full);
      else if (predicate(full)) out.push(full);
    }
  }
  return out;
}

function readLines(file: string): string[] {
  try {
    return readFileSync(file, "utf8").split("\n");
  } catch {
    return [];
  }
}

function sweep(files: string[], rx: RegExp): Hit[] {
  const hits: Hit[] = [];
  for (const file of files) {
    const lines = readLines(file);
    for (let i = 0; i < lines.length; i += 1) {
      const text = lines[i]!;
      if (!rx.test(text)) continue;
      if (text.includes(SENTINEL)) continue;
      if ((lines[i - 1] ?? "").includes(SENTINEL)) continue;
      hits.push({ file: relative(repoRoot, file), line: i + 1, text: text.trim() });
    }
  }
  return hits;
}

// Path separators are normalised to `/` before this is tested, so a single
// forward-slash pattern matches on both POSIX (CI) and Windows (local dev).
const SOURCE_EXCLUDE = /\.(stories|test)\.|\/locales\/|\/devStub|test-setup|test-helpers/;

const toPosix = (p: string): string => p.replace(/\\/g, "/");

const localeJsonFiles = walk(join(appSrc, "locales"), (p) => p.endsWith(".json"));
const tsxFiles = walk(appSrc, (p) => p.endsWith(".tsx") && !SOURCE_EXCLUDE.test(toPosix(p)));
const tsAndTsxFiles = walk(
  appSrc,
  (p) => (p.endsWith(".ts") || p.endsWith(".tsx")) && !SOURCE_EXCLUDE.test(toPosix(p)),
);
const detectionScanFiles = [
  ...walk(
    appSrc,
    (p) => (p.endsWith(".ts") || p.endsWith(".tsx")) && !/\.(stories|test)\./.test(p),
  ),
  ...localeJsonFiles,
];

describe("static facts must come from live sources, not hardcoded literals", () => {
  it("locale JSONs contain no hardcoded OS strings", () => {
    expect(sweep(localeJsonFiles, /"(macos|windows|linux|darwin)( [0-9.]+)?"/i)).toEqual([]);
  });

  it("locale JSONs contain no hardcoded arch strings", () => {
    expect(sweep(localeJsonFiles, /"(x86_64|aarch64|arm64|x64)"/)).toEqual([]);
  });

  it("locale JSONs contain no hardcoded version-number literals", () => {
    expect(sweep(localeJsonFiles, /"v?[0-9]+\.[0-9]+\.[0-9]+"/)).toEqual([]);
  });

  it("source files contain no hardcoded version-number literals", () => {
    expect(sweep(tsAndTsxFiles, /['"]v?[0-9]+\.[0-9]+\.[0-9]+['"]/)).toEqual([]);
  });

  it("JSX contains no hardcoded multi-digit counts", () => {
    expect(sweep(tsxFiles, />[0-9]{2,}</)).toEqual([]);
  });

  it("no 'Erkannt:' / 'Detected:' strings without sentinel", () => {
    expect(sweep(detectionScanFiles, /Erkannt:|Detected:/)).toEqual([]);
  });
});
