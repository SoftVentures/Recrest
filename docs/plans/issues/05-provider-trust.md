# Phase 3 — Provider-Vertrauen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recrest sagt nie wieder „connected" wenn es nicht _tatsächlich_ connected ist. Provider-Saves führen einen echten API-Verify-Call durch, der bei Müll-URLs/Tokens scheitert; UI zeigt klare Fehlermeldungen und unterscheidet DNS / TLS / 401 / Body-Mismatch.

**Architecture:** Backend bekommt einen unifizierten `provider::verify_credentials`-Pfad pro Provider, mit strukturierten Fehler-Kinds. Frontend konsolidiert Provider-Karten zu _einer_ Save-Aktion pro Karte, ergänzt „Back to default"-Aktion und nutzt `PatHelpPanel` aus Phase 2. Domain-Normalisierung + Schema-Probing als geteiltes Util.

**Tech Stack:** Rust + reqwest, React + Redux, MUI v9.

---

## File Structure

- Create: `app/src-tauri/src/providers/verify.rs` — unifiziertes Verify
- Modify: `app/src-tauri/src/providers/github.rs`, `gitlab.rs`, `bitbucket.rs` — Verify-Implementation pro Provider
- Modify: `app/src-tauri/src/commands/provider.rs` — `verify_credentials`-Command
- Modify: `app/src-tauri/src/commands/error.rs` — neuer Error-Kind `ProviderVerifyError` mit Sub-Kinds
- Create: `app/src/lib/utils/url.utils.ts` — `normalizeProviderBaseUrl`
- Modify: `app/src/components/organisms/providers/ProviderCard/index.tsx` (oder analog) — Single-Save-Form, Back-to-Default, PatHelpPanel
- Modify: `app/src/store/actions/providersActions.ts` — Save-Thunk ruft Verify-Command, „connected"-State nur bei Success
- Modify: `app/src/locales/{de,en}/settings.json` — neue Error-Strings

---

## Task 1: Strukturierte Verify-Errors im Backend

**Files:**

- Modify: `app/src-tauri/src/commands/error.rs`

- [ ] **Step 1: Neuer Error-Kind**

```rust
#[derive(Serialize, Debug, Clone)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum ProviderVerifyError {
    NetworkUnreachable { message: String },
    TlsError { message: String },
    Unauthorized,
    Forbidden { message: String },
    ServerError { status: u16 },
    NotProviderResponse { hint: String },
    Unknown { message: String },
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src-tauri/src/commands/error.rs
git commit -m "feat(provider): structured verify-error kinds"
```

---

## Task 2: Per-Provider Verify-Implementierungen

**Files:**

- Modify: `app/src-tauri/src/providers/github.rs`, `gitlab.rs`, `bitbucket.rs`
- Create: `app/src-tauri/src/providers/verify.rs`

- [ ] **Step 1: GitHub Verify**

```rust
// providers/github.rs
pub async fn verify(token: &str) -> Result<VerifiedAccount, ProviderVerifyError> {
    let resp = client().get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {token}"))
        .header("User-Agent", "Recrest")
        .send().await.map_err(map_reqwest_err)?;
    match resp.status().as_u16() {
        200 => {
            let json: serde_json::Value = resp.json().await.map_err(|e| ProviderVerifyError::Unknown { message: e.to_string() })?;
            let login = json.get("login").and_then(|v| v.as_str()).ok_or(ProviderVerifyError::NotProviderResponse { hint: "missing login field".into() })?;
            Ok(VerifiedAccount { login: login.into() })
        }
        401 => Err(ProviderVerifyError::Unauthorized),
        403 => Err(ProviderVerifyError::Forbidden { message: "token lacks scope".into() }),
        s @ 500..=599 => Err(ProviderVerifyError::ServerError { status: s }),
        s => Err(ProviderVerifyError::Unknown { message: format!("unexpected status {s}") }),
    }
}
```

- [ ] **Step 2: GitLab Verify**

