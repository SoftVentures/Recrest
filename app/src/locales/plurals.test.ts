import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const PLURAL_SUFFIXES = ["_zero", "_one", "_two", "_few", "_many", "_other"] as const;

type LocaleRoot = {
  label: string;
  de: string;
  en: string;
};

const LOCALE_ROOTS: LocaleRoot[] = [
  {
    label: "app",
    de: join(repoRoot, "app/src/locales/de"),
    en: join(repoRoot, "app/src/locales/en"),
  },
  {
    label: "landingpage",
    de: join(repoRoot, "landingpage/src/i18n/de.json"),
    en: join(repoRoot, "landingpage/src/i18n/en.json"),
  },
];

type FlatEntry = { file: string; key: string; value: unknown };

function flatten(
  obj: unknown,
  prefix = "",
  out: Record<string, unknown> = {},
): Record<string, unknown> {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    out[prefix] = obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      flatten(v, key, out);
    } else {
      out[key] = v;
    }
  }
  return out;
}

function readJsonIfExists(p: string): unknown | null {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

function collectBundle(localeDirOrFile: string): FlatEntry[] {
  const bundle: FlatEntry[] = [];
  let st: ReturnType<typeof statSync>;
  try {
    st = statSync(localeDirOrFile);
  } catch {
    return bundle;
  }

  const files = st.isDirectory()
    ? readdirSync(localeDirOrFile)
        .filter((f) => f.endsWith(".json"))
        .map((f) => join(localeDirOrFile, f))
    : [localeDirOrFile];

  for (const file of files) {
    const json = readJsonIfExists(file);
    if (!json) continue;
    const flat = flatten(json);
    for (const [k, v] of Object.entries(flat)) {
      bundle.push({ file, key: k, value: v });
    }
  }
  return bundle;
}

function endsWithPluralSuffix(key: string): boolean {
  return PLURAL_SUFFIXES.some((s) => key.endsWith(s));
}

function stripPluralSuffix(key: string): string | null {
  for (const s of PLURAL_SUFFIXES) {
    if (key.endsWith(s)) return key.slice(0, -s.length);
  }
  return null;
}

type Violation = {
  kind: "count-without-plural-key" | "missing-other-counterpart" | "asymmetric-locales";
  locale: string;
  file: string;
  key: string;
  value: string;
};

function findCountWithoutPluralKey(root: LocaleRoot): Violation[] {
  const violations: Violation[] = [];
  for (const locale of [
    { label: "de", entries: collectBundle(root.de) },
    { label: "en", entries: collectBundle(root.en) },
  ]) {
    for (const { file, key, value } of locale.entries) {
      if (typeof value !== "string") continue;
      if (value.includes("{{count}}") && !endsWithPluralSuffix(key)) {
        violations.push({
          kind: "count-without-plural-key",
          locale: locale.label,
          file: relative(repoRoot, file),
          key,
          value,
        });
      }
    }
  }
  return violations;
}

function findMissingOtherCounterpart(root: LocaleRoot): Violation[] {
  const violations: Violation[] = [];
  for (const locale of [
    { label: "de", entries: collectBundle(root.de) },
    { label: "en", entries: collectBundle(root.en) },
  ]) {
    const keys = new Set(locale.entries.map((e) => e.key));
    const fileByKey = new Map(locale.entries.map((e) => [e.key, e.file]));
    const seenStems = new Map<string, string>();
    for (const key of keys) {
      const stem = stripPluralSuffix(key);
      if (stem == null) continue;
      seenStems.set(stem, key);
    }
    for (const [stem, exampleKey] of seenStems) {
      const otherKey = `${stem}_other`;
      if (!keys.has(otherKey)) {
        violations.push({
          kind: "missing-other-counterpart",
          locale: locale.label,
          file: relative(repoRoot, fileByKey.get(exampleKey) ?? ""),
          key: exampleKey,
          value: `(missing ${otherKey})`,
        });
      }
    }
  }
  return violations;
}

function findAsymmetricLocales(root: LocaleRoot): Violation[] {
  const violations: Violation[] = [];
  const de = collectBundle(root.de);
  const en = collectBundle(root.en);
  const dePlural = new Set(de.filter((e) => endsWithPluralSuffix(e.key)).map((e) => e.key));
  const enPlural = new Set(en.filter((e) => endsWithPluralSuffix(e.key)).map((e) => e.key));
  for (const k of dePlural) {
    if (!enPlural.has(k)) {
      const file = de.find((e) => e.key === k)?.file ?? "";
      violations.push({
        kind: "asymmetric-locales",
        locale: "de",
        file: relative(repoRoot, file),
        key: k,
        value: `(missing in en bundle of ${root.label})`,
      });
    }
  }
  for (const k of enPlural) {
    if (!dePlural.has(k)) {
      const file = en.find((e) => e.key === k)?.file ?? "";
      violations.push({
        kind: "asymmetric-locales",
        locale: "en",
        file: relative(repoRoot, file),
        key: k,
        value: `(missing in de bundle of ${root.label})`,
      });
    }
  }
  return violations;
}

describe("i18n plural integrity", () => {
  for (const root of LOCALE_ROOTS) {
    describe(root.label, () => {
      it("every {{count}}-string is keyed with a plural suffix", () => {
        expect(findCountWithoutPluralKey(root)).toEqual([]);
      });

      it("every plural variant has a matching _other counterpart", () => {
        expect(findMissingOtherCounterpart(root)).toEqual([]);
      });

      it("plural keys are symmetric across de and en", () => {
        expect(findAsymmetricLocales(root)).toEqual([]);
      });
    });
  }
});
