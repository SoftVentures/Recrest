/**
 * Plan 1 §A.4: stable signature key for an author so the same person isn't
 * counted twice when their name has a Unicode/ASCII variant
 * (`Müller` vs `Mueller`) or when their email differs slightly between
 * machines.
 *
 * Strategy:
 *   1. Apply per-language transliteration maps before NFD because NFD
 *      decomposes `ö` into `o + ¨` and an ASCII fold leaves a bare `o` —
 *      losing the German `oe` convention. Same for French, Polish,
 *      Turkish, Nordic, etc.
 *   2. Run NFD + combining-mark strip for everything else (general
 *      diacritics).
 *   3. Lowercase, collapse whitespace, strip non-alphanumerics.
 *
 * Returns `<name-key>|<email-local-part-key>`. Either side may be empty
 * when the input is empty.
 */

/** Pre-NFD transliteration map. Entries handle digraphs that NFD breaks. */
const TRANSLITERATIONS: Record<string, string> = {
  // German
  ä: "ae",
  ö: "oe",
  ü: "ue",
  Ä: "Ae",
  Ö: "Oe",
  Ü: "Ue",
  ß: "ss",
  // French
  œ: "oe",
  Œ: "Oe",
  æ: "ae",
  Æ: "Ae",
  // Nordic
  å: "aa",
  Å: "Aa",
  ø: "oe",
  Ø: "Oe",
  // Turkish
  ı: "i",
  İ: "I",
  ş: "s",
  Ş: "S",
  ğ: "g",
  Ğ: "G",
  ç: "c",
  Ç: "C",
  // Polish
  ł: "l",
  Ł: "L",
  ń: "n",
  Ń: "N",
  ż: "z",
  Ż: "Z",
  ź: "z",
  Ź: "Z",
  ę: "e",
  Ę: "E",
  ą: "a",
  Ą: "A",
  ś: "s",
  Ś: "S",
};

function applyTransliterations(input: string): string {
  let out = "";
  for (const ch of input) {
    out += TRANSLITERATIONS[ch] ?? ch;
  }
  return out;
}

function stripDiacritics(input: string): string {
  // NFD splits accented characters into base + combining marks. The regex
  // then drops the combining marks (Unicode block U+0300–U+036F) so any
  // residual accent (Latin or Cyrillic) becomes an ASCII letter. Using
  // the escape form keeps the source file ASCII-clean and easy to read
  // (M1 — the literal `[\u0300-\u036f]` form was indistinguishable from a typo).
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normaliseFragment(input: string): string {
  if (!input) return "";
  const transliterated = applyTransliterations(input);
  const stripped = stripDiacritics(transliterated);
  // Lowercase, drop everything that's not [a-z0-9].
  return stripped
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function emailLocalPart(email: string | null | undefined): string {
  if (!email) return "";
  const idx = email.indexOf("@");
  return idx >= 0 ? email.slice(0, idx) : email;
}

/**
 * Build the key used to dedupe authors. Result is intentionally low-cardinality:
 * combining name + email-local with a `|` separator avoids collisions when
 * two unrelated authors happen to normalise to the same name.
 */
export function signatureKey(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const nameKey = normaliseFragment(name ?? "");
  const localKey = normaliseFragment(emailLocalPart(email));
  return `${nameKey}|${localKey}`;
}

/** Pure helper exposed for tests — applies the same normalisation rules to a
 *  single fragment. */
export const __normaliseFragmentForTests = normaliseFragment;
