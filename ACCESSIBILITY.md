# Accessibility

Recrest is committed to being usable by everyone, regardless of ability.
This document describes the project's conformance target, how we verify it,
and how to report issues.

## Target conformance

- **Standard:** [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/TR/WCAG21/)
- **Level:** AA
- **Scope:** the Recrest landing page (`landingpage/`) and the Recrest
  desktop application (`app/`), both in their current released version.

We aim for compliance with the German Accessibility Strengthening Act
(Barrierefreiheitsstärkungsgesetz — BFSG, in force since 28 June 2025) and
with the referenced WCAG 2.1 AA success criteria.

## How we verify

Accessibility is validated on every commit through:

| Tool                                                                | Coverage                                                                                                                                 |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm) | Automated Axe scans over every landing section and every app route, light + dark theme, against WCAG 2.0 A/AA and WCAG 2.1 AA rule sets. |
| [Playwright E2E suite](./tests/)                                    | Keyboard navigation, focus management, role/label assertions, skip-link and language-switching flows.                                    |
| Manual review                                                       | Screen reader smoke tests (VoiceOver / NVDA), visible-focus, reduced-motion, zoom 200 %.                                                 |

Current suite status (see [`docs/UNFINISHED.md`](./docs/UNFINISHED.md) for
the full board): **zero** violations of impact `critical`, `serious` or
`moderate` on Landing and App, light and dark, including
`color-contrast`. Color tokens (`--ink-3`, `--ink-4`, `--green`, `--red`,
`--amber`) are tuned to meet the WCAG AA 4.5 : 1 contrast ratio for normal
body text.

Dedicated specs:

- `tests/src/e2e/landing/11-a11y.spec.ts`
- `tests/src/e2e/app/13-a11y.spec.ts`

## Known limitations

We are not aware of any content that fails WCAG 2.1 AA at this time.
Scroll-based animations on the landing page and some decorative icon
motion in the desktop app automatically pause when the operating system
reports `prefers-reduced-motion: reduce`.

## Feedback

If you encounter an accessibility barrier anywhere in Recrest — on the
website or inside the desktop app — please let us know:

- Open an issue at <https://github.com/SoftVentures/Recrest/issues> with
  the label `a11y`, or
- Email the maintainers at the address listed in the imprint on the
  landing page.

We will confirm receipt promptly and aim to provide a fix or a written
response within a reasonable period.

## Enforcement procedure

If you are not satisfied with our response, you may contact the
**Schlichtungsstelle nach dem Behindertengleichstellungsgesetz** at
<https://www.schlichtungsstelle-bgg.de/>.

For matters falling under the BFSG specifically, the competent
**market-surveillance authority** of your federal state is the
responsible enforcement body.
