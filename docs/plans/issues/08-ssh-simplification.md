# Phase 5 — SSH-Simplification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SSH-Konfiguration reduziert sich auf einen Key-Selector mit Auto-Discovery und vorausgewähltem Default. Agent-Modus und Modus-Switch verschwinden aus der UI.

**Architecture:** Neuer Rust-Modul `ssh::discovery` für `~/.ssh/`-Scan mit Priorisierung; UI ersetzt den heutigen Modus-Switch durch ein einfaches Dropdown.

**Tech Stack:** Rust stdlib, React + MUI v9.

---

## File Structure

- Create: `app/src-tauri/src/ssh/discovery.rs`
- Modify: `app/src-tauri/src/ssh/mod.rs` (oder anlegen) — Re-Export
- Modify: `app/src-tauri/src/commands/ssh.rs` — `list_ssh_keys` Command
- Modify: `app/src-tauri/src/lib.rs` — Registrierung
- Modify: `app/src/components/organisms/ssh/SshKeyField/index.tsx` — Auto-Discovery konsumieren
- Modify: SSH-Settings-UI in Settings-Page — Agent-Option entfernen
- Modify: `app/src/store/reducers/settingsReducer.ts` — Migration
- Modify: `shared/src/types/ssh.ts` — DTO

---

## Task 1: Backend-Discovery für ~/.ssh-Keys

**Files:**

- Create: `app/src-tauri/src/ssh/discovery.rs`
- Modify: `app/src-tauri/src/ssh/mod.rs` (oder ergänzen)

- [ ] **Step 1: DTO + Scan-Funktion**

```rust
// app/src-tauri/src/ssh/discovery.rs
use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SshKey {
    pub name: String,
    pub path: PathBuf,
    pub pub_key_path: PathBuf,
    pub key_type: String,
}

pub fn discover() -> Vec<SshKey> {
    let home = match dirs::home_dir() { Some(h) => h, None => return vec![] };
    let ssh_dir = home.join(".ssh");
    let mut keys = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&ssh_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) != Some("pub") { continue; }
            let priv_path = path.with_extension("");
            if !priv_path.exists() { continue; }
            let name = priv_path.file_name().and_then(|s| s.to_str()).unwrap_or_default().to_string();
            let key_type = detect_key_type(&path).unwrap_or_else(|| "unknown".into());
            keys.push(SshKey { name, path: priv_path, pub_key_path: path, key_type });
        }
    }
    keys.sort_by_key(|k| priority(&k.name));
    keys
}

fn priority(name: &str) -> usize {
    match name {
        "id_ed25519" => 0,
        "id_ed25519_sk" => 1,
        "id_ecdsa" => 2,
        "id_rsa" => 3,
        _ => 100,
    }
}

fn detect_key_type(pub_path: &std::path::Path) -> Option<String> {
    let content = std::fs::read_to_string(pub_path).ok()?;
    let first_token = content.split_whitespace().next()?;
    Some(first_token.to_string())
}
```