```rust
pub async fn verify(base_url: &str, token: &str) -> Result<VerifiedAccount, ProviderVerifyError> {
    let url = format!("{}/api/v4/user", base_url.trim_end_matches('/'));
    let resp = client().get(&url).header("PRIVATE-TOKEN", token).send().await.map_err(map_reqwest_err)?;
    match resp.status().as_u16() {
        200 => {
            let txt = resp.text().await.unwrap_or_default();
            let json: serde_json::Value = serde_json::from_str(&txt).map_err(|_| ProviderVerifyError::NotProviderResponse { hint: "not JSON".into() })?;
            let username = json.get("username").and_then(|v| v.as_str()).ok_or(ProviderVerifyError::NotProviderResponse { hint: "no username field — looks like base URL doesn't point to GitLab".into() })?;
            Ok(VerifiedAccount { login: username.into() })
        }
        401 => Err(ProviderVerifyError::Unauthorized),
        403 => Err(ProviderVerifyError::Forbidden { message: "token lacks read_api scope".into() }),
        s @ 500..=599 => Err(ProviderVerifyError::ServerError { status: s }),
        s => Err(ProviderVerifyError::Unknown { message: format!("unexpected status {s}") }),
    }
}
```

- [ ] **Step 3: Bitbucket Verify (Basic Auth)**

```rust
pub async fn verify(username: &str, app_password: &str) -> Result<VerifiedAccount, ProviderVerifyError> {
    let resp = client().get("https://api.bitbucket.org/2.0/user")
        .basic_auth(username, Some(app_password))
        .send().await.map_err(map_reqwest_err)?;
    // analog zu GitHub: 200 → JSON parsen mit `username`-Feld, sonst strukturierte Fehler
    // [vollständig analog implementieren wie GitHub/GitLab oben]
}
```

- [ ] **Step 4: Geteilter `map_reqwest_err`**

```rust
// providers/verify.rs
pub fn map_reqwest_err(e: reqwest::Error) -> ProviderVerifyError {
    if e.is_connect() || e.is_request() {
        return ProviderVerifyError::NetworkUnreachable { message: e.to_string() };
    }
    let s = e.to_string();
    if s.contains("certificate") || s.contains("TLS") {
        return ProviderVerifyError::TlsError { message: s };
    }
    ProviderVerifyError::Unknown { message: s }
}

pub struct VerifiedAccount { pub login: String }
```

- [ ] **Step 5: Tests pro Provider mit Mock-HTTP**

`mockito` oder `wiremock` Crate hinzufügen für HTTP-Mocking. Beispiel:

```rust
#[tokio::test]
async fn github_verify_returns_unauthorized_on_401() {
    let mock = mockito::Server::new_async().await;
    let _m = mock.mock("GET", "/user").with_status(401).create_async().await;
    // [Test setzt url-base auf mock.url() via Injection — Refactor verify() so dass URL injizierbar ist]
    let result = verify_with_base(&mock.url(), "bad-token").await;
    assert!(matches!(result, Err(ProviderVerifyError::Unauthorized)));
}
```

- [ ] **Step 6: Commit**

```bash
git add app/src-tauri
git commit -m "feat(provider): real verify-call per provider with structured errors"
```

---

## Task 3: `verify_credentials`-Tauri-Command

**Files:**

- Modify: `app/src-tauri/src/commands/provider.rs`
- Modify: `app/src-tauri/src/lib.rs`

- [ ] **Step 1: Command schreiben**

```rust
#[tauri::command]
pub async fn verify_credentials(
    provider: String,
    base_url: Option<String>,
    token: String,
    username: Option<String>, // nur für Bitbucket relevant
) -> Result<VerifiedAccount, ProviderVerifyError> {
    match provider.as_str() {
        "github" => github::verify(&token).await,
        "gitlab" => gitlab::verify(base_url.as_deref().unwrap_or("https://gitlab.com"), &token).await,
        "bitbucket" => bitbucket::verify(username.as_deref().unwrap_or(""), &token).await,
        _ => Err(ProviderVerifyError::Unknown { message: format!("unknown provider {provider}") }),
    }
}
```

In `lib.rs::generate_handler![...]` registrieren.

- [ ] **Step 2: Commit**

```bash
git add app/src-tauri
git commit -m "feat(provider): verify_credentials tauri command"
```

---

