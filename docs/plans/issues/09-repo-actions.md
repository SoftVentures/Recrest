# Phase 6 — Repo-Aktionen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** „Auf $Provider öffnen" provider-aware mit UX-Modal für nicht-connected Provider, Pull/Fetch/Push in RepoDetail-Sidebar, Branches-Page mit 25er-Pagination, Suche und sicherer Delete-Aktion.

**Architecture:** Backend bekommt `git::remote_to_web_url` für URL-Parsing, `repos::delete_branch` für sichere Löschung, neue UI-Komponenten für Branch-Pagination/Suche. „Auf Host öffnen" wird zu Provider-aware Button mit 4 States.

**Tech Stack:** Rust `git2`, React + MUI v9, Redux.

---

## File Structure

- Create: `app/src-tauri/src/git/remote_url.rs` — Remote-URL → Web-URL + ProviderKind
- Modify: `app/src-tauri/src/commands/repos.rs` — `get_repo_remote_info`, `delete_branch`, `pull_branch`, `fetch_remote`, `push_branch`
- Modify: `app/src-tauri/src/lib.rs` — Registrierung
- Modify: `app/src/components/molecules/buttons/OpenHostButton/index.tsx` (oder analog) — 4 States + Provider-Label
- Create: `app/src/components/molecules/modals/ConnectProviderPromptModal/index.tsx` — Modal für nicht-connected
- Modify: `app/src/components/organisms/repos/WorkingCopyPanel/index.tsx` — Pull/Fetch/Push-Buttons
- Modify: `app/src/pages/app/Branches/index.tsx` — Pagination, Suche, Delete
- Create: `app/src/pages/app/Branches/parts/DeleteBranchDialog/index.tsx`
- Modify: `app/src/locales/{de,en}/repos.json`, `prs.json`

---

## Task 1: `remote_to_web_url` Backend

**Files:**

- Create: `app/src-tauri/src/git/remote_url.rs`
- Modify: `app/src-tauri/src/git/mod.rs`

- [ ] **Step 1: Test schreiben**

```rust
// app/src-tauri/src/git/remote_url.rs
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn github_ssh_to_web() {
        let r = parse("git@github.com:foo/bar.git").unwrap();
        assert_eq!(r.web_url, "https://github.com/foo/bar");
        assert_eq!(r.provider_kind, ProviderKind::Github);
    }
    #[test]
    fn gitlab_self_hosted_https() {
        let r = parse("https://gitlab.example.com/team/proj.git").unwrap();
        assert_eq!(r.web_url, "https://gitlab.example.com/team/proj");
        assert!(matches!(r.provider_kind, ProviderKind::Gitlab));
    }
    #[test]
    fn bitbucket_cloud_ssh() {
        let r = parse("git@bitbucket.org:team/repo.git").unwrap();
        assert_eq!(r.web_url, "https://bitbucket.org/team/repo");
        assert_eq!(r.provider_kind, ProviderKind::Bitbucket);
    }
    #[test]
    fn unknown_host_returns_unknown() {
        let r = parse("git@example.org:foo/bar.git").unwrap();
        assert_eq!(r.provider_kind, ProviderKind::Unknown);
    }
}
```

- [ ] **Step 2: Implementation**

```rust
use serde::Serialize;

#[derive(Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ProviderKind { Github, Gitlab, Bitbucket, Unknown }

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RemoteInfo {
    pub web_url: String,
    pub provider_kind: ProviderKind,
    pub host: String,
}

pub fn parse(remote: &str) -> Option<RemoteInfo> {
    let (host, path) = if let Some(rest) = remote.strip_prefix("git@") {
        let (host, p) = rest.split_once(':')?;
        (host.to_string(), p.trim_end_matches(".git").to_string())
    } else if let Some(rest) = remote.strip_prefix("https://") {
        let (host, p) = rest.split_once('/')?;
        (host.to_string(), p.trim_end_matches(".git").to_string())
    } else if let Some(rest) = remote.strip_prefix("http://") {
        let (host, p) = rest.split_once('/')?;
        (host.to_string(), p.trim_end_matches(".git").to_string())
    } else { return None; };

    let provider_kind = match host.as_str() {
        "github.com" => ProviderKind::Github,
        "bitbucket.org" => ProviderKind::Bitbucket,
        h if h == "gitlab.com" || h.starts_with("gitlab.") => ProviderKind::Gitlab,
        _ => ProviderKind::Unknown,
    };
    Some(RemoteInfo {
        web_url: format!("https://{host}/{path}"),
        provider_kind,
        host,
    })
}
```

