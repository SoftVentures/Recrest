import type { CheckRunSummary, PrEvent, PullRequest, RecentCommit } from "@recrest/shared";
import { languageByExtension, languageByName } from "@recrest/shared";

import { ACTIVITY_DAYS, daysAgo } from "@/lib/activityStats";
import type { EnrichedRepo } from "@/lib/repoEnrich";

/** Opened / merged counts per day over the 14-day window. Index 0 = today. */
export interface VelocityDay {
  day: number;
  opened: number;
  merged: number;
}

export function computePrVelocity(events: readonly PrEvent[], today: Date): VelocityDay[] {
  const rows: VelocityDay[] = Array.from({ length: ACTIVITY_DAYS }, (_, i) => ({
    day: i,
    opened: 0,
    merged: 0,
  }));
  for (const e of events) {
    const d = daysAgo(e.timestamp, today);
    if (d < 0) continue;
    const row = rows[d];
    if (!row) continue;
    if (e.kind === "opened") row.opened += 1;
    else if (e.kind === "merged") row.merged += 1;
  }
  return rows;
}

/** Histogram of merge latency for every `merged` event in the window. Bucket
 *  boundaries match the UX: <1 h, <1 d, <3 d, ≥3 d. */
export interface MergeBucket {
  bucket: "<1h" | "<1d" | "<3d" | ">=3d";
  count: number;
}

export function computeTimeToMerge(events: readonly PrEvent[]): MergeBucket[] {
  const byNumber = new Map<string, { opened?: number; merged?: number }>();
  for (const e of events) {
    const key = `${e.repoId}#${e.number}`;
    const entry = byNumber.get(key) ?? {};
    const ts = new Date(e.timestamp).getTime();
    if (e.kind === "opened") entry.opened = ts;
    else if (e.kind === "merged") entry.merged = ts;
    byNumber.set(key, entry);
  }
  const buckets: MergeBucket[] = [
    { bucket: "<1h", count: 0 },
    { bucket: "<1d", count: 0 },
    { bucket: "<3d", count: 0 },
    { bucket: ">=3d", count: 0 },
  ];
  for (const { opened, merged } of byNumber.values()) {
    if (!opened || !merged || merged < opened) continue;
    const deltaH = (merged - opened) / 3_600_000;
    const idx = deltaH < 1 ? 0 : deltaH < 24 ? 1 : deltaH < 72 ? 2 : 3;
    const b = buckets[idx];
    if (b) b.count += 1;
  }
  return buckets;
}

export interface ReviewQueueEntry {
  repoId: string;
  repoName: string;
  number: number;
  title: string;
  author: string;
  url: string;
  openedAt: string;
  ageDays: number;
}

/** Five oldest open PRs across all repos, sorted oldest-first. */
export function computeReviewQueue(
  prsByRepo: Record<string, readonly PullRequest[]>,
  reposById: Map<string, EnrichedRepo>,
  now: Date = new Date(),
  limit = 5,
): ReviewQueueEntry[] {
  const out: ReviewQueueEntry[] = [];
  for (const [repoId, prs] of Object.entries(prsByRepo)) {
    const repoName = reposById.get(repoId)?.name ?? repoId;
    for (const pr of prs) {
      if (pr.state !== "open") continue;
      const openedAtMs = new Date(pr.createdAt).getTime();
      const ageDays = Math.max(0, (now.getTime() - openedAtMs) / 86_400_000);
      out.push({
        repoId,
        repoName,
        number: pr.number,
        title: pr.title,
        author: pr.author,
        url: pr.url,
        openedAt: pr.createdAt,
        ageDays,
      });
    }
  }
  out.sort((a, b) => b.ageDays - a.ageDays);
  return out.slice(0, limit);
}

export interface PassRateDay {
  day: number;
  passed: number;
  total: number;
  rate: number;
}

export function computeCiPassRate(
  summaries: readonly CheckRunSummary[],
  today: Date,
): PassRateDay[] {
  const rows: PassRateDay[] = Array.from({ length: ACTIVITY_DAYS }, (_, i) => ({
    day: i,
    passed: 0,
    total: 0,
    rate: 1,
  }));
  for (const s of summaries) {
    const d = daysAgo(`${s.day}T12:00:00Z`, today);
    if (d < 0) continue;
    const row = rows[d];
    if (!row) continue;
    row.passed += s.passed;
    row.total += s.total;
  }
  for (const r of rows) r.rate = r.total === 0 ? 1 : r.passed / r.total;
  return rows;
}

export interface FlakyRepo {
  repoId: string;
  repoName: string;
  failRate: number;
  failed: number;
  total: number;
}

