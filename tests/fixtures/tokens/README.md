# Tokens fixture

Cross-language pinning point for the Plan-8 E2E harness:

- The TS `injectTokens()` helper (`tests/src/helpers/tokenInjection.ts`) writes a `dev-tokens.json` with this exact shape.
- The Rust `auth::token::FileBackend` reads it as `BTreeMap<String, String>`.

If either side ever needs a field beyond the raw token (username, scope, expiry), update both sides together and bump the fixture so this file remains the canonical schema sample.

The bogus token values here are pattern-shaped but invalid — they exist so the mock servers can match on shape without anyone tempted to use them against the real APIs.
