# Contributing to Recrest

Thanks for taking the time to contribute! This document describes how to set up your environment, our coding conventions, and how to propose changes.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to uphold it. Report unacceptable behavior to **<softventures.orga@gmail.com>**.

## Getting started

### Prerequisites

- **Node.js** — the version pinned in [`.nvmrc`](./.nvmrc) (use `nvm use` or `fnm use`).
- **Yarn 1.x** — `npm i -g yarn` (the repo is `packageManager: yarn@1.22.22`).
- **Rust** toolchain (stable) — only required for `yarn dev` / `yarn build` (full Tauri shell).
- **Tauri platform prerequisites** — see <https://tauri.app/start/prerequisites/>.

### Install & run

```bash
yarn install        # shared package builds automatically via postinstall
yarn dev:web        # Vite dev server at http://localhost:3000 (no Rust needed)
yarn dev            # full Tauri desktop shell
```

Before opening a PR, run the full pre-flight:

```bash
yarn test:ts && yarn lint && yarn test && yarn format:check
```

E2E tests (optional, slow):

```bash
yarn test:e2e
```

## Branching

- Base branch: **`main`**.
- Create a feature branch off `main`: `git switch -c feat/short-topic` or `fix/short-topic`.
- Rebase onto the latest `main` before opening the PR; avoid merge commits in feature branches.

### Branch prefixes

| Prefix      | Use for                              |
| ----------- | ------------------------------------ |
| `feat/`     | New user-facing feature              |
| `fix/`      | Bug fix                              |
| `chore/`    | Tooling, deps, build, non-code noise |
| `docs/`     | Documentation-only change            |
| `refactor/` | Behavior-preserving internal change  |
| `test/`     | Add or fix tests only                |
| `perf/`     | Performance improvement              |
| `ci/`       | CI / workflow changes                |

## Commit messages — Conventional Commits

All commits on `main` **must** follow [Conventional Commits 1.0](https://www.conventionalcommits.org/en/v1.0.0/). The commit hook enforces this.

```text
<type>(<optional scope>): <short summary>

<optional body>

<optional footer(s)>
```

### Allowed types

`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`, `build`, `style`, `revert`.

### Examples

```text
feat(activity): add 14-day contributor leaderboard
fix(branches): prevent stale refs after force-push
docs(readme): link to contributing guide
chore(deps): bump @tauri-apps/api to 2.1.1
```

### Breaking changes

Append `!` to the type **and** include a `BREAKING CHANGE:` footer:

```text
feat(api)!: rename invoke `scan_repos` to `repo_scan`

BREAKING CHANGE: Consumers must update their invoke call names.
```

Breaking changes trigger a major version bump via `release-please`.

## Pull requests

1. Fill out the PR template — Summary, Test plan, Screenshots (for UI changes), Linked issues.
2. Keep PRs focused: one concern per PR. If your change has two motivations, it's probably two PRs.
3. Ensure CI is green before requesting review.
4. Address review feedback via additional commits; do not force-push while a review is in progress.
5. Once approved, the maintainer will **squash-merge**. Keep the PR title Conventional-Commits-shaped — it becomes the squash commit.

## Adding new UI strings

Every user-visible string goes through `t()`. When you add text, update **both** locales:

- `app/src/i18n/locales/en/<ns>.json`
- `app/src/i18n/locales/de/<ns>.json`

PRs with only one locale will be blocked.

## Adding a Tauri command

1. Declare it in the matching `app/src-tauri/src/commands/*.rs`.
2. Wire it into `tauri::generate_handler![...]` in `app/src-tauri/src/lib.rs::run()`.
3. Mirror the return DTO as a TypeScript type in `@recrest/shared`.
4. Consume it through `invoke<T>` inside a Redux thunk, not directly in a component.

## Issues

- **Bug?** Use the **Bug report** issue template; include OS, app version, reproduction steps, expected vs actual.
- **Idea?** Use the **Feature request** template; describe the user problem first, the proposed solution second.
- **Security vulnerability?** Do **not** open a public issue. See [`SECURITY.md`](./SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
