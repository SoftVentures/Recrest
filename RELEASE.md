# Recrest 0.6.0 — Activity insights, atomic UI, native window chrome

Second beta of Recrest. The big story is the new **Activity** dashboard and a full UI refactor into atomic-design layers (atoms / molecules / organisms) with Storybook coverage across the board. Under the hood, the shell gained OS-native titlebars, a guided onboarding flow, and a lot of CI / platform polish.

Still a beta — treat it as "use it, tell us what's broken" rather than "rely on it in your daily loop".

## What's new

### Activity dashboard

A new route that turns your local repos into insight cards — no cloud, everything computed from your own git data:

- **Heroes**: commits, authors, open PRs, CI health.
- **Contributor cards**: leaderboard, author-clock, streak.
- **Code cards**: churn, language donut, heatmap, stacked activity chart.
- **Pull-request cards**: PR velocity, time-to-merge, review queue.
- **CI cards**: pass rate, flaky repos, quietest repos, busiest peak.

Each card is independent — filter by repo or time window and the dashboard reshapes.

### Native window chrome

The titlebar adapts to the host OS instead of forcing one look everywhere:

- **Windows 11** — custom titlebar with snap-layouts affordance.
- **GNOME / Linux** — CSD-style titlebar matching Adwaita conventions.
- **macOS** — transparent overlay respecting traffic-light spacing.

### Onboarding wizard

First-run flow walks new users through: welcome → basics → pick folder → connect provider (optional) → initial scan → done. Skippable per step.

### IDE integration

- **Open in IDE** button on repo and PR rows, with live detection of installed IDEs (VS Code, JetBrains family, Zed, Sublime, Xcode, Android Studio).
- Branded icons for each IDE in the picker.

### UI refactor

Every component was moved into an atomic-design hierarchy (`atoms/ molecules/ organisms/`) with colocated Storybook stories and Vitest tests. The impact on day-to-day usage is small, but the codebase is now consistent from top to bottom and much easier to contribute to.

## Install

- **Windows** — run the `.msi`. SmartScreen will warn about an unknown publisher → **More info → Run anyway**.
- **macOS** — open the `.dmg`, drag Recrest into Applications. On first launch, Gatekeeper may block; right-click the app → **Open**, or `xattr -cr /Applications/Recrest.app`.
- **Linux** — `chmod +x Recrest_*.AppImage && ./Recrest_*.AppImage`, or install the `.deb` / `.rpm`.

## Verify the download

`SHA256SUMS.txt` is attached to this release:

```bash
sha256sum -c SHA256SUMS.txt           # Linux
shasum -a 256 -c SHA256SUMS.txt       # macOS
Get-FileHash <file> -Algorithm SHA256 # Windows PowerShell
```

## Platform & build improvements

- **Beta build workflow** — `release-tauri-beta.yml` produces unsigned installers from any ref without creating a release, useful for dogfooding before cutting a tag.
- **Linux build fix** — webkit / gtk / appindicator dependencies pinned; AppImage / deb / rpm now build cleanly on `ubuntu-22.04`.
- **macOS config split** — `tauri.macos.conf.json` isolates mac-specific entitlements so base config stays lean.
- **Refined installer assets** — DMG background, NSIS header / sidebar regenerated from SVG sources.
- **Pre-push hook** — husky gates every push with typecheck + lint + format before the network leaves your machine.

## Known limitations

- GitLab and Bitbucket providers still return "not yet implemented" — arriving in a later release.
- Auth is PAT-only; OAuth is scaffolded but not user-facing yet.
- Installers remain **unsigned** — macOS Gatekeeper / Windows SmartScreen will warn on first launch. Verify via the `SHA256SUMS.txt` above.
- `RepoWatcher` is wired on the Rust side but not yet hooked into the runtime — repo status refreshes on explicit reload.
- Activity cards currently read from local git only; PR / CI metrics populate once a provider token is connected.

## Why unsigned?

Recrest is an open-source project without a paid code-signing cert. Apple Developer ID runs at $99/year, Windows EV certs start around $300/year. Installers are built straight from this tag by GitHub Actions — the build log is public, and the checksums above let you verify what you ran matches what was built.

## Feedback

Bugs → [issues](https://github.com/SoftVentures/Recrest/issues/new/choose). Ideas → [discussions](https://github.com/SoftVentures/Recrest/discussions). Patches → [pull requests](https://github.com/SoftVentures/Recrest/pulls).

See the full [CHANGELOG](./CHANGELOG.md) for version history.