## Task 4: Frontend-Util `normalizeProviderBaseUrl`

**Files:**

- Create: `app/src/lib/utils/url.utils.ts`
- Create: `app/src/lib/utils/url.utils.test.ts`

- [ ] **Step 1: Tests schreiben**

```ts
import { describe, expect, it } from "vitest";

import { normalizeProviderBaseUrl } from "./url.utils";

describe("normalizeProviderBaseUrl", () => {
  it("ergänzt https:// wenn kein Schema", () => {
    expect(normalizeProviderBaseUrl("gitlab.example.com")).toBe("https://gitlab.example.com");
  });
  it("strippt trailing slash", () => {
    expect(normalizeProviderBaseUrl("https://gitlab.example.com/")).toBe(
      "https://gitlab.example.com",
    );
  });
  it("akzeptiert http:// explizit", () => {
    expect(normalizeProviderBaseUrl("http://internal-gitlab")).toBe("http://internal-gitlab");
  });
  it("trim whitespace", () => {
    expect(normalizeProviderBaseUrl("  gitlab.com  ")).toBe("https://gitlab.com");
  });
});
```

- [ ] **Step 2: Implementation**

```ts
export function normalizeProviderBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/$/, "");
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
```

- [ ] **Step 3: Tests grün**

Run: `yarn workspace @recrest/app test url.utils`

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/utils/url.utils.ts app/src/lib/utils/url.utils.test.ts
git commit -m "feat(utils): normalizeProviderBaseUrl"
```

---

## Task 5: Provider-Save-Thunk ruft Verify, „connected" nur bei Success

**Files:**

- Modify: `app/src/store/actions/providersActions.ts`

- [ ] **Step 1: Save-Thunk neu schreiben**

```ts
export const saveProviderCredentials = createAsyncThunk(
  "providers/save",
  async (
    input: { provider: ProviderKey; baseUrl?: string; token: string; username?: string },
    thunkApi,
  ) => {
    const baseUrl = input.baseUrl ? normalizeProviderBaseUrl(input.baseUrl) : undefined;
    const verified = await invoke<VerifiedAccount>("verify_credentials", {
      provider: input.provider,
      baseUrl,
      token: input.token,
      username: input.username,
    }).catch((err: ProviderVerifyError) => {
      throw err;
    });
    // Erst nach Success: persistieren
    await invoke("save_provider_credentials", {
      provider: input.provider,
      baseUrl,
      token: input.token,
      username: input.username,
    });
    return { provider: input.provider, account: verified, baseUrl };
  },
);
```

- [ ] **Step 2: Reducer setzt `connected = true` nur bei `fulfilled`**

Vorher prüfen ob `connected`-State bereits aus dem Thunk-Result kommt. Falls woanders gesetzt (z.B. nur bei Token-Save-Persist), korrigieren.

- [ ] **Step 3: Tests**

Run: `yarn workspace @recrest/app test providersActions`

- [ ] **Step 4: Commit**

```bash
git add app/src/store
git commit -m "fix(providers): connected only when verify_credentials actually succeeds"
```

---

## Task 6: Provider-Karte: Single-Save-Form + Verify-Button + Back-to-Default

**Files:**

- Modify: `app/src/components/organisms/providers/ProviderCard/index.tsx` (oder Ort der Provider-Settings-Karten)
- Modify: `app/src/locales/{de,en}/settings.json`

- [ ] **Step 1: Eine Form pro Provider, ein Save**

Statt zwei Speicherbuttons je Feld eine konsolidierte Form mit:

- Base-URL-Feld (für GitLab self-hosted) + „Auf Standard zurücksetzen"-Link wenn nicht Default
- Token-Feld
- (für Bitbucket: Username-Feld)
- Ein „Speichern"-Button rechts unten
- Ein „Verbindung prüfen"-Button daneben (löst denselben Verify aus, aber speichert nicht)
- Inline-Status: Loading-Spinner während Verify, dann Erfolg / Fehler mit klarer Message

Den `PatHelpPanel` aus Phase 2 oben in der Karte einbetten.

- [ ] **Step 2: Error-Mapping**

```tsx
function errorMessage(err: ProviderVerifyError, t: TFunction): string {
  switch (err.kind) {
    case "network-unreachable":
      return t("provider.error.network", { detail: err.message });
    case "tls-error":
      return t("provider.error.tls");
    case "unauthorized":
      return t("provider.error.unauthorized");
    case "forbidden":
      return t("provider.error.forbidden", { detail: err.message });
    case "server-error":
      return t("provider.error.server", { status: err.status });
    case "not-provider-response":
      return t("provider.error.not_provider", { hint: err.hint });
    default:
      return t("provider.error.unknown", { detail: err.message });
  }
}
```

Strings in beiden Locales ergänzen.

- [ ] **Step 3: „Back to default"-Aktion**

Bei GitLab: wenn `baseUrl !== "https://gitlab.com"`, neben dem Feld erscheint ein dezenter Link/Button „Auf Standard zurücksetzen", der das Feld auf `https://gitlab.com` setzt und Save+Verify auslöst.

