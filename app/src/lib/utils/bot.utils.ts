/**
 * Recognition of automated authors (GitHub Apps, CI bots, Renovate, Figma, …).
 *
 * Two goals:
 *  1. Tell humans from bots so the avatar can show a bot mark instead of
 *     hunting a Gravatar that will never exist.
 *  2. Identify *which* bot it is, so each well-known automation gets its own
 *     brand icon + colour (`BotIcon`) rather than one anonymous robot.
 *
 * Matching layers:
 *  - The `[bot]` suffix GitHub appends to every installed GitHub App
 *    (`dependabot[bot]`, `github-actions[bot]`, …) — caught both per-definition
 *    and by a generic fallback so the long tail still reads as a bot.
 *  - Per-bot regexes for the handful of well-known accounts (incl. the
 *    username-only ones like `renovate-bot` that carry no `[bot]` suffix).
 */

/** Stable id for a recognised bot — keys the `BotIcon` glyph + brand colour. */
export type BotId =
  | "figma"
  | "dependabot"
  | "renovate"
  | "github-actions"
  | "mergify"
  | "snyk"
  | "codecov"
  | "imgbot"
  | "pre-commit-ci"
  | "kodiak"
  | "allcontributors"
  | "sentry";

export interface BotDefinition {
  id: BotId;
  /** Matched against the bare handle (leading `@` and `[bot]` suffix stripped). */
  match: RegExp;
  /** Brand accent used as the avatar background tint. */
  color: string;
}

export const BOT_DEFINITIONS: readonly BotDefinition[] = [
  { id: "figma", match: /^figma(?:-bot)?$/i, color: "#a259ff" },
  { id: "dependabot", match: /^dependabot(?:-preview)?$/i, color: "#1f6feb" },
  { id: "renovate", match: /^renovate(?:-bot)?$/i, color: "#f76b15" },
  { id: "github-actions", match: /^github-actions$/i, color: "#2088ff" },
  { id: "mergify", match: /^mergify$/i, color: "#e0567c" },
  { id: "snyk", match: /^snyk(?:-bot)?$/i, color: "#4c4a73" },
  { id: "codecov", match: /^codecov(?:-commenter)?$/i, color: "#f01f7a" },
  { id: "imgbot", match: /^imgbot$/i, color: "#26c281" },
  { id: "pre-commit-ci", match: /^pre-commit-ci$/i, color: "#f8b500" },
  { id: "kodiak", match: /^kodiakhq$/i, color: "#1f8ceb" },
  { id: "allcontributors", match: /^allcontributors$/i, color: "#ff6b35" },
  { id: "sentry", match: /^sentry(?:-io)?$/i, color: "#362d59" },
];

/** Strip a leading `@` and the GitHub `[bot]` suffix → bare handle for matching. */
function bareHandle(name: string): string {
  const trimmed = name.trim();
  const noAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return noAt.replace(/\[bot\]$/i, "");
}

/** The specific bot definition for `name`, or `null` if it isn't a *known*
 *  bot (it may still be a generic `[bot]` — see `isBotAuthor`). */
export function identifyBot(name: string | null | undefined): BotDefinition | null {
  if (!name) return null;
  const handle = bareHandle(name);
  if (!handle) return null;
  return BOT_DEFINITIONS.find((b) => b.match.test(handle)) ?? null;
}

/** Whether `name` is any automated author — a known bot or the generic GitHub
 *  App `[bot]` suffix. */
export function isBotAuthor(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  const handle = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  if (/\[bot\]$/i.test(handle)) return true;
  return identifyBot(name) !== null;
}
