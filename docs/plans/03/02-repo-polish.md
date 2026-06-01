# Plan 2 — Repo Management Polish Implementation Plan (Phase B)

> ✅ **Status: Done.** B.1, B.2, B.4, B.5, B.6 implemented and smoke-verified. **B.3 (favicon remote fetch) was scope-cut** — see the B.3 section. Code locations: `RepoRow/index.tsx` (inline pin), `ProvidersPanel/index.tsx` (import defaults), `IntegrationsTab/index.tsx` (default scan path), `RepoList/parts/RepoListHead` (sortable header), `Repos/index.tsx` (persisted sort/view), `commands/git_ops.rs::build_ssh_key_cred` + `commands/ssh.rs::ssh_unlock_key`, `organisms/repos/RepoSshSettings` + `RepoSshModal`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish repo management — import defaults, a designated default scan folder, direct pin/unpin from the row, a sortable flat list, a favicon logo fallback, and per-repo SSH keys.

**Architecture:** Most settings already exist in `AppSettings`/`SettingsPatch` but are inert; the bulk of this work is reading the inert fields and wiring frontend state through the existing `saveSettings(patch)` → `update_settings` path. One larger backend feature: per-repo SSH credential resolution (B.6). (B.3 favicon-remote-fetch was originally planned here but later scope-cut — see the B.3 section.)

**Tech Stack:** React 19 + MUI v9 + Emotion, Redux Toolkit thunks, Rust (`git2`), Tauri IPC.

**Prerequisite:** Plan 1 Part A (test harness) merged. Settings write path: `saveSettings(patch: Partial<AppSettings>)` (`app/src/store/actions/settings.actions.ts:54`) → `TauriCommand.UPDATE_SETTINGS` → `update_settings(patch: SettingsPatch)` (`app/src-tauri/src/commands/settings.rs:78`). `SettingsPatch` already carries `repo_import_defaults`, `default_scan_path`, `repo_list_view_mode`, `repo_list_sort`, `terminal`, `privacy`.

---

## B.4 — Direct pin/unpin from the row

The context-menu pin already works (`togglePinnedRepo` at `ui.actions.ts:13`, reducer at `uiReducer.ts:59`). Add an inline, always-actionable pin control on the row so users don't need the menu.

### Task 1: Inline pin toggle on RepoRow

**Files:**

- Modify: `app/src/pages/app/Repos/components/RepoRow/index.tsx`
- Modify: `app/src/pages/app/Repos/components/RepoRow/RepoRow.styles.tsx`
- Test: `app/src/pages/app/Repos/components/RepoRow/RepoRow.test.tsx` (create if absent)

- [x] **Step 1: Write the failing component test**

Create/extend `RepoRow.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import { makeTestStore } from "@/test-utils/store";

// use the existing store test helper; if none, build a store via configureStore with uiReducer
import RepoRow from ".";

it("toggles pin via the inline pin button without opening the menu", () => {
  const store = makeTestStore();
  const repo = {
    id: "r1",
    name: "alpha",
    path: "/x/alpha",
    pinned: false,
    status: { branch: "main" },
  } as never;
  render(
    <Provider store={store}>
      <RepoRow repo={repo} onSelect={vi.fn()} />
    </Provider>,
  );
  fireEvent.click(screen.getByTestId(TEST_IDS.repoRow.pinToggle));
  expect(store.getState().ui.pinnedRepoIds).toContain("r1");
});
```