- [ ] **Step 2: Test**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn priority_ordering_picks_ed25519_first() {
        assert!(priority("id_ed25519") < priority("id_rsa"));
        assert!(priority("custom") > priority("id_rsa"));
    }
}
```

Run: `cd app/src-tauri && cargo test ssh::discovery`

- [ ] **Step 3: Commit**

```bash
git add app/src-tauri
git commit -m "feat(ssh): discover SSH keys in ~/.ssh with priority-based ordering"
```

---

## Task 2: Tauri-Command `list_ssh_keys`

**Files:**

- Modify: `app/src-tauri/src/commands/ssh.rs`
- Modify: `app/src-tauri/src/lib.rs`

- [ ] **Step 1: Command**

```rust
#[tauri::command]
pub fn list_ssh_keys() -> Vec<crate::ssh::discovery::SshKey> {
    crate::ssh::discovery::discover()
}
```

In `lib.rs::generate_handler![...]` registrieren.

- [ ] **Step 2: Frontend-DTO**

```ts
// shared/src/types/ssh.ts
export interface SshKey {
  name: string;
  path: string;
  pubKeyPath: string;
  keyType: string;
}
```

In `shared/src/index.ts` re-exporten.

- [ ] **Step 3: Commit**

```bash
git add app/src-tauri shared
git commit -m "feat(ssh): list_ssh_keys tauri command"
```

---

## Task 3: SSH-Settings-UI vereinfachen

**Files:**

- Modify: SSH-Settings-Component (Settings → SSH-Sektion). Suchen: `grep -rn "Agent\\|ssh.mode" app/src --include="*.tsx"`

- [ ] **Step 1: Agent-Mode und Modus-Switch raus, Dropdown rein**

```tsx
const [keys, setKeys] = useState<SshKey[]>([]);
const selectedKey = useAppSelector((s) => s.settings.ssh.selectedKeyName);
const dispatch = useAppDispatch();
useEffect(() => {
  invoke<SshKey[]>("list_ssh_keys").then(setKeys);
}, []);

return (
  <FormControl>
    <InputLabel>{t("ssh.key")}</InputLabel>
    <Select
      value={selectedKey ?? keys[0]?.name ?? ""}
      onChange={(e) => dispatch(setSshKey(e.target.value))}
    >
      {keys.map((k) => (
        <MenuItem key={k.name} value={k.name}>
          {k.name} ({k.keyType})
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);
```

Alte `ssh.mode`-Optionen (`agent` / `manual` / ähnlich) komplett aus der UI entfernen.

- [ ] **Step 2: Settings-Reducer-Migration**

Beim Load alter Settings: `ssh.mode`-Feld ignorieren, neues `ssh.selectedKeyName` setzen auf den höchstprioren gefundenen Key wenn unset.

```ts
// settingsReducer
const initialSshState: SshSettings = { selectedKeyName: null };
// In Migration: settings.ssh = { selectedKeyName: prev?.ssh?.selectedKeyName ?? null }
```

- [ ] **Step 3: Default-Selection-Effect**

Im SSH-Settings-Component oder beim App-Boot: wenn `selectedKeyName === null` und Keys gefunden → ersten setzen.

```tsx
useEffect(() => {
  if (!selectedKey && keys.length > 0) dispatch(setSshKey(keys[0].name));
}, [keys, selectedKey, dispatch]);
```

- [ ] **Step 4: Tests**

Run: `yarn workspace @recrest/app test ssh`

- [ ] **Step 5: Commit**

```bash
git add app/src
git commit -m "fix(ssh): drop agent mode and mode switch; single key selector with auto-default"
```

---

## Task 4: Migration für bestehende Settings

**Files:**

- Modify: `app/src/store/reducers/settingsReducer.ts`

- [ ] **Step 1: Hydrate-Logik**

Beim Hydrate aus persistierten Settings:

- altes `ssh.mode` (string) → wegwerfen
- altes `ssh.selectedKey` / `ssh.keyPath` → in `selectedKeyName` umbenennen falls vorhanden
- alles andere unter `ssh.*` → behalten falls relevant (z.B. Passphrase falls genutzt)

- [ ] **Step 2: Commit**

```bash
git add app/src/store
git commit -m "fix(settings): migrate old ssh.mode field to new selectedKeyName format"
```

---

## Verification

- [ ] `yarn test:ts && yarn workspace @recrest/app test && cd app/src-tauri && cargo test ssh`
- [ ] **Smoke (macOS):** Settings → SSH-Sektion zeigt alle Keys aus `~/.ssh/` als Dropdown; `id_ed25519` ist vorausgewählt wenn vorhanden
- [ ] Agent-Option ist nicht mehr in der UI
- [ ] Persistenz: nach App-Restart bleibt die Auswahl erhalten
