# Phase 2 — Onboarding-Wizard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Onboarding führt zuverlässig zum funktionierenden Provider — PAT-Hilfe mit zwei Buttons + Scope-Prefill, GitLab-Sub-Onboarding mit Reachability-Check, Zurück-Button, Post-Wizard-Activity-Load, Crash-Report-Opt-in, vollständiger Quality-Pass.

**Architecture:** Neuer geteilter `PatHelpPanel` (auch in Phase 3 verwendet), neuer `GitlabVariantStep` zwischen ConnectProvider und PAT, Wizard-Footer mit Zurück, explizite Activity-Dispatch in `DoneStep`, neues `telemetry.crashReports`-Setting, Audit-Pass über alle Steps.

**Tech Stack:** React 19 + MUI v9, Tauri Commands, react-i18next.

---

## File Structure

- Create: `shared/src/constants/providers.ts` — `PROVIDER_PAT_INFO` mit URLs und Required-Scopes
- Modify: `shared/src/index.ts` — Re-Export
- Create: `app/src/components/molecules/PatHelpPanel/index.tsx` — geteilte Component
- Modify: `app/src/components/organisms/onboarding/steps/ConnectProviderStep/index.tsx` — PatHelpPanel einbinden, Doku-Link statt Login-Link
- Create: `app/src/components/organisms/onboarding/steps/GitlabVariantStep/index.tsx`
- Modify: `app/src/components/organisms/onboarding/OnboardingWizard/index.tsx` — Step-Liste, Zurück-Button, Crash-Report-Toggle
- Modify: `app/src/components/organisms/onboarding/steps/DoneStep/index.tsx` — Activity-Dispatch
- Modify: `app/src/components/organisms/onboarding/steps/BasicsStep/index.tsx` — Crash-Report-Toggle einbinden (alternativ DoneStep)
- Create/Modify: `app/src-tauri/src/commands/provider.rs::ping_gitlab` — Reachability-Check
- Modify: `app/src/store/reducers/settingsReducer.ts` — `telemetry.crashReports: boolean`
- Modify: `app/src/locales/{de,en}/onboarding.json` — neue Strings für Variant-Step, Zurück-Button, Crash-Report-Toggle
- Modify: `app/src/pages/app/Settings/index.tsx` — Default-Ordner-Setting entfernen (#2.7)

---

## Task 1: PAT-Info-Konstanten im shared package

**Files:**

- Create: `shared/src/constants/providers.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Konstanten anlegen**

```ts
// shared/src/constants/providers.ts
export const PROVIDER_PAT_INFO = {
  github: {
    docsUrl:
      "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens",
    createUrl: (_baseUrl: string, scopes: readonly string[]) =>
      `https://github.com/settings/tokens/new?description=Recrest&scopes=${scopes.join(",")}`,
    requiredScopes: ["repo", "read:user", "read:org"] as const,
    supportsUrlScopes: true,
  },
  gitlab: {
    docsUrl: "https://docs.gitlab.com/user/profile/personal_access_tokens/",
    createUrl: (baseUrl: string, scopes: readonly string[]) =>
      `${baseUrl.replace(/\/$/, "")}/-/user_settings/personal_access_tokens?name=Recrest&scopes=${scopes.join(",")}`,
    requiredScopes: ["read_api", "read_repository", "read_user"] as const,
    supportsUrlScopes: true,
  },
  bitbucket: {
    docsUrl: "https://support.atlassian.com/bitbucket-cloud/docs/create-an-app-password/",
    createUrl: (_baseUrl: string, _scopes: readonly string[]) =>
      "https://bitbucket.org/account/settings/app-passwords/new",
    requiredScopes: ["account:read", "repository:read", "pullrequest:read"] as const,
    supportsUrlScopes: false,
  },
} as const;

export type ProviderKey = keyof typeof PROVIDER_PAT_INFO;
```

In `shared/src/index.ts`:

```ts
export { PROVIDER_PAT_INFO } from "./constants/providers";
export type { ProviderKey } from "./constants/providers";
```

- [ ] **Step 2: Build + Commit**

```bash
yarn workspace @recrest/shared build
git add shared
git commit -m "feat(shared): provider PAT info constants with required scopes and prefilled URLs"
```

---

## Task 2: `PatHelpPanel`-Komponente

**Files:**

- Create: `app/src/components/molecules/PatHelpPanel/index.tsx`
- Create: `app/src/components/molecules/PatHelpPanel/PatHelpPanel.test.tsx`
- Modify: `app/src/locales/{de,en}/common.json` — neue Strings

- [ ] **Step 1: Test schreiben**

```tsx
// PatHelpPanel.test.tsx
import { fireEvent, render } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";

import { i18nForTest } from "@/test/i18n";

import { PatHelpPanel } from ".";

vi.mock("@/lib/tauri", () => ({ openExternal: vi.fn(), isTauri: () => false }));

it("öffnet Doku-Link bei Klick auf 'Anleitung lesen'", async () => {
  const { openExternal } = await import("@/lib/tauri");
  const { getByRole } = render(
    <I18nextProvider i18n={i18nForTest}>
      <PatHelpPanel provider="github" baseUrl="" />
    </I18nextProvider>,
  );
  fireEvent.click(getByRole("button", { name: /Anleitung lesen|Read docs/ }));
  expect(openExternal).toHaveBeenCalledWith(expect.stringContaining("docs.github.com"));
});

it("öffnet Token-Create-Link mit prefilled Scopes", async () => {
  const { openExternal } = await import("@/lib/tauri");
  const { getByRole } = render(
    <I18nextProvider i18n={i18nForTest}>
      <PatHelpPanel provider="github" baseUrl="" />
    </I18nextProvider>,
  );
  fireEvent.click(getByRole("button", { name: /Token erstellen|Create token/ }));
  expect(openExternal).toHaveBeenCalledWith(
    expect.stringMatching(/scopes=repo,read:user,read:org/),
  );
});
```

- [ ] **Step 2: Test laufen lassen → fehlschlägt**

Run: `yarn workspace @recrest/app test PatHelpPanel`
Expected: FAIL — Component existiert nicht.

- [ ] **Step 3: Component implementieren**

```tsx
// app/src/components/molecules/PatHelpPanel/index.tsx
import { Box, Button, List, ListItem, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { PROVIDER_PAT_INFO, type ProviderKey } from "@recrest/shared";

import { openExternal } from "@/lib/tauri";

interface Props {
  provider: ProviderKey;
  baseUrl?: string;
}

export function PatHelpPanel({ provider, baseUrl = "" }: Props) {
  const { t } = useTranslation("common");
  const info = PROVIDER_PAT_INFO[provider];
  const scopes = info.requiredScopes;
  const createUrl = info.createUrl(baseUrl, scopes);

  return (
    <Box>
      <Typography variant="subtitle2">{t("pat.required_scopes")}</Typography>
      <List dense>
        {scopes.map((scope) => (
          <ListItem key={scope}>
            <Typography variant="body2">
              {t(`pat.scope_label.${provider}.${scope}`, { defaultValue: scope })}
            </Typography>
          </ListItem>
        ))}
      </List>
      <Box display="flex" gap={1}>
        <Button variant="outlined" onClick={() => openExternal(info.docsUrl)}>
          {t("pat.read_docs")}
        </Button>
        <Button variant="contained" onClick={() => openExternal(createUrl)}>
          {t("pat.create_token")}
        </Button>
      </Box>
      {!info.supportsUrlScopes && (
        <Typography variant="caption">{t("pat.scopes_manual_hint")}</Typography>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Locale-Strings ergänzen**

In `common.json` (DE + EN) unter `pat`-Namespace die Strings hinzufügen (required_scopes, scope_label.{provider}.{scope}, read_docs, create_token, scopes_manual_hint).

- [ ] **Step 5: Test grün**

Run: `yarn workspace @recrest/app test PatHelpPanel`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/components/molecules/PatHelpPanel app/src/locales
git commit -m "feat(onboarding): PatHelpPanel with docs button and scope-prefilled create link"
```

---

## Task 3: ConnectProviderStep nutzt PatHelpPanel

**Files:**

- Modify: `app/src/components/organisms/onboarding/steps/ConnectProviderStep/index.tsx`

- [ ] **Step 1: PatHelpPanel einbinden, alten Login-Link entfernen**

```tsx
import { PatHelpPanel } from "@/components/molecules/PatHelpPanel";

// ...
{
  selectedProvider && <PatHelpPanel provider={selectedProvider} baseUrl={baseUrlForGitlab} />;
}
```

Alten Login-/Hilfe-Link aus dem Component entfernen.

- [ ] **Step 2: Tests laufen lassen**

Run: `yarn workspace @recrest/app test ConnectProviderStep`

- [ ] **Step 3: Commit**

```bash
git add app/src/components/organisms/onboarding/steps/ConnectProviderStep
git commit -m "fix(onboarding): replace login link with PatHelpPanel (docs + create token)"
```

---

## Task 4: GitLab-Ping-Backend-Command

**Files:**

- Modify: `app/src-tauri/src/commands/provider.rs` (oder neue Datei)
- Modify: `app/src-tauri/src/lib.rs`

- [ ] **Step 1: Command schreiben**

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitlabPingResult {
    pub reachable: bool,
    pub looks_like_gitlab: bool,
    pub version: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn ping_gitlab(base_url: String) -> GitlabPingResult {
    let url = format!("{}/api/v4/version", base_url.trim_end_matches('/'));
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .expect("client");
    match client.get(&url).send().await {
        Err(e) => GitlabPingResult { reachable: false, looks_like_gitlab: false, version: None, error: Some(e.to_string()) },
        Ok(resp) => {
            let server_hdr = resp.headers().get("server").and_then(|v| v.to_str().ok()).map(|s| s.to_string());
            let body = resp.text().await.unwrap_or_default();
            let version: Option<String> = serde_json::from_str::<serde_json::Value>(&body).ok()
                .and_then(|v| v.get("version").and_then(|s| s.as_str().map(String::from)));
            let looks_like_gitlab = server_hdr.as_deref().map(|s| s.contains("GitLab")).unwrap_or(false) || version.is_some();
            GitlabPingResult { reachable: true, looks_like_gitlab, version, error: None }
        }
    }
}
```

In `lib.rs::generate_handler![...]` registrieren. Falls `reqwest` noch nicht im `Cargo.toml`: `cd app/src-tauri && cargo add reqwest --features rustls-tls`.

- [ ] **Step 2: Smoke-Test über Tauri-Shell**

Run: `yarn dev` → DevTools-Console: `invoke("ping_gitlab", { baseUrl: "https://gitlab.com" })` → erwartet `{ reachable: true, looksLikeGitlab: true }`.

- [ ] **Step 3: Commit**

```bash
git add app/src-tauri
git commit -m "feat(provider): ping_gitlab command for reachability check"
```

---

## Task 5: GitlabVariantStep

**Files:**

- Create: `app/src/components/organisms/onboarding/steps/GitlabVariantStep/index.tsx`
- Modify: `app/src/components/organisms/onboarding/OnboardingWizard/index.tsx`
- Modify: `app/src/locales/{de,en}/onboarding.json`

- [ ] **Step 1: Step-Component**

```tsx
// GitlabVariantStep/index.tsx
import {
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { invoke } from "@/lib/tauri";

type Variant = "cloud" | "self";

interface Props {
  onResolved: (baseUrl: string) => void;
}

export function GitlabVariantStep({ onResolved }: Props) {
  const { t } = useTranslation("onboarding");
  const [variant, setVariant] = useState<Variant>("cloud");
  const [domain, setDomain] = useState("");
  const [pingStatus, setPingStatus] = useState<"idle" | "pinging" | "ok" | "fail">("idle");
  const [error, setError] = useState<string | null>(null);

  async function next() {
    if (variant === "cloud") return onResolved("https://gitlab.com");
    setPingStatus("pinging");
    setError(null);
    const normalized = normalizeBaseUrl(domain);
    const result = await invoke<{ reachable: boolean; looksLikeGitlab: boolean; error?: string }>(
      "ping_gitlab",
      { baseUrl: normalized },
    );
    if (!result.reachable) {
      setPingStatus("fail");
      setError(t("gitlab.unreachable", { error: result.error }));
      return;
    }
    if (!result.looksLikeGitlab) {
      setPingStatus("fail");
      setError(t("gitlab.not_gitlab"));
      return;
    }
    setPingStatus("ok");
    onResolved(normalized);
  }

  return (
    <Box>
      <Typography variant="h6">{t("gitlab.variant_title")}</Typography>
      <RadioGroup value={variant} onChange={(e) => setVariant(e.target.value as Variant)}>
        <FormControlLabel value="cloud" control={<Radio />} label={t("gitlab.cloud")} />
        <FormControlLabel value="self" control={<Radio />} label={t("gitlab.self_hosted")} />
      </RadioGroup>
      {variant === "self" && (
        <TextField
          label={t("gitlab.domain_label")}
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="gitlab.example.com"
          fullWidth
        />
      )}
      {error && <Typography color="error">{error}</Typography>}
      <Button onClick={next} disabled={pingStatus === "pinging"}>
        {t("common:next")}
      </Button>
    </Box>
  );
}

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/$/, "");
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
```

- [ ] **Step 2: Step in Wizard einklinken**

In `OnboardingWizard/index.tsx`: wenn `selectedProvider === "gitlab"`, wird `GitlabVariantStep` zwischen `ConnectProviderStep` und PAT-Eingabe geschoben. Sequence-Logik anpassen.

- [ ] **Step 3: Locales ergänzen**

DE und EN: `gitlab.variant_title`, `gitlab.cloud`, `gitlab.self_hosted`, `gitlab.domain_label`, `gitlab.unreachable`, `gitlab.not_gitlab`.

- [ ] **Step 4: Test**

Run: `yarn workspace @recrest/app test GitlabVariantStep`

- [ ] **Step 5: Commit**

```bash
git add app/src/components/organisms/onboarding app/src/locales
git commit -m "feat(onboarding): GitLab cloud/self-hosted variant step with reachability check"
```

---

## Task 6: Wizard-Footer mit Zurück-Button

**Files:**

- Modify: `app/src/components/organisms/onboarding/OnboardingWizard/index.tsx`

- [ ] **Step 1: Footer-Layout anpassen**

```tsx
<Box display="flex" justifyContent="space-between" mt={3}>
  <Button onClick={prev} disabled={isFirstStep || isDoneStep} variant="outlined">
    {t("common:back")}
  </Button>
  <Button onClick={next} variant="contained">
    {isLastInteractiveStep ? t("common:finish") : t("common:next")}
  </Button>
</Box>
```

State-Behaviour: Zurück-Navigation behält Step-State (Form-Werte nicht zurücksetzen). Wenn der State im Wizard-Component selbst gehalten wird, ist das automatisch der Fall. Sicherstellen dass keine Effect-Cleanups die Werte killen.

- [ ] **Step 2: Tests grün**

Run: `yarn workspace @recrest/app test OnboardingWizard`

- [ ] **Step 3: Commit**

```bash
git add app/src/components/organisms/onboarding/OnboardingWizard
git commit -m "feat(onboarding): back button in wizard footer"
```

---

## Task 7: Post-Wizard Activity-Dispatch

**Files:**

- Modify: `app/src/components/organisms/onboarding/steps/DoneStep/index.tsx`
- ggf. Modify: `OnboardingWizard/index.tsx` falls `onComplete` dort lebt

- [ ] **Step 1: Dispatch der nötigen Thunks**

```tsx
// im DoneStep oder im Wizard onComplete
const dispatch = useAppDispatch();
async function complete() {
  dispatch(reposActions.refreshAll());
  dispatch(activityActions.fetchForRange());
  dispatch(prsActions.pollNow());
  // Onboarding als abgeschlossen markieren
  dispatch(uiActions.markOnboardingDone());
}
```

(Exakte Thunk-Namen können abweichen — `grep -n "refreshAll\|loadRepos\|fetchActivity" app/src/store` zur Verifikation.)

- [ ] **Step 2: Tests**

Run: `yarn workspace @recrest/app test DoneStep`

- [ ] **Step 3: Commit**

```bash
git add app/src/components/organisms/onboarding
git commit -m "fix(onboarding): trigger initial data fetch after wizard completion"
```

---

## Task 8: Crash-Report-Opt-in (default off)

**Files:**

- Modify: `app/src/store/reducers/settingsReducer.ts`
- Modify: `shared/src/types/settings.ts` (oder analog)
- Modify: Step-Component (BasicsStep oder DoneStep) mit Toggle
- Modify: `app/src/locales/{de,en}/onboarding.json` + `settings.json`

- [ ] **Step 1: Settings-Feld anlegen**

```ts
// settings reducer initial state
telemetry: {
  crashReports: false;
}
```

Plus Action + Selector.

- [ ] **Step 2: Toggle in einem Wizard-Step**

```tsx
<FormControlLabel
  control={<Switch checked={crashReports} onChange={e => setCrashReports(e.target.checked)} />}
  label={t("crash_reports.label")}
/>
<Typography variant="caption">{t("crash_reports.hint")}</Typography>
```

Speichern beim Step-Next.

- [ ] **Step 3: Settings-Page spiegelt das Feld (read+write)**

Ergänze Toggle in Settings → Notifications oder neuer Sektion „Diagnose".

- [ ] **Step 4: TODO-Stub im Backend**

`app/src-tauri/src/lib.rs` oder einem neuen `telemetry.rs`:

```rust
// TODO(telemetry): hook actual crash-report pipeline; for now this only reads the flag.
pub fn crash_reports_enabled(settings: &Settings) -> bool {
    settings.telemetry.crash_reports
}
```

- [ ] **Step 5: Commit**

```bash
git add app/src app/src-tauri shared
git commit -m "feat(onboarding): crash-report opt-in setting (pipeline TODO)"
```

---

## Task 9: Default-Ordner-Setting in Settings→Integrations entfernen

**Files:**

- Modify: `app/src/pages/app/Settings/index.tsx` (Integrations-Sektion)
- Modify: `app/src/store/reducers/settingsReducer.ts` (Feld + Migration)
- Modify: `app/src/locales/{de,en}/settings.json`

- [ ] **Step 1: Feld aus UI entfernen**

Settings→Integrations: nur noch Liste der `scanPaths` + Add-Button.

- [ ] **Step 2: Reducer entfernt `defaultScanPath` aus State**

Migration: beim Hydrate aus persistierten Settings das Feld ignorieren.

- [ ] **Step 3: Locale-Schlüssel raus**

- [ ] **Step 4: Tests + Commit**

```bash
git add app/src app/src/locales
git commit -m "refactor(settings): drop redundant default-scan-path setting"
```

---

## Task 10: Wizard-Quality-Audit-Pass

**Files:**

- Modify: alle Step-Components nach Audit-Findings

- [ ] **Step 1: Audit-Pass jeden Step**

Pro Step (`WelcomeStep`, `BasicsStep`, `ConnectProviderStep`, `GitlabVariantStep`, `PickFolderStep`, `InitialScanStep`, `DoneStep`):

- Spacing / Hierarchy
- Empty States (0 Repos? Keine SSH-Keys?)
- Loading States für Ping/Scan/Verify
- Error-Messages konkret statt generisch
- Button-Hierarchie (Primary rechts, Secondary links, Tertiary „Überspringen")
- Tab-Order: erstes Feld bekommt Focus, Enter triggert Primary
- Animations < 300ms

Findings werden in `docs/plans/issues/04-onboarding-wizard.audit.md` (lokal, nicht commiten — als PR-Note) aufgelistet, jeder Finding bekommt einen Fix.

- [ ] **Step 2: Findings fixen**

Pro Finding ein kleiner, fokussierter Commit.

- [ ] **Step 3: Playwright-Smoke des kompletten Wizards**

Run: `yarn dev:web` und durch den gesamten Wizard klicken in EN und DE. Memory: `feedback_verify_ui_with_playwright`.

- [ ] **Step 4: Final-Commit**

```bash
git add app/src
git commit -m "polish(onboarding): step-by-step UX quality pass"
```

---

## Verification

- [ ] **Audit-Notes als PR-Body-Material vorhanden**
- [ ] **`yarn test:ts && yarn workspace @recrest/app test`**
- [ ] **Playwright-Smoke:** kompletter Wizard, EN + DE, mit GitLab self-hosted + GitLab cloud Variante
- [ ] Nach Wizard-Abschluss: Dashboard zeigt Activity sofort, kein manueller Reload nötig
- [ ] Zurück-Button funktioniert auf allen Steps außer Welcome und Done; Formwerte bleiben erhalten
- [ ] Crash-Report-Toggle persistiert über App-Restart
- [ ] Settings→Integrations zeigt keinen Default-Ordner mehr
