import { UNKNOWN_LANGUAGE, languageByExtension, languageByName } from "@recrest/shared";

/**
 * Resolves the user-facing label + color for a language identifier. Accepts
 * either a file extension (e.g. "rs") or a canonical linguist name
 * (e.g. "Rust"). Falls back to a neutral "Other" when unknown.
 *
 * Pure utility — no React / DOM. Lives in `lib/` so both components and
 * Storybook stories can reuse it without pulling in the atom that renders
 * the coloured dot.
 */
export function langMeta(lang: string | null | undefined): { label: string; color: string } {
  if (!lang) return toLabel(UNKNOWN_LANGUAGE);
  const byExt = languageByExtension(lang);
  if (byExt) return toLabel(byExt);
  const byName = languageByName(lang);
  if (byName) return toLabel(byName);
  return toLabel(UNKNOWN_LANGUAGE);
}

function toLabel(meta: { name: string; color: string | null }): { label: string; color: string } {
  return { label: meta.name, color: meta.color ?? UNKNOWN_LANGUAGE.color ?? "#8a8a9a" };
}
