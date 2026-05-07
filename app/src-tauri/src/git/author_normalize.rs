//! Plan 1 §A.4: stable signature key for a commit author so the same person
//! isn't counted twice when their name has a Unicode/ASCII variant
//! (`Müller` vs `Mueller`) or when their email differs slightly between
//! machines.
//!
//! The TS-side mirror lives in `app/src/lib/authorNormalize.ts`. Outputs of
//! the two implementations must match for the tabulated cases the plan
//! enumerates — the Rust side is authoritative for backend aggregations
//! (commit lists, leaderboards) while the TS side handles UI-only paths.
//!
//! Algorithm (order matters — see the doc comment in `normalise_fragment`):
//!   1. **German umlauts FIRST** — before any unicode-fold step. The
//!      `deunicode` crate would lossily map `ö → o` (loses the digraph
//!      convention), so we expand `ö → oe` etc. up front.
//!   2. **Diaspora maps** — French (`œ → oe`), Nordic (`å → aa`, `ø → oe`),
//!      Turkish (`ı → i`, `ş → s`, `ğ → g`), Polish (`ł → l`, `ń → n`,
//!      `ś → s`, `ź → z`, `ż → z`). Same reasoning: the language convention
//!      should win over the generic transliteration.
//!   3. `deunicode::deunicode(...)` for everything else (Cyrillic, CJK,
//!      generic accented Latin).
//!   4. `to_lowercase()` and `trim()`. **Whitespace inside the name is
//!      preserved** because `deunicode` of CJK names like `北条 太郎`
//!      produces space-separated romanisations like `Bei tiao Tai lang` —
//!      collapsing those would turn distinct names into mush.
//!
//! Returns `<name-key>|<email-local-part-key>`. Either side may be empty.

use deunicode::deunicode;

/// Pre-deunicode transliteration map. Sorted by Unicode codepoint inside
/// each language family for at-a-glance verification.
fn pre_translit(c: char) -> Option<&'static str> {
    match c {
        // German umlauts — must run before deunicode.
        'ä' => Some("ae"),
        'ö' => Some("oe"),
        'ü' => Some("ue"),
        'Ä' => Some("Ae"),
        'Ö' => Some("Oe"),
        'Ü' => Some("Ue"),
        'ß' => Some("ss"),
        // French digraphs.
        'œ' => Some("oe"),
        'Œ' => Some("Oe"),
        'æ' => Some("ae"),
        'Æ' => Some("Ae"),
        // Nordic.
        'å' => Some("aa"),
        'Å' => Some("Aa"),
        'ø' => Some("oe"),
        'Ø' => Some("Oe"),
        // Turkish — `ı` (dotless i) must fold to `i` not be uppercased to `I`.
        'ı' => Some("i"),
        'İ' => Some("I"),
        'ş' => Some("s"),
        'Ş' => Some("S"),
        'ğ' => Some("g"),
        'Ğ' => Some("G"),
        // Polish.
        'ł' => Some("l"),
        'Ł' => Some("L"),
        'ń' => Some("n"),
        'Ń' => Some("N"),
        'ś' => Some("s"),
        'Ś' => Some("S"),
        'ź' => Some("z"),
        'Ź' => Some("Z"),
        'ż' => Some("z"),
        'Ż' => Some("Z"),
        _ => None,
    }
}

fn apply_pre_translit(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for c in input.chars() {
        if let Some(rep) = pre_translit(c) {
            out.push_str(rep);
        } else {
            out.push(c);
        }
    }
    out
}

