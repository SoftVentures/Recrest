# Security Policy

## Supported versions

Only the latest minor release line of Recrest receives security updates.

| Version         | Supported |
| --------------- | --------- |
| `0.x` (current) | Yes       |
| older           | No        |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use one of the private channels below:

1. **GitHub Security Advisories** (preferred) — open a report at <https://github.com/SoftVentures/Recrest/security/advisories/new>. This keeps the conversation private and lets us coordinate a fix and disclosure.
2. **Email** — send details to **<softventures.orga+legal@gmail.com>**. A PGP key is available on request.

Please include as much of the following as you can:

- Affected version(s) and platform (Windows / macOS / Linux).
- A description of the issue and the potential impact.
- Step-by-step reproduction, ideally with a minimal proof of concept.
- Any suggested mitigation you have already identified.

## What to expect

- **Acknowledgement** within **5 working days** of receipt.
- An **initial assessment** (severity, plan) within **10 working days**.
- For **High / Critical** issues we aim for a fix and coordinated disclosure within **30 days**.
- Lower-severity issues are scheduled into the next regular release.

## Scope

Recrest is a desktop app that reads local git repositories and talks to third-party provider APIs (GitHub, GitLab, Bitbucket). In-scope reports include:

- Token or credential exfiltration via the frontend or IPC layer.
- Arbitrary command execution triggered by repository metadata.
- Path-traversal or sandbox escape through the scanner or config loader.
- Insecure handling of OAuth / PAT flows.
- Exposure of sensitive data through logs, telemetry, or error messages.

Out of scope:

- Vulnerabilities in upstream dependencies (report those to the upstream project and optionally Cc us).
- Issues that require physical access to an unlocked machine.
- Social-engineering attacks against maintainers.

## Safe harbor

We will not pursue legal action against good-faith researchers who:

- Make a reasonable effort to avoid privacy violations and data destruction.
- Give us a reasonable chance to address the issue before public disclosure.
- Do not exploit the issue beyond what is necessary to demonstrate it.

Thank you for helping keep Recrest and its users safe.