(Import `TEST_IDS` from `@/lib/constants/testIds.constants` — you'll add the id in Step 3.)

- [x] **Step 2: Run it to confirm it fails**

Run: `yarn workspace @recrest/app test src/pages/app/Repos/components/RepoRow/RepoRow.test.tsx`
Expected: FAIL — no element with that test id.

- [x] **Step 3: Add the test id + inline pin button**

In `app/src/lib/constants/testIds.constants.ts`, add to the `repoRow` group: `pinToggle: "repo-row-pin-toggle"`.

In `RepoRow/index.tsx`, add a handler that does NOT close a menu (it's always visible):

```tsx
const onInlinePin = (e: React.MouseEvent) => {
  e.stopPropagation();
  dispatch(togglePinnedRepo(repo.id));
};
```

Render a `GeneralIconButton` (per the icon-button convention — never inline `styled("button")`) near the row's leading edge:

```tsx
<GeneralIconButton
  size={IconButtonSize.XS}
  variant="ghost"
  tone={repo.pinned ? "primary" : "neutral"}
  icon={<Pin size={13} />}
  aria-label={repo.pinned ? tAria("repo.unpin") : tAria("repo.pin")}
  data-testid={TEST_IDS.repoRow.pinToggle}
  onClick={onInlinePin}
/>
```

Add `repo.pin` / `repo.unpin` to `locales/en/aria.json` + `locales/de/aria.json`.

- [x] **Step 4: Run the test to verify it passes**

Run: `yarn workspace @recrest/app test src/pages/app/Repos/components/RepoRow/RepoRow.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add app/src/pages/app/Repos/components/RepoRow app/src/lib/constants/testIds.constants.ts app/src/locales
git commit -m "feat: inline pin/unpin toggle on repo row (B.4)"
```

---

## B.1 — Repo import defaults

`RepoImportDefaults { groupId, providerId }` already exists (`settings.rs:103`, TS `settings.ts:59`) and is in `SettingsPatch`. Prefill the import flow from it and offer "save as default".

### Task 2: Prefill AddRepoModal / onboarding from defaults + persist

**Files:**

- Modify: `app/src/components/molecules/modals/AddRepoModal/panels/ProvidersPanel/index.tsx` (provider/org prefill)
- Modify: `app/src/components/organisms/onboarding/steps/PickFolderStep/index.tsx` (scan path prefill — see B.2)
- Test: a component test for the panel reading defaults

- [x] **Step 1: Write the failing test**

Add a test asserting that when `settings.repoImportDefaults.providerId === "github"`, the panel mounts with that provider preselected:

```tsx
it("preselects the default provider from settings", () => {
  const store = makeTestStore({
    settings: { repoImportDefaults: { providerId: "github", groupId: null } },
  });
  render(
    <Provider store={store}>
      <ProvidersPanel />
    </Provider>,
  );
  expect(screen.getByTestId(TEST_IDS.addRepo.providerTab("github"))).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
```

- [x] **Step 2: Run to confirm failure**

Run: `yarn workspace @recrest/app test src/components/molecules/modals/AddRepoModal`
Expected: FAIL.

- [x] **Step 3: Read defaults at mount**

In `ProvidersPanel`, initialize `activeProvider` from defaults (falling back to the first connected provider):

```tsx
const importDefaults = useAppSelector((s) => s.settings.repoImportDefaults);
const [activeProvider, setActiveProvider] = useState<ProviderId | null>(
  (importDefaults?.providerId as ProviderId | null) ?? connectedProviders[0] ?? null,
);
const [activeOrg, setActiveOrg] = useState<string | null>(importDefaults?.groupId ?? null);
```

(Confirm `s.settings.repoImportDefaults` exists on the TS settings state shape; if the settings reducer doesn't surface it yet, add it to the settings state type + hydrate from `loadSettings.fulfilled` mirroring `pinnedRepoIds` hydration in `uiReducer.ts:90`.)

- [x] **Step 4: Add "Save as default" affordance**

When the user picks a provider/org and confirms an import, dispatch:

```tsx
await dispatch(
  saveSettings({ repoImportDefaults: { providerId: activeProvider, groupId: activeOrg } }),
).unwrap();
```

Gate it behind a checkbox "Remember as import default" so it's opt-in.

- [x] **Step 5: Run the test to verify it passes**

Run: `yarn workspace @recrest/app test src/components/molecules/modals/AddRepoModal`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add app/src/components/molecules/modals/AddRepoModal app/src/store
git commit -m "feat: prefill repo import from defaults + save-as-default (B.1)"
```

---

## B.2 — Default scan folder

`AppSettings.default_scan_path: Option<String>` exists (`settings.rs`), TS `defaultScanPath: string | null`, and `SettingsPatch.default_scan_path: Option<Option<String>>` exists. The IntegrationsTab scan-path editor currently keeps **local-only** state (`IntegrationsTab/index.tsx:120`, `useState(["~/Code"])`) — wire it to settings and add a "default" radio.

### Task 3: Persist scan paths + designate a default

**Files:**

- Modify: `app/src/pages/app/Settings/components/IntegrationsTab/index.tsx`
- Modify: `app/src-tauri/src/commands/repos.rs` (repo-add default-path preselection — verify caller)
- Test: component test for the radio + persistence dispatch

- [x] **Step 1: Write the failing test**

```tsx
it("marking a scan path as default dispatches saveSettings({ defaultScanPath })", async () => {
  const store = makeTestStore({ repos: { scanPaths: ["~/Code", "~/Work"] } });
  const spy = vi.spyOn(store, "dispatch");
  render(
    <Provider store={store}>
      <IntegrationsSection />
    </Provider>,
  );
  fireEvent.click(screen.getByTestId(TEST_IDS.settings.scanPathDefaultRadio("~/Work")));
  await waitFor(() =>
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: expect.stringContaining("settings/save") }),
    ),
  );
});
```

- [x] **Step 2: Run to confirm failure**

Run: `yarn workspace @recrest/app test src/pages/app/Settings/components/IntegrationsTab`
Expected: FAIL.

- [x] **Step 3: Source paths from Redux + add the default radio**

Replace the local `useState(["~/Code"])` with `useAppSelector((s) => s.repos.scanPaths)` and read `defaultScanPath` from settings state. On add/remove, persist with `dispatch(saveSettings({ scanPaths: next }))` (the pattern already used in `PickFolderStep:94`). Add a radio column:

```tsx
<RadioInput
  name="default-scan-path"
  checked={defaultScanPath === p}
  data-testid={TEST_IDS.settings.scanPathDefaultRadio(p)}
  onChange={() => void dispatch(saveSettings({ defaultScanPath: p }))}