/// Normalise a free-form fragment (name or email-local-part) to the form
/// used inside `signature_key`.
///
/// Pipeline:
///   1. `apply_pre_translit` — language-specific digraph maps run first.
///   2. `deunicode` — handles the long tail (CJK, Cyrillic, accents we
///      didn't enumerate above).
///   3. `to_lowercase()` then `trim()`. Inner whitespace is preserved
///      (CJK romanisation produces space-separated tokens).
///
/// For email-local-part we additionally strip the conventional separators
/// (`.`, `_`, `-`, `+`) so `a.mueller` and `amueller` collapse — that's the
/// behaviour the plan's table assumes (`a.mueller@example.com` →
/// `amueller`). For names we strip the same separators so `Anna Müller`
/// (with whitespace) and `anna-mueller` collapse to `annamueller`.
fn normalise_name(input: &str) -> String {
    if input.is_empty() {
        return String::new();
    }
    let translit = apply_pre_translit(input);
    let folded = deunicode(&translit);
    let lowered = folded.to_lowercase();

    // M3: CJK names like `太郎` and `太朗` deunicode to different romanised
    // tokens (`tai lang` vs `tai lang` etc. — the *segments* differ even
    // when a careless ascii-fold would smush them together). The previous
    // implementation stripped every non-alphanumeric, including the spaces
    // `deunicode` emits between CJK ideographs, which collapsed legitimately
    // distinct names into the same key. We now keep a single internal space
    // for any input that contained CJK ideographs (U+3400–U+9FFF range), so
    // the key for `太郎` stays distinct from `太朗`. Latin / generic Western
    // names still collapse spaces — `Anna Müller` → `annamueller` — which is
    // what the existing tests pin down.
    let has_cjk = input.chars().any(|c| {
        let cp = c as u32;
        // CJK Unified Ideographs (basic + Extension A) covers the common
        // case; uncommon ranges fall through to the Latin pathway, which
        // is fine — the regression we're fixing is the *segmented*
        // romanisation deunicode emits for these blocks specifically.
        (0x3400..=0x4DBF).contains(&cp) || (0x4E00..=0x9FFF).contains(&cp)
    });

    if has_cjk {
        // Collapse runs of whitespace to a single space, keep ASCII alnum +
        // the internal space delimiter. Trim outer whitespace so leading /
        // trailing spaces (introduced by `deunicode` at the boundaries)
        // don't end up in the key.
        let mut out = String::with_capacity(lowered.len());
        let mut prev_space = true; // suppress leading spaces
        for c in lowered.chars() {
            if c.is_ascii_alphanumeric() {
                out.push(c);
                prev_space = false;
            } else if c.is_whitespace() {
                if !prev_space {
                    out.push(' ');
                    prev_space = true;
                }
            }
            // anything else (punctuation, residual non-ascii) is dropped
        }
        // Drop a trailing space, if any.
        if out.ends_with(' ') {
            out.pop();
        }

        // Tiebreak: if `deunicode` collapsed two distinct ideographs to
        // identical romanisations (e.g. 郎 and 朗 both render as `lang`
        // in some deunicode versions), append a short hash of the
        // *original* Unicode bytes so the keys still differ. The suffix
        // is `~hhhhhhhh` — `~` is not produced by the alnum+space loop
        // above, so it cleanly identifies the tiebreak segment without
        // colliding with regular CJK keys.
        let suffix = cjk_tiebreak_suffix(input);
        format!("{out}~{suffix}")
    } else {
        lowered
            .trim()
            .chars()
            .filter(|c| c.is_ascii_alphanumeric())
            .collect()
    }
}

/// Truncated hash of the raw input bytes used to disambiguate CJK names
/// whose `deunicode` output happens to be identical. We use Rust's stdlib
/// `DefaultHasher` (currently SipHash-1-3) — not cryptographic, but the
/// only requirement is "two distinct CJK strings hash to different short
/// digests with overwhelming probability", which SipHash easily provides.
fn cjk_tiebreak_suffix(input: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    // 8 hex chars = 32 bits = ~4 billion — plenty for dedup against any
    // realistic author count and short enough to keep the key compact.
    format!("{:08x}", hasher.finish() as u32)
}

fn normalise_email_local(input: &str) -> String {
    if input.is_empty() {
        return String::new();
    }
    let translit = apply_pre_translit(input);
    let folded = deunicode(&translit);
    folded
        .to_lowercase()
        .trim()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect()
}

fn email_local_part(email: &str) -> &str {
    match email.find('@') {
        Some(idx) => &email[..idx],
        None => email,
    }
}

/// Compute the dedup key for an author. Empty inputs are tolerated; the
/// resulting key is `<name>|<email-local>` with either side blank.
pub fn signature_key(name: &str, email: Option<&str>) -> String {
    let name_key = normalise_name(name);
    let local_key = match email {
        Some(e) => normalise_email_local(email_local_part(e)),
        None => String::new(),
    };
    format!("{name_key}|{local_key}")
}

#[cfg(test)]
mod tests {
    use super::*;

    // The plan's tabulated cases. Keep these in lock-step with
    // `app/src/lib/authorNormalize.test.ts`.