- [ ] **Step 3: Tests grün**

Run: `cd app/src-tauri && cargo test git::remote_url`

- [ ] **Step 4: Commit**

```bash
git add app/src-tauri
git commit -m "feat(git): parse remote URL to web URL with provider kind"
```

---

## Task 2: Command `get_repo_remote_info`

**Files:**

- Modify: `app/src-tauri/src/commands/repos.rs`

- [ ] **Step 1: Command**

```rust
#[tauri::command]
pub fn get_repo_remote_info(repo_id: String, state: tauri::State<'_, AppState>) -> Result<Option<RemoteInfo>, CommandError> {
    let repo = state.repos.find(&repo_id).ok_or_else(|| CommandError::not_found("repo"))?;
    let g = git2::Repository::open(&repo.path).map_err(|e| CommandError::internal(e.to_string()))?;
    let remote = g.find_remote("origin").map_err(|e| CommandError::internal(e.to_string()))?;
    let url = remote.url().ok_or_else(|| CommandError::bad_request("no remote URL"))?;
    Ok(crate::git::remote_url::parse(url))
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src-tauri
git commit -m "feat(repos): get_repo_remote_info command"
```

---

## Task 3: `OpenHostButton`-Komponente mit 4 States

**Files:**

- Create/Modify: `app/src/components/molecules/buttons/OpenHostButton/index.tsx`
- Create: `app/src/components/molecules/modals/ConnectProviderPromptModal/index.tsx`

- [ ] **Step 1: Modal-Komponente**

```tsx
// ConnectProviderPromptModal/index.tsx
interface Props {
  open: boolean;
  provider: ProviderKind;
  onConnect: () => void;
  onProceedAnyway: () => void;
  onClose: () => void;
}
export function ConnectProviderPromptModal({
  open,
  provider,
  onConnect,
  onProceedAnyway,
  onClose,
}: Props) {
  const { t } = useTranslation("repos");
  return (
    <ConfirmationModal
      open={open}
      onClose={onClose}
      title={t("connect_prompt.title", { provider: providerDisplayName(provider) })}
      body={t("connect_prompt.body", { provider: providerDisplayName(provider) })}
      actions={[
        { kind: "primary", label: t("connect_prompt.connect"), onClick: onConnect },
        { kind: "secondary", label: t("connect_prompt.proceed_anyway"), onClick: onProceedAnyway },
        { kind: "tertiary", label: t("common:cancel"), onClick: onClose },
      ]}
    />
  );
}
```

- [ ] **Step 2: Button-Komponente**