/>
```

Add `scanPathDefaultRadio: (p: string) => \`scan-path-default-${p}\``to`testIds.constants.ts`.

- [x] **Step 4: Prefill import scan path from the default**

In `PickFolderStep` / `AddRepoModal` local-path panel, initialize the picker's starting directory from `settings.defaultScanPath ?? scanPaths[0]`.

- [x] **Step 5: Run the test to verify it passes**

Run: `yarn workspace @recrest/app test src/pages/app/Settings/components/IntegrationsTab`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add app/src/pages/app/Settings/components/IntegrationsTab app/src/components/organisms/onboarding app/src/lib/constants/testIds.constants.ts
git commit -m "feat: persist scan paths + designate default scan folder (B.2)"
```

---

## B.5 — Sortable flat list

The Repos page already has page-local `view: "list"|"card"` and `sort: RepoSortKey` (`Repos/index.tsx:49-72`), `grouped = sort === "default"`. The list header (`RepoListHead/index.tsx:35`) is static. Make it sortable and persist view+sort so they survive restart (backend already accepts `repo_list_view_mode` + `repo_list_sort`).

### Task 4: Clickable sortable header

**Files:**

- Modify: `app/src/pages/app/Repos/components/RepoList/parts/RepoListHead/index.tsx`
- Modify: `app/src/pages/app/Repos/index.tsx` (pass sort + onSort down)
- Modify: `app/src/pages/app/Repos/components/RepoList/index.tsx` (thread props)
- Test: `RepoListHead` component test

- [x] **Step 1: Write the failing test**

```tsx
it("clicking the Name header toggles name:asc → name:desc", () => {
  const onSort = vi.fn();
  render(<RepoListHead sort="name:asc" onSort={onSort} />);
  fireEvent.click(screen.getByTestId(TEST_IDS.repoList.sortHeader("name")));
  expect(onSort).toHaveBeenCalledWith("name:desc");
});
```

- [x] **Step 2: Run to confirm failure**

Run: `yarn workspace @recrest/app test src/pages/app/Repos/components/RepoList/parts/RepoListHead`
Expected: FAIL (`RepoListHead` takes no props today).

- [x] **Step 3: Make header cells clickable**

Give `RepoListHead` props `{ sort: RepoSortKey; onSort: (next: RepoSortKey) => void }`. Map each sortable column to its key family (`name`, `status`, `lastModified`) and render an asc/desc arrow when active:

```tsx
interface RepoListHeadProps {
  sort: RepoSortKey;
  onSort: (k: RepoSortKey) => void;
}

function nextKey(base: "name" | "status" | "lastModified", cur: RepoSortKey): RepoSortKey {
  if (base === "name") return cur === "name:asc" ? "name:desc" : "name:asc";
  if (base === "lastModified") return "lastModified:desc";
  return "status:asc";
}
```

Use `GeneralIconButton`/clickable `Typography` per convention (the header cells are layout `Box`; wrap the label text in a `role="button" tabIndex={0}` element with `onKeyDown` Enter/Space, since nested `<button>` inside a grid cell is fine but follow the no-nested-interactive rule). Add `sortHeader: (col: string) => \`repo-list-sort-${col}\``to`testIds.constants.ts`.