export function computeFlakyRepos(
  summaries: readonly CheckRunSummary[],
  reposById: Map<string, EnrichedRepo>,
  limit = 3,
): FlakyRepo[] {
  const byRepo = new Map<string, { failed: number; total: number; repoName: string }>();
  for (const s of summaries) {
    const entry = byRepo.get(s.repoId) ?? {
      failed: 0,
      total: 0,
      repoName: reposById.get(s.repoId)?.name ?? s.repoName,
    };
    entry.failed += s.failed;
    entry.total += s.total;
    byRepo.set(s.repoId, entry);
  }
  const out: FlakyRepo[] = [];
  for (const [repoId, v] of byRepo) {
    if (v.total === 0) continue;
    out.push({
      repoId,
      repoName: v.repoName,
      failRate: v.failed / v.total,
      failed: v.failed,
      total: v.total,
    });
  }
  out.sort((a, b) => b.failRate - a.failRate || b.total - a.total);
  return out.slice(0, limit);
}

/** Weekday (0=Mon..6=Sun) × hour (0..23) commit counts. */
export type HeatmapMatrix = number[][];

export function computeHeatmap(commits: readonly RecentCommit[], today: Date): HeatmapMatrix {
  const matrix: HeatmapMatrix = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0),
  );
  for (const c of commits) {
    if (daysAgo(c.timestamp, today) < 0) continue;
    const dt = new Date(c.timestamp);
    // Convert JS `getDay()` (0=Sun..6=Sat) to Mon-first (0=Mon..6=Sun).
    const weekday = (dt.getDay() + 6) % 7;
    const hour = dt.getHours();
    const row = matrix[weekday];
    if (!row) continue;
    row[hour] = (row[hour] ?? 0) + 1;
  }
  return matrix;
}

/** Commits-by-hour distribution (length 24) for the radial author clock. */
export function computeAuthorClock(commits: readonly RecentCommit[]): number[] {
  const hours = Array.from({ length: 24 }, () => 0);
  for (const c of commits) {
    const h = new Date(c.timestamp).getHours();
    hours[h] = (hours[h] ?? 0) + 1;
  }
  return hours;
}

export interface LanguageSlice {
  language: string;
  color: string;
  share: number;
  commits: number;
}

/** Aliases + extension bucketing. GitHub reports dialects (TSX, JSX, SCSS) as
 *  separate languages, but for a top-level "language mix" chart we want users
 *  to see the umbrella — a TSX commit should count toward TypeScript.
 *  Extensions that aren't a real programming language (images, fonts, videos)
 *  also collapse into sensible meta buckets. */
const LANGUAGE_ALIASES: Record<string, string> = {
  TSX: "TypeScript",
  JSX: "JavaScript",
  "Objective-C++": "Objective-C",
  SCSS: "CSS",
  Sass: "CSS",
  Less: "CSS",
  Stylus: "CSS",
  PostCSS: "CSS",
  Blade: "PHP",
  MDX: "Markdown",
  reStructuredText: "Markdown",
};

/** Meta buckets for non-programming-language file extensions. The palette
 *  is hand-picked to stay distinct from linguist's language colors (mostly
 *  warm blues/indigos for languages) — meta buckets lean purple / amber /
 *  teal so they never collide visually with real languages. */
const META_BUCKETS: { name: string; color: string; match: RegExp }[] = [
  // Images + vector art + Apple icon bundles all roll up — users don't care
  // about the .svg vs .png distinction when reading a language mix chart.
  {
    name: "Images",
    color: "#a371f7",
    match: /^(png|jpe?g|gif|webp|bmp|ico|icns|tiff?|avif|heic|svg|ai|eps)$/i,
  },
  // PDFs are their own thing — docs/specs live here, not in Images.
  { name: "Documents", color: "#0ea5e9", match: /^(pdf|docx?|xlsx?|pptx?|rtf|odt|ods|odp)$/i },
  { name: "Fonts", color: "#f59e0b", match: /^(woff2?|ttf|otf|eot)$/i },
  {
    name: "Video / Audio",
    color: "#ef4444",
    match: /^(mp4|mov|webm|mp3|wav|ogg|flac|avi|mkv|m4a)$/i,
  },
  { name: "Archives", color: "#14b8a6", match: /^(zip|tar|gz|tgz|bz2|xz|7z|rar)$/i },
  // Lock files and lockfile-shaped JSONs (package-lock, yarn.lock, etc.).
  // These are auto-generated noise that would otherwise distort the mix.
  { name: "Other", color: "#8a8a9a", match: /^(lock|lockb|sum|snap|map)$/i },
];

/** File names (not extensions) that should collapse straight to "Other". */
const OTHER_NAMES = new Set([
  "lock",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
  "cargo.lock",
  "poetry.lock",
  "go.sum",
  "composer.lock",
  "gemfile.lock",
  ".ds_store",
]);

interface LangBucket {
  name: string;
  color: string;
}

