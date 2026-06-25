# Recrest Roadmap

Where Recrest could go next. Recrest is a native, **local-first** desktop
dashboard (Rust + Tauri, TypeScript UI) for the git repos, pull/merge requests
and CI you work with every day — across GitHub, GitLab and Bitbucket.

Everything below is a **feature idea / direction**, not a dated commitment, and
the list is shaped in the open. Want something here sooner, or have an idea
that's missing?

> 💡 [Open an issue](https://github.com/SoftVentures/Recrest/issues/new/choose)
> or [start a discussion](https://github.com/SoftVentures/Recrest/discussions) —
> upvotes help decide what gets built next.

Guiding principles for anything we add: it stays **local and private** (no
Recrest servers, tokens in the OS keychain), it feels **native and calm**, and
it's **keyboard-fast**.

---

## 🔍 Review & pull requests

- **Side-by-side diff** with word-level highlighting and real syntax colors.
- **Review threads** you can read, reply to, react to and resolve inline.
- **Suggested changes** you can commit straight from the diff.
- **Approve, request changes and merge** (with merge-strategy choice) without
  leaving the app.
- **Create a PR/MR from a local branch** with templates and reviewer presets.
- **"My turn" inbox** — every PR waiting on your review, across all providers,
  in one list.

## 🌿 Local git power

- **Stage, commit, amend and push** straight from the working-tree view.
- **Visual commit graph** and branch history.
- **One-click cleanup** of merged and stale branches.
- **Stash manager** — create, preview, apply and drop stashes.
- **Guided conflict resolver** for merges and rebases.
- **Worktree support** for juggling several branches at once.

## ⚙️ CI/CD & deployments

- **Live, streaming job logs** that jump you to the first failure.
- **Re-run** a failed job or a whole workflow inline.
- **Deployment timeline** and per-environment status board.
- **First-class Bitbucket deployments** — a proper deployments API instead of
  best-effort pipeline detection.
- **Required-checks summary** surfaced on every PR.

## 🔔 Notifications & focus

- **Native notifications** for review requests, mentions and CI failures.
- **Snooze, quiet hours and do-not-disturb** so it never nags.
- **Tray / menu-bar quick view** of "what needs me right now".
- **Per-repo notification rules.**

## 🔑 Accounts & providers

- **OAuth sign-in** — connect an account in one click (PAT stays optional).
- **Multiple accounts** per provider (work + personal side by side).
- **More providers** — Gitea / Forgejo, Azure DevOps, and self-hosted
  instances.
- **SSH key and credential-helper management** from inside the app.

## ⌨️ Search & command

- **Command palette** — jump to any repo, PR, branch or action from one prompt.
- **Fuzzy search** across repos, PRs/MRs and branches.
- **Saved filters & smart views** (e.g. "failing CI on my open PRs").

## 📊 Insights

- **Activity heatmap** per repo and across everything you track.
- **PR cycle-time and review-load** stats — computed locally, never uploaded.
- **Stale-branch and forgotten-PR reports** to keep things tidy.

## 🧩 Extensibility & integration

- **WASM provider plugins** — add a provider without touching the core.
- **Custom actions / scripts** bound to a repo or a PR.
- **"Open in"** your editor, terminal or file manager from any row.
- **Theme and layout customization** beyond light / dark.

## 💻 Platform

- **Read-only mobile companion** to triage on the go.
- **Offline action queue** that syncs when you reconnect.
- **CLI companion** that shares the same local index.

---

_These are ideas and directions, shaped by the community. Nothing here is a
promise or a dated commitment — priorities shift as people weigh in._