- [x] **Step 4: Thread sort + onSort from the page**

In `Repos/index.tsx`, pass `sort` and `setSort` into `RepoList`, which forwards to `RepoListHead`. (The list-rendering branches at `RepoList/index.tsx:105-139` already receive `grouped`; add `sort`/`onSort` to the props interface.)

- [x] **Step 5: Run the test to verify it passes**

Run: `yarn workspace @recrest/app test src/pages/app/Repos/components/RepoList/parts/RepoListHead`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add app/src/pages/app/Repos
git commit -m "feat: sortable repo list header (B.5)"
```

### Task 5: Persist view + sort across restart

**Files:**

- Modify: `app/src/pages/app/Repos/index.tsx` (init from settings + persist on change)
- Verify/Modify: `shared/src/types/settings.ts` (`repoListViewMode`, `repoListSort` fields)
- Test: reducer/selector test asserting hydration

- [x] **Step 1: Confirm the TS settings fields exist**

Run: `rg -n "repoListViewMode|repoListSort" shared/src/types/settings.ts`
Expected: if missing, add to the `AppSettings` interface (mirroring the Rust `SettingsPatch` fields `repo_list_view_mode`/`repo_list_sort`):

```ts
export type RepoListViewMode = "grouped" | "flat" | "card";
export interface RepoListSort {
  field: string;
  direction: "asc" | "desc";
}
// in AppSettings:
repoListViewMode: RepoListViewMode;
repoListSort: RepoListSort;
```

- [x] **Step 2: Init page state from settings, persist on change**

In `Repos/index.tsx`, initialize `sort`/`view` from `settings` (falling back to current defaults) and on change dispatch `saveSettings({ repoListSort: toBackendSort(sort), repoListViewMode: toBackendView(view, sort) })`. Write the two tiny pure mappers (`name:asc` → `{ field: "name", direction: "asc" }`, etc.) in `app/src/lib/utils/repoSort.utils.ts` with sibling unit tests.

- [x] **Step 3: Test the mappers**

Run: `yarn workspace @recrest/app test src/lib/utils/repoSort.utils.test.ts`
Expected: PASS (round-trip `RepoSortKey ↔ RepoListSort`).

- [x] **Step 4: Commit**

```bash
git add app/src/pages/app/Repos app/src/lib/utils/repoSort.utils.ts app/src/lib/utils/repoSort.utils.test.ts shared/src/types/settings.ts
git commit -m "feat: persist repo list view + sort (B.5)"
```

---

## B.3 — Favicon logo fallback ~~(remote fetch)~~ — SCOPE CUT

**Status: dropped — not implemented and not needed.**

The repo-avatar ladder is already adequate without a remote fetch:

- `detect_repo_logo` (`git/logo.rs:87`) discovers in-repo logo files (`favicon.*`, `logo.*`, `apple-touch-icon.*`, `icon.*`) across the standard frontend layouts (`public/`, `static/`, `app/public/`, …).
- `RepoAvatar` renders `logoUri` via `useRepoLogo`, falling back to gradient+letter.

Fetching `<host>/favicon.ico` from a remote would add a network dependency, a privacy gate, an image-decode pipeline, a cache, and a concurrency limiter — for a fallback that only kicks in when a project ships **no** logo anywhere in its source. Cost > benefit. The `PrivacySettings.fetch_favicons` field stays in settings (it's harmless), but no fetcher is wired.

If we ever revisit this, restore Tasks 6–8 from git history (commit prior to this scope-cut) — they were fully specified with `image`, `sha2`, `reqwest` + `wiremock`-driven TDD.

---

## B.6 — Per-repo SSH key

`RepoRecord.ssh_key_path: Option<String>` exists (`settings.rs:289`). Credentials are built by `install_credentials` (`git_ops.rs:68`), which today only does token → helper → ssh-agent. Add a per-repo key override before the agent fallback, plus an in-memory passphrase cache.

### Task 9: Per-repo SSH key in the credential chain

**Files:**

- Modify: `app/src-tauri/src/commands/git_ops.rs` (`install_credentials` signature + chain)
- Modify: `app/src-tauri/src/lib.rs` (`AppState` gains a passphrase cache field)
- Test: `app/src-tauri/src/commands/git_ops.rs` test module with a generated test key

- [x] **Step 1: Write the failing test**

Using `TempRepo` + a generated ed25519 test key fixture (create under `app/src-tauri/tests/fixtures/ssh/` — never use the user's real key/name), assert that the credential closure built from a `ssh_key_path` yields a `Cred::ssh_key` (not agent). Test the _builder_ in isolation:

```rust
#[test]
fn ssh_key_override_builds_ssh_key_cred() {
    let key = std::path::Path::new(concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/ssh/test_id_ed25519"));
    let cred = build_ssh_key_cred(Some("git"), key, None).expect("cred");
    // git2::Cred has no public getter; assert construction didn't error and credtype is ssh-key
    assert!(cred.credtype() & git2::CredentialType::SSH_KEY.bits() != 0);
}
```

- [x] **Step 2: Run to confirm failure** — `cargo test ... ssh_key_override` → no `build_ssh_key_cred`.

- [x] **Step 3: Implement the override**

Add a small helper and thread `ssh_key_path` + passphrase into `install_credentials`:

```rust
fn build_ssh_key_cred(
    username: Option<&str>,
    private_key: &std::path::Path,
    passphrase: Option<&str>,
) -> Result<git2::Cred, git2::Error> {
    // public key derived alongside (<key>.pub) when present
    let pub_key = private_key.with_extension("pub");
    let pub_opt = pub_key.exists().then_some(pub_key);
    git2::Cred::ssh_key(
        username.unwrap_or("git"),
        pub_opt.as_deref(),
        private_key,
        passphrase,
    )
}
```

In the `SSH_KEY` arm of `install_credentials`, if a per-repo `ssh_key_path` is provided, use `build_ssh_key_cred(username_from_url, &path, passphrase)` **before** falling back to `ssh_key_from_agent`. The `username` comes from `username_from_url` (git2 contract) — never from settings. Pass `ssh_key_path` + cached passphrase into `install_credentials` from the call sites (`fetch_blocking`/pull/push) by reading the `RepoRecord`.

**Security:** never log the key path or passphrase (no `Debug`/`Display` of them).

- [x] **Step 4: Run the test** → PASS. **Commit** (`feat: per-repo SSH key in credential chain (B.6)`).

### Task 10: In-memory passphrase cache + unlock command

**Files:**

- Modify: `app/src-tauri/src/lib.rs` (`AppState { ssh_passphrases: Arc<Mutex<HashMap<String, zeroize::Zeroizing<String>>>> }` — add `zeroize` crate)
- Create: `app/src-tauri/src/commands/ssh.rs` — `ssh_unlock_key(repo_id, passphrase)` stores it for the session
- Modify: `lib.rs` handler blocks + `commands.ts`
- Test: store/read round-trip; drop clears

- [x] TDD: add `zeroize = "1"` to deps; implement the cache + `ssh_unlock_key` command (keyed by repo id); on credential failure due to encrypted key with no cached passphrase, return `CommandError::bad_request("ssh-key-passphrase-required")` so the frontend can prompt. Commit per green step.

### Task 11: Repo SSH settings UI

**Files:**

- Create: `app/src/components/organisms/repos/RepoSshSettings/index.tsx`
- Modify: `app/src/pages/app/RepoDetail/index.tsx` (add an "SSH" section/card)
- Modify: repos thunk to persist `sshKeyPath` on the repo record (extend the repo update path; confirm a `RepoRecord`-update command exists, else add `set_repo_ssh_key(repo_id, path)`)
- Test: component test (pick key → dispatch)

- [x] TDD: a key selector listing `~/.ssh/id_ed25519`/`id_rsa` plus an "Other…" file picker (Tauri dialog), a passphrase prompt dialog that calls `ssh_unlock_key`, and a "Test connection" button that runs `git_fetch`. Component test mocks invoke. Commit.

- [x] **Manual:** clone/fetch a private repo with a custom key (per repo-convention live verification).

---

## Done-check (Phase B)

- [x] `cargo test --manifest-path app/src-tauri/Cargo.toml` green (ssh).
- [x] `yarn typecheck && yarn lint && yarn test` green.
- [x] Playwright-MCP live check for B.4 (inline pin), B.5 (sortable header), B.2 (default radio) — UI changes require it per repo convention.
- [x] Manual: B.6 with a private SSH repo + custom key.
