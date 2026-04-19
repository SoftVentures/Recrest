// Thin wrapper around the `linguist-languages` dataset (GitHub Linguist export).
// Exposes helpers to look up a language by file extension or canonical name.
// One module = single source of truth for language name/color across the UI.
import * as AllLanguages from "linguist-languages";

/** A subset of the linguist language record that the UI cares about. */
export interface LanguageMeta {
  /** Canonical name, e.g. "Rust", "TypeScript". */
  name: string;
  /** "programming" | "markup" | "data" | "prose" (linguist taxonomy). */
  type: string;
  /** Hex color, e.g. "#dea584". Not every language has one. */
  color: string | null;
  /** File extensions with leading dot, e.g. [".rs", ".rs.in"]. */
  extensions: string[];
  /** Short aliases, e.g. ["rs"]. */
  aliases: string[];
}

interface RawLanguage {
  name: string;
  type: string;
  color?: string;
  extensions?: string[];
  aliases?: string[];
}

// `linguist-languages` is a bag of re-exports keyed by the canonical name.
// Flatten into two lookup maps: by lowercased name/alias, and by extension.
const RAW = AllLanguages as unknown as Record<string, RawLanguage>;

/** Canonical popular-language order. When multiple linguist languages claim
 *  the same file extension (e.g. `.md` → Markdown AND "GCC Machine
 *  Description"), whoever appears earlier here wins. Any language not listed
 *  here still fills in obscure extensions after the primaries are seeded. */
const PRIMARY_LANGUAGES: readonly string[] = [
  // Web + JS ecosystem
  "TypeScript",
  "JavaScript",
  "TSX",
  "JSX",
  "HTML",
  "CSS",
  "SCSS",
  "Sass",
  "Less",
  "Vue",
  "Svelte",
  "Astro",
  // Systems / general purpose
  "Rust",
  "Go",
  "C",
  "C++",
  "C#",
  "Java",
  "Kotlin",
  "Scala",
  "Swift",
  "Objective-C",
  "Dart",
  "Zig",
  "Nim",
  "V",
  "Crystal",
  "Assembly",
  "Fortran",
  // Scripting
  "Python",
  "Ruby",
  "PHP",
  "Perl",
  "Lua",
  "R",
  "Shell",
  "PowerShell",
  "Bash",
  "Batchfile",
  // Functional
  "Haskell",
  "OCaml",
  "F#",
  "Elixir",
  "Erlang",
  "Clojure",
  "Scheme",
  "Racket",
  "Elm",
  "Common Lisp",
  // Data / query
  "SQL",
  "GraphQL",
  "Protocol Buffer",
  "HCL",
  "Terraform",
  // Config / infra
  "JSON",
  "YAML",
  "TOML",
  "XML",
  "SVG",
  "INI",
  "Dockerfile",
  "Makefile",
  "CMake",
  // Prose
  "Markdown",
  "reStructuredText",
  "AsciiDoc",
  "Text",
];

const byExtension = new Map<string, LanguageMeta>();
const byName = new Map<string, LanguageMeta>();
const all: LanguageMeta[] = [];

function register(meta: LanguageMeta): void {
  byName.set(meta.name.toLowerCase(), meta);
  for (const alias of meta.aliases) byName.set(alias.toLowerCase(), meta);
  for (const ext of meta.extensions) {
    const clean = (ext.startsWith(".") ? ext.slice(1) : ext).toLowerCase();
    if (!byExtension.has(clean)) byExtension.set(clean, meta);
  }
}

function toMeta(raw: RawLanguage | undefined): LanguageMeta | null {
  if (!raw || typeof raw !== "object" || !raw.name) return null;
  return {
    name: raw.name,
    type: raw.type,
    color: raw.color ?? null,
    extensions: raw.extensions ?? [],
    aliases: raw.aliases ?? [],
  };
}

// Pass 1 — seed the primary-language list in priority order.
for (const name of PRIMARY_LANGUAGES) {
  const meta = toMeta(RAW[name]);
  if (!meta) continue;
  all.push(meta);
  register(meta);
}

// Pass 2 — fill in every remaining linguist language. Existing extensions
// (registered by a primary) are preserved; only new extensions get added.
const seen = new Set(all.map((m) => m.name));
for (const key of Object.keys(RAW)) {
  if (seen.has(key)) continue;
  const meta = toMeta(RAW[key]);
  if (!meta) continue;
  all.push(meta);
  register(meta);
}

/** Look up a language by one of its file extensions (with or without leading dot). */
export function languageByExtension(ext: string): LanguageMeta | null {
  if (!ext) return null;
  const clean = ext.startsWith(".") ? ext.slice(1) : ext;
  return byExtension.get(clean.toLowerCase()) ?? null;
}

/** Look up a language by canonical name or alias, case-insensitive. */
export function languageByName(name: string): LanguageMeta | null {
  if (!name) return null;
  return byName.get(name.toLowerCase()) ?? null;
}

/** All known languages, lazily materialised once at module load. */
export function allLanguages(): readonly LanguageMeta[] {
  return all;
}

/** Fallback used when nothing matches — generic grey. */
export const UNKNOWN_LANGUAGE: LanguageMeta = {
  name: "Other",
  type: "programming",
  color: "#8a8a9a",
  extensions: [],
  aliases: [],
};