function bucketize(key: string): LangBucket {
  const trimmed = key.trim();
  if (!trimmed || trimmed === "mixed") return { name: "Other", color: "#8a8a9a" };

  // Full filename matches (for Rust-reported keys like "pnpm-lock.yaml" or
  // "Cargo.lock") route to Other so generated lockfiles don't distort the
  // commit-weighted mix.
  const lower = trimmed.toLowerCase();
  if (OTHER_NAMES.has(lower)) return { name: "Other", color: "#8a8a9a" };

  // Fast-path: explicit alias table (TSX → TypeScript, SCSS → CSS, …).
  const alias = LANGUAGE_ALIASES[trimmed];
  if (alias) {
    const meta = languageByName(alias);
    return { name: alias, color: meta?.color ?? "#8a8a9a" };
  }

  // Meta buckets (images, fonts, videos). Work off the raw key because Rust
  // currently reports extensions, not linguist names.
  for (const meta of META_BUCKETS) {
    if (meta.match.test(trimmed)) return { name: meta.name, color: meta.color };
  }

  // Canonical linguist name lookup first — seed data uses these.
  const byName = languageByName(trimmed);
  if (byName) {
    const alias2 = LANGUAGE_ALIASES[byName.name];
    if (alias2) {
      const aliasMeta = languageByName(alias2);
      return { name: alias2, color: aliasMeta?.color ?? byName.color ?? "#8a8a9a" };
    }
    // Guarantee every language gets a visible color even when linguist has
    // no color entry — fall back to a stable hash-based swatch.
    return { name: byName.name, color: byName.color ?? stableColor(byName.name) };
  }

  // Extension lookup (Rust-side keys like "tsx", "rs", "md").
  const byExt = languageByExtension(trimmed);
  if (byExt) {
    const alias3 = LANGUAGE_ALIASES[byExt.name];
    if (alias3) {
      const aliasMeta = languageByName(alias3);
      return { name: alias3, color: aliasMeta?.color ?? byExt.color ?? "#8a8a9a" };
    }
    return { name: byExt.name, color: byExt.color ?? stableColor(byExt.name) };
  }

  return { name: trimmed, color: stableColor(trimmed) };
}

/** Deterministic 10-swatch palette for languages linguist doesn't color.
 *  Same hash technique we use for repo/author colors so a given language
 *  stays the same color across renders. */
const LANG_FALLBACK_PALETTE = [
  "#6366f1",
  "#0ea5e9",
  "#14b8a6",
  "#10b981",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#22d3ee",
] as const;

function stableColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return LANG_FALLBACK_PALETTE[Math.abs(h) % LANG_FALLBACK_PALETTE.length]!;
}

/** Language mix weighted by commit volume × per-repo language share. Each
 *  commit contributes its repo's language breakdown (matching GitHub's
 *  `/languages` endpoint), so the aggregate naturally surfaces the long tail
 *  of languages each repo touches instead of only the dominant one.
 *
 *  Repos without a `langShares` breakdown fall back to a single-bucket
 *  mapping onto their dominant `lang`; truly unknown commits go to "Other".
 *
 *  Dialects and asset extensions are collapsed into sensible buckets
 *  (TSX → TypeScript, png/jpg/gif → Images) so the chart matches what users
 *  intuitively see in their codebase rather than Linguist's fine-grained
 *  taxonomy. */
export function computeLanguageMix(
  commits: readonly RecentCommit[],
  reposById: Map<string, EnrichedRepo>,
): LanguageSlice[] {
  const byLang = new Map<string, { color: string; weight: number }>();
  const add = (rawKey: string, weight: number) => {
    const bucket = bucketize(rawKey);
    const existing = byLang.get(bucket.name);
    if (existing) existing.weight += weight;
    else byLang.set(bucket.name, { color: bucket.color, weight });
  };

  for (const c of commits) {
    const repo = reposById.get(c.repoId);
    const shares = repo?.langShares ?? {};
    const shareEntries = Object.entries(shares);
    if (shareEntries.length > 0) {
      for (const [lang, share] of shareEntries) add(lang, share);
    } else {
      const fallback = repo?.lang ?? "Other";
      add(fallback, 1);
    }
  }
  const total = [...byLang.values()].reduce((a, b) => a + b.weight, 0) || 1;
  const rows: LanguageSlice[] = [];
  for (const [language, { color, weight }] of byLang) {
    rows.push({
      language,
      color,
      share: weight / total,
      commits: Math.round(weight * 100) / 100,
    });
  }
  rows.sort((a, b) => b.share - a.share);
  return rows;
}

export interface ChurnRow {
  repoId: string;
  repoName: string;
  added: number;
  removed: number;
  total: number;
}

/** Top-N repos by working-tree churn (added + removed lines). Working-tree
 *  snapshot, not historical — matches the data available from EnrichedRepo. */
export function computeChurn(repos: readonly EnrichedRepo[], limit = 5): ChurnRow[] {
  const rows: ChurnRow[] = repos
    .map((r) => ({
      repoId: r.id,
      repoName: r.name,
      added: r.added,
      removed: r.removed,
      total: r.added + r.removed,
    }))
    .filter((r) => r.total > 0);
  rows.sort((a, b) => b.total - a.total);
  return rows.slice(0, limit);
}

const AUTHOR_PALETTE = [
  "#6366f1",
  "#0ea5e9",
  "#14b8a6",
  "#10b981",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#22d3ee",
] as const;

/** Stable author color — hashes into a curated palette so authors render
 *  cohesively instead of with an HSL rainbow. */
export function colorForAuthor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AUTHOR_PALETTE[Math.abs(h) % AUTHOR_PALETTE.length]!;
}