- [ ] **Step 4: Test mit Mock-Verify**

```tsx
it("zeigt 'Antwort sieht nicht nach GitLab aus' bei not-provider-response", async () => {
  vi.mocked(invoke).mockRejectedValueOnce({
    kind: "not-provider-response",
    hint: "no username field",
  });
  // [render Card + click Verify + expect error text]
});
```

- [ ] **Step 5: Visual-Check mit Playwright**

`www.hurensohn.de` + Token `1234` → klare Fehlermeldung erwartbar, kein „connected"-State.

- [ ] **Step 6: Commit**

```bash
git add app/src
git commit -m "fix(providers): single save form, real verify, structured error UI, back-to-default"
```

---

## Task 7: GitLab-Card official/self-hosted-Switch (Settings-Variante)

**Files:**

- Modify: `ProviderCard`-Component für GitLab

- [ ] **Step 1: Toggle einfügen**

```tsx
<RadioGroup value={variant} onChange={...}>
  <FormControlLabel value="cloud" control={<Radio />} label={t("gitlab.cloud")} />
  <FormControlLabel value="self" control={<Radio />} label={t("gitlab.self_hosted")} />
</RadioGroup>
```

- [ ] **Step 2: Domain-Feld nur bei self**

Layout-Fix für die „schiefe" Anordnung: Form-Felder in einem `Stack` mit konsistentem Gap, kein wildes Padding.

- [ ] **Step 3: Commit**

```bash
git add app/src
git commit -m "feat(providers): GitLab official/self-hosted toggle in settings card"
```

---

## Task 8: Clone- und „Auf Host öffnen"-Fehler besser surfacen

**Files:**

- Modify: existierende Clone-Aktion (`commands::clone.rs` + dazugehörige UI)
- Modify: „Auf Host öffnen" UI-Komponente (vor Phase 6, dort detaillierter)

- [ ] **Step 1: Clone-Fehler in Toast statt stummem Fail**

Wo Clone-Errors heute geschluckt werden: Toast-Notification ergänzen (Memory: `feedback_destructive_action_parity` ist hier nicht relevant; aber Error-Surfacing ist UX-Standard).

- [ ] **Step 2: Commit**

```bash
git add app/src
git commit -m "fix(providers): surface clone and host-open errors as user-visible toasts"
```

---

## Verification

- [ ] `yarn test:ts && yarn workspace @recrest/app test`
- [ ] Backend-Unit-Tests: `cd app/src-tauri && cargo test`
- [ ] **Manueller End-to-End-Test**:
  - GitHub: gültiger PAT → connected, ungültiger PAT → klare „Unauthorized"-Fehlermeldung
  - GitLab.com: gültiger PAT → connected
  - GitLab self-hosted mit echter Instanz: connected
  - GitLab mit Müll-URL `www.hurensohn.de` → Fehler „Antwort sieht nicht nach GitLab aus"
  - GitLab mit nicht-existenter Domain `gitlab.nope.test` → „Host nicht erreichbar"
  - Bitbucket: gültiges App-Password → connected
- [ ] „Back to default" auf GitLab-Card funktioniert
- [ ] Eine Save-Aktion pro Karte, nicht zwei