```tsx
// OpenHostButton/index.tsx
interface Props {
  repoId: string;
}
export function OpenHostButton({ repoId }: Props) {
  const { t } = useTranslation("repos");
  const [remoteInfo, setRemoteInfo] = useState<RemoteInfo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const providerConnected = useAppSelector((s) =>
    remoteInfo ? selectProviderConnected(s, remoteInfo.providerKind) : false,
  );
  const navigate = useNavigate();

  useEffect(() => {
    invoke<RemoteInfo | null>("get_repo_remote_info", { repoId }).then(setRemoteInfo);
  }, [repoId]);

  const label = remoteInfo
    ? t("open_host", { provider: providerDisplayName(remoteInfo.providerKind) })
    : t("open_host_disabled");

  const disabled = !remoteInfo;

  function onClick() {
    if (!remoteInfo) return;
    if (remoteInfo.providerKind === "unknown") {
      openExternal(remoteInfo.webUrl);
      return;
    }
    if (!providerConnected) {
      setModalOpen(true);
      return;
    }
    openExternal(remoteInfo.webUrl);
  }

  return (
    <>
      <GeneralTooltip title={disabled ? t("open_host_no_remote") : ""}>
        <span>
          <GeneralButton onClick={onClick} disabled={disabled}>
            {label}
          </GeneralButton>
        </span>
      </GeneralTooltip>
      {remoteInfo && (
        <ConnectProviderPromptModal
          open={modalOpen}
          provider={remoteInfo.providerKind}
          onConnect={() => {
            setModalOpen(false);
            navigate(`/settings#provider-${remoteInfo.providerKind}`);
          }}
          onProceedAnyway={() => {
            setModalOpen(false);
            openExternal(remoteInfo.webUrl);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Locales ergänzen**

DE/EN: `open_host`, `open_host_disabled`, `open_host_no_remote`, `connect_prompt.*`.

- [ ] **Step 4: Tests**

```tsx
it("zeigt Modal wenn Provider erkannt aber nicht connected", async () => {
  /* ... */
});
it("öffnet Web-URL direkt wenn connected", async () => {
  /* ... */
});
it("ist disabled wenn keine Remote", async () => {
  /* ... */
});
```

- [ ] **Step 5: Commit**

```bash
git add app/src
git commit -m "feat(repos): provider-aware OpenHostButton with connect-prompt modal"
```

---

## Task 4: Pull/Fetch/Push-Backend-Commands

**Files:**

- Modify: `app/src-tauri/src/commands/repos.rs`

- [ ] **Step 1: Existenz prüfen**

Run: `grep -n "fn pull\\|fn fetch\\|fn push" app/src-tauri/src/commands/repos.rs`

Wenn vorhanden: API stabilisieren (klare DTO, Fehler-Surfacing). Wenn fehlend: implementieren.

- [ ] **Step 2: Implementation (falls fehlend)**

```rust
#[tauri::command]
pub async fn pull_branch(repo_id: String, state: tauri::State<'_, AppState>) -> Result<PullResult, CommandError> {
    let repo = state.repos.find(&repo_id).ok_or_else(|| CommandError::not_found("repo"))?;
    // git2::Repository::open + remote.fetch + merge analysis + fast_forward / report conflict
    // [konkrete git2-Implementation, mit SSH-Key-Auth via ssh::discovery::selected]
}

#[tauri::command]
pub async fn fetch_remote(repo_id: String, state: tauri::State<'_, AppState>) -> Result<(), CommandError> { /* ... */ }

#[tauri::command]
pub async fn push_branch(repo_id: String, state: tauri::State<'_, AppState>) -> Result<(), CommandError> { /* ... */ }
```

Auth nutzt den Default-SSH-Key aus Phase 5 (`selectedKeyName` aus Settings → ssh-Auth-Callback).

- [ ] **Step 3: Commit**

```bash
git add app/src-tauri
git commit -m "feat(repos): pull, fetch, push commands with ssh auth"
```

---

## Task 5: RepoDetail-Sidebar Pull/Fetch/Push-Buttons

**Files:**

- Modify: `app/src/components/organisms/repos/WorkingCopyPanel/index.tsx`

- [ ] **Step 1: Action-Buttons-Reihe**

```tsx
const pull = useActionFeedback();
const fetchAct = useActionFeedback();
const push = useActionFeedback();
// useActionFeedback aus Phase 7

return (
  <Stack direction="row" spacing={1}>
    <GeneralIconButton
      icon={<ArrowDownIcon />}
      tooltip={t("pull")}
      feedbackState={pull.state}
      onClick={() => pull.run(() => invoke("pull_branch", { repoId }))}
    />
    <GeneralIconButton
      icon={<RefreshIcon />}
      tooltip={t("fetch")}
      feedbackState={fetchAct.state}
      onClick={() => fetchAct.run(() => invoke("fetch_remote", { repoId }))}
    />
    <GeneralIconButton
      icon={<ArrowUpIcon />}
      tooltip={t("push")}
      feedbackState={push.state}
      onClick={() => push.run(() => invoke("push_branch", { repoId }))}
    />
  </Stack>
);
```

- [ ] **Step 2: Tests**

Run: `yarn workspace @recrest/app test WorkingCopyPanel`

- [ ] **Step 3: Commit**

```bash
git add app/src
git commit -m "feat(repos): pull/fetch/push buttons in RepoDetail sidebar"
```

---

## Task 6: Branches-Page Pagination

**Files:**

- Modify: `app/src/pages/app/Branches/index.tsx`

- [ ] **Step 1: 25-Step-Pagination**

```tsx
const [visible, setVisible] = useState(25);
const branches = useAppSelector(selectBranches);
const sorted = useMemo(
  () => [...branches].sort((a, b) => b.lastCommitDate.localeCompare(a.lastCommitDate)),
  [branches],
);
const shown = sorted.slice(0, visible);
const remaining = sorted.length - visible;

return (
  <>
    {shown.map((b) => (
      <BranchRowItem key={b.name} branch={b} />
    ))}
    {remaining > 0 && (
      <Button onClick={() => setVisible((v) => v + 25)}>
        {t("show_more", { count: Math.min(25, remaining) })}
      </Button>
    )}
  </>
);
```

- [ ] **Step 2: Commit**

```bash
git add app/src/pages/app/Branches
git commit -m "feat(branches): paginate 25 at a time with show-more"
```

---

## Task 7: Branches-Suche

**Files:**

- Modify: `app/src/pages/app/Branches/index.tsx`

- [ ] **Step 1: Such-Input + Filter**

```tsx
const [query, setQuery] = useState("");
const filtered = useMemo(
  () => sorted.filter((b) => b.name.toLowerCase().includes(query.toLowerCase())),
  [sorted, query],
);
// ...verwende filtered statt sorted in der Render-Liste
```

- [ ] **Step 2: Commit**

```bash
git add app/src
git commit -m "feat(branches): client-side search filter"
```

---

## Task 8: Branch-Delete (sicher + force-confirmation)

**Files:**

- Modify: `app/src-tauri/src/commands/repos.rs` — `delete_branch`
- Create: `app/src/pages/app/Branches/parts/DeleteBranchDialog/index.tsx`
- Modify: `BranchRowItem` — Delete-Button

- [ ] **Step 1: Backend-Command**

```rust
#[tauri::command]
pub fn delete_branch(repo_id: String, branch: String, force: bool, state: tauri::State<'_, AppState>) -> Result<(), CommandError> {
    let repo = state.repos.find(&repo_id).ok_or_else(|| CommandError::not_found("repo"))?;
    let g = git2::Repository::open(&repo.path).map_err(|e| CommandError::internal(e.to_string()))?;
    let mut b = g.find_branch(&branch, git2::BranchType::Local).map_err(|e| CommandError::internal(e.to_string()))?;
    if !force {
        // git2 prüft selber wenn der Branch nicht gemerged ist und delete returns Err
    }
    if force {
        b.delete().map_err(|e| CommandError::internal(e.to_string()))?;
    } else {
        // Try safe delete; on conflict return specific error
        match b.delete() {
            Ok(()) => Ok(()),
            Err(e) if e.code() == git2::ErrorCode::NotFound => Err(CommandError::not_found("branch")),
            Err(e) => return Err(CommandError::bad_request(format!("not merged: {e}"))),
        }?;
    }
    Ok(())
}
```

- [ ] **Step 2: Dialog**

```tsx
// DeleteBranchDialog/index.tsx
export function DeleteBranchDialog({ open, branch, repoId, onClose }: Props) {
  const [forceMode, setForceMode] = useState(false);
  async function confirm() {
    try {
      await invoke("delete_branch", { repoId, branch, force: forceMode });
      onClose();
    } catch (e) {
      if (!forceMode && String(e).includes("not merged")) setForceMode(true);
      else throw e;
    }
  }
  // [ConfirmationModal mit zwei Body-Varianten: erst „Branch X löschen?", bei not-merged „Branch ist nicht gemerged. Trotzdem löschen?"]
}
```

- [ ] **Step 3: Delete-Button im BranchRowItem (hover-revealed)**

```tsx
<GeneralIconButton
  icon={<TrashIcon />}
  tooltip={t("delete_branch")}
  tone="danger"
  onClick={() => setDeleteOpen(true)}
/>
```

- [ ] **Step 4: Tests**

Run: `cd app/src-tauri && cargo test delete_branch && yarn workspace @recrest/app test DeleteBranchDialog`

- [ ] **Step 5: Commit**

```bash
git add app/src app/src-tauri
git commit -m "feat(branches): safe delete with force-confirmation modal"
```

---

## Verification

- [ ] `cargo test && yarn test:ts && yarn workspace @recrest/app test`
- [ ] **Smoke** in `yarn dev`:
  - „Auf $Provider öffnen" zeigt Provider im Label
  - Bei nicht-connected Provider: Modal mit „Verbinden / Trotzdem öffnen / Abbrechen"
  - Bei keiner Remote: Button disabled mit Tooltip
  - RepoDetail-Sidebar: Pull/Fetch/Push funktionieren mit visuellem Feedback (aus Phase 7)
  - Branches-Page: 25 + Pagination + Suche + Delete (safe und force)
