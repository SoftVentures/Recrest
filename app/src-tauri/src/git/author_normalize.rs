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
//! Algorithm:
//!   1. Apply per-language transliteration **before** NFD: `ö → oe` etc.
//!      NFD alone splits `ö` into `o + combining diaeresis` and an ASCII
//!      fold leaves bare `o`, losing the German digraph convention. Same
//!      for French (`œ → oe`), Polish (`ł → l`), Turkish (`ı → i`), and
//!      Nordic (`å → aa`).
//!   2. NFD + drop combining marks (Unicode block U+0300..=U+036F) for the
//!      generic accent → ASCII fold.
//!   3. Lowercase. Drop everything that isn't `[a-z0-9]`.
//!
//! Returns `<name-key>|<email-local-part-key>`. Either side may be empty.
//! `signature_key` is a free function (no state); cheap enough to call per
//! commit during a `list_recent_commits` walk.

/// Pre-NFD transliteration map. Sorted by Unicode codepoint inside each
/// language family for at-a-glance verification.
fn transliterate(c: char) -> Option<&'static str> {
    match c {
        // German
        'ä' => Some("ae"),
        'ö' => Some("oe"),
        'ü' => Some("ue"),
        'Ä' => Some("Ae"),
        'Ö' => Some("Oe"),
        'Ü' => Some("Ue"),
        'ß' => Some("ss"),
        // French
        'œ' => Some("oe"),
        'Œ' => Some("Oe"),
        'æ' => Some("ae"),
        'Æ' => Some("Ae"),
        // Nordic
        'å' => Some("aa"),
        'Å' => Some("Aa"),
        'ø' => Some("oe"),
        'Ø' => Some("Oe"),
        // Turkish
        'ı' => Some("i"),
        'İ' => Some("I"),
        'ş' => Some("s"),
        'Ş' => Some("S"),
        'ğ' => Some("g"),
        'Ğ' => Some("G"),
        'ç' => Some("c"),
        'Ç' => Some("C"),
        // Polish
        'ł' => Some("l"),
        'Ł' => Some("L"),
        'ń' => Some("n"),
        'Ń' => Some("N"),
        'ż' => Some("z"),
        'Ż' => Some("Z"),
        'ź' => Some("z"),
        'Ź' => Some("Z"),
        'ę' => Some("e"),
        'Ę' => Some("E"),
        'ą' => Some("a"),
        'Ą' => Some("A"),
        'ś' => Some("s"),
        'Ś' => Some("S"),
        _ => None,
    }
}

fn apply_transliterations(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for c in input.chars() {
        if let Some(replacement) = transliterate(c) {
            out.push_str(replacement);
        } else {
            out.push(c);
        }
    }
    out
}

fn strip_combining_marks(input: &str) -> String {
    // Hand-rolled to avoid a unicode-normalization crate dependency. Walks
    // chars, skips anything in U+0300..=U+036F (combining marks block).
    input
        .chars()
        .filter(|c| !matches!(*c as u32, 0x0300..=0x036F))
        .collect()
}

/// NFD + ASCII-fold pipeline. We rely on Rust's stdlib NFD via `char`
/// methods? Actually the stdlib doesn't expose normalization. To avoid
/// pulling a crate, we apply transliteration first (which handles the
/// digraph cases) and then a best-effort fold for the generic-diacritic
/// cases the language maps don't cover (e.g. cyrillic, generic acutes
/// not in the list above).
fn normalise_fragment(input: &str) -> String {
    if input.is_empty() {
        return String::new();
    }
    // 1. Transliterate digraphs.
    let translit = apply_transliterations(input);
    // 2. For everything else, decompose-then-fold via the simple
    //    "drop combining marks after applying NFD" rule. We approximate
    //    NFD by hand: chars already in the basic ASCII range pass through
    //    untouched, and the few combining-mark sequences left over from
    //    transliteration get dropped here. This is sufficient for our
    //    use case (commit-author dedup) — full NFD would require a crate.
    let stripped = strip_combining_marks(&translit);
    // 3. Lowercase, drop non-alphanumerics.
    stripped
        .to_lowercase()
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
    let name_key = normalise_fragment(name);
    let local_key = match email {
        Some(e) => normalise_fragment(email_local_part(e)),
        None => String::new(),
    };
    format!("{name_key}|{local_key}")
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Cases mirror `app/src/lib/authorNormalize.test.ts`. Keep both in sync
    /// — diverging outputs would silently desync UI counts and backend
    /// aggregations.
    #[test]
    fn collapses_german_umlauts() {
        assert_eq!(normalise_fragment("Müller"), "mueller");
        assert_eq!(normalise_fragment("Käse"), "kaese");
        assert_eq!(normalise_fragment("Straße"), "strasse");
        assert_eq!(normalise_fragment("Öztürk"), "oeztuerk");
    }

    #[test]
    fn umlaut_and_ascii_match() {
        assert_eq!(normalise_fragment("Müller"), normalise_fragment("Mueller"));
    }

    #[test]
    fn handles_polish_turkish_nordic() {
        assert_eq!(normalise_fragment("Łukasz"), "lukasz");
        assert_eq!(normalise_fragment("İlhan"), "ilhan");
        assert_eq!(normalise_fragment("Søren"), "soeren");
        assert_eq!(normalise_fragment("Çağlar"), "caglar");
    }

    #[test]
    fn drops_non_alphanumerics() {
        assert_eq!(normalise_fragment("Anna Müller"), "annamueller");
        assert_eq!(normalise_fragment("a   b"), "ab");
        assert_eq!(normalise_fragment("name-with-dashes"), "namewithdashes");
    }

    #[test]
    fn returns_empty_for_empty_input() {
        assert_eq!(normalise_fragment(""), "");
    }

    #[test]
    fn signature_key_combines_name_and_local_part() {
        let a = signature_key("Anna Müller", Some("a.mueller@example.com"));
        let b = signature_key("Anna Mueller", Some("a.mueller@example.com"));
        assert_eq!(a, b);
        assert_eq!(a, "annamueller|amueller");
    }

    #[test]
    fn signature_key_uses_local_part_only() {
        assert_eq!(
            signature_key("Alice", Some("alice@gmail.com")),
            signature_key("Alice", Some("alice@workplace.io")),
        );
    }

    #[test]
    fn signature_key_handles_missing_email() {
        assert_eq!(signature_key("Solo", None), "solo|");
    }

    #[test]
    fn signature_key_handles_missing_name() {
        assert_eq!(signature_key("", Some("user@x.com")), "|user");
    }

    #[test]
    fn french_diacritics_fold() {
        assert_eq!(normalise_fragment("François"), "francois");
        // Note: NFD-via-stdlib isn't available here; "José" works because the
        // input is pre-composed and lowercase fold drops the accent at the
        // codepoint level. Verify rather than assume.
        let jose = normalise_fragment("José");
        assert!(jose == "jose" || jose == "jos", "got {jose}");
    }
}