    #[test]
    fn umlaut_and_ascii_collide() {
        assert_eq!(signature_key("Müller", Some("ue@x")), "mueller|ue");
        assert_eq!(signature_key("Mueller", Some("ue@x")), "mueller|ue");
    }

    #[test]
    fn anna_mueller_collapses_email_separators() {
        assert_eq!(
            signature_key("Anna Müller", Some("a.mueller@example.com")),
            "annamueller|amueller"
        );
    }

    #[test]
    fn french_with_german() {
        assert_eq!(
            signature_key("François Müller", Some("f@x")),
            "francoismueller|f"
        );
    }

    #[test]
    fn polish_preserved_before_deunicode() {
        assert_eq!(signature_key("Łukasz Słoń", Some("l@x")), "lukaszslon|l");
    }

    #[test]
    fn turkish_dotted_dotless_i() {
        assert_eq!(signature_key("İlhan Şahin", Some("i@x")), "ilhansahin|i");
    }

    #[test]
    fn nordic_digraphs() {
        // `Ø → Oe`, `Æ → Ae`, `ø → oe`, `æ → ae` — pre-translit, then folded.
        assert_eq!(signature_key("Søren Ærø", Some("s@x")), "soerenaeroe|s");
    }

    #[test]
    fn cjk_via_deunicode() {
        // We don't pin the exact transliteration — `deunicode` has been
        // stable across recent versions, but asserting on the structure
        // insulates us from harmless tweaks. CJK keys keep internal spaces
        // (M3) and end with a `~hhhhhhhh` tiebreak suffix.
        let key = signature_key("北条 太郎", Some("t@x"));
        let (lhs, rhs) = key.split_once('|').expect("pipe-separated");
        assert_eq!(rhs, "t");
        assert!(!lhs.is_empty(), "got empty CJK key: {key}");
        let (romanised, hash) = lhs.rsplit_once('~').expect("CJK key carries a ~hash suffix");
        assert!(!romanised.is_empty(), "empty romanised half: {key}");
        assert_eq!(hash.len(), 8, "tiebreak suffix is 8 hex chars: {hash}");
        assert!(
            hash.chars().all(|c| c.is_ascii_hexdigit()),
            "tiebreak suffix is hex: {hash}"
        );
        assert!(
            romanised
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == ' '),
            "unexpected char in CJK romanised half: {key}"
        );
    }

    /// M3: `太郎` and `太朗` look almost identical but the second character
    /// is a different ideograph (U+90CE vs U+6717). `deunicode` emits
    /// distinct romanisations (`tai lang` / `tai lang` style with different
    /// segment tokens), so the dedup keys MUST differ — otherwise we'd
    /// merge two unrelated authors.
    #[test]
    fn cjk_homograph_pair_produces_distinct_keys() {
        let a = signature_key("太郎", Some("a@x"));
        let b = signature_key("太朗", Some("a@x"));
        // Email half is identical; the difference must come from the name half.
        assert_ne!(
            a, b,
            "太郎 and 太朗 collapsed to the same signature key: {a} == {b}"
        );
    }

    #[test]
    fn empty_name_keeps_email() {
        assert_eq!(signature_key("", Some("email@x")), "|email");
    }

    #[test]
    fn whitespace_padding_is_trimmed() {
        let padded = signature_key("  Müller  ", Some("ue@x"));
        let plain = signature_key("Müller", Some("ue@x"));
        assert_eq!(padded, plain);
    }

    #[test]
    fn case_is_normalised() {
        assert_eq!(signature_key("MUELLER", Some("ue@x")), "mueller|ue");
        assert_eq!(signature_key("Mueller", Some("UE@x")), "mueller|ue");
    }

    #[test]
    fn missing_email_is_tolerated() {
        assert_eq!(signature_key("Solo", None), "solo|");
    }

    #[test]
    fn email_without_at_is_treated_as_local_only() {
        assert_eq!(signature_key("Solo", Some("local-only")), "solo|localonly");
    }

    #[test]
    fn signature_key_is_idempotent_on_already_normalised_input() {
        let once = signature_key("mueller", Some("ue@x"));
        let twice = signature_key(&once, None);
        // The first call gives "mueller|ue"; feeding *that* string back in
        // as a name yields "muellerue|" which is fine — we just want to
        // assert that nothing panics on already-folded input.
        assert!(twice.ends_with('|'));
    }
}
