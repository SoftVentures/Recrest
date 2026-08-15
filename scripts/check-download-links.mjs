#!/usr/bin/env node
/**
 * Guards the landing page's download buttons against pointing at a release that
 * is not published (yet).
 *
 * `landingpage/src/lib/downloadUrl.ts` builds
 * `<repo>/releases/latest/download/recrest-v<version>-<platform>.<ext>`, where
 * `<version>` is the root package.json version frozen in at BUILD time by the
 * `__APP_VERSION__` define (`landingpage/vite.config.ts`). `/releases/latest/`
 * however resolves at CLICK time, against whatever release is published then —
 * drafts and prereleases excluded. The two agree only while the newest
 * published release is exactly `v<package.json version>`.
 *
 * release-please bumps that version in a commit of its own; the tag push then
 * produces a DRAFT release which a human publishes by hand. That bump commit
 * also matches `deploy-landingpage.yml`'s `package.json` / `app/**` triggers, so
 * the site is rebuilt inside that window — with all seven download buttons
 * pointing at a release nobody can see yet. Every one of them 404s, and nothing
 * says so: `tests/src/e2e/landing/05-download-button.spec.ts` compares the
 * rendered href against `EXPECTED_DOWNLOAD_ASSETS`, which is spelled from the
 * same version, so the spec stays green while the buttons are dead.
 *
 * This script is the half of that assertion the browser can never make: it asks
 * GitHub whether the files exist. It runs in CI only — a runtime lookup from the
 * visitor's browser would send every visitor's IP to GitHub, which is exactly
 * what `landingpage/index.html` promises does not happen.
 *
 * It checks three things:
 *   1. the two hard-coded asset catalogues agree — the one the page renders
 *      (`landingpage/src/lib/downloadUrl.ts`) and the one the E2E spec asserts
 *      (`tests/src/helpers/constants.ts`). The latter is duplicated on purpose;
 *      this is what keeps the duplication honest without importing one into the
 *      other.
 *   2. `/releases/latest` resolves to `v<version>` — the check the whole URL
 *      shape rests on.
 *   3. every filename the page links exists as an asset of that release.
 *
 * Wired into `deploy-landingpage.yml` ahead of the build, so a page that would
 * ship dead buttons is never uploaded and the previously deployed one — which
 * still points at the still-current release — stays live. Deliberately NOT part
 * of `ci.yml`: on a release PR the version is bumped before the release exists,
 * and a required gate that goes red on every release PR is the exact failure
 * mode the comment on `EXPECTED_APP_VERSION` argues against.
 *
 * Usage:
 *   node scripts/check-download-links.mjs                 check the published latest release
 *   node scripts/check-download-links.mjs --release=v1.2.3  check that release instead (e.g. a
 *                                                         draft, before publishing it)
 *   node scripts/check-download-links.mjs --version=1.2.3   pretend the page was built at this
 *                                                         version (failure-case drill)
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildDownloadUrl, getAssetsForOs } from "../landingpage/src/lib/downloadUrl.ts";
import {
  EXPECTED_APP_VERSION,
  EXPECTED_DOWNLOAD_ASSETS,
  REPO_URL,
} from "../tests/src/helpers/constants.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAG = "[check-download-links]";

/** Order is irrelevant to GitHub but not to the cross-check below: the E2E spec
 *  asserts the links in exactly this order, so the comparison keeps it. */
const PLATFORMS = ["macos", "windows", "linux"];

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3) || undefined;
};

function fail(message, hint) {
  console.error(`\n${TAG} FAIL: ${message}\n`);
  if (hint) console.error(`${hint}\n`);
  process.exit(1);
}

const rootVersion = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
const version = arg("version") ?? rootVersion;
const releaseRef = arg("release");

// 1 — the two catalogues must describe the same seven files. Compared with the
// version token folded out, so a `--version` drill doesn't read as a mismatch.
const normalise = (names, v) => names.map((n) => n.replace(`recrest-v${v}-`, "recrest-v<V>-"));
for (const os of PLATFORMS) {
  const fromPage = normalise(
    getAssetsForOs(os, version).map((a) => a.filename),
    version,
  );
  const fromSpec = normalise([...EXPECTED_DOWNLOAD_ASSETS[os]], EXPECTED_APP_VERSION);
  if (fromPage.join("\n") !== fromSpec.join("\n")) {
    fail(
      `the ${os} asset list of landingpage/src/lib/downloadUrl.ts and of ` +
        `tests/src/helpers/constants.ts disagree.\n` +
        `  page: ${fromPage.join(", ")}\n` +
        `  spec: ${fromSpec.join(", ")}`,
      "Both are hard-coded on purpose (see EXPECTED_DOWNLOAD_ASSETS). Fix whichever one is wrong —\n" +
        "do not make the spec import the page, that would compare the page against itself.",
    );
  }
}

const expected = PLATFORMS.flatMap((os) => getAssetsForOs(os, version).map((a) => a.filename));

// The `/releases/latest` assertion below is only meaningful for URLs that
// actually carry that path. If the shape ever changes, this guard must change
// with it rather than keep asserting something unrelated.
const sampleUrl = buildDownloadUrl(REPO_URL, expected[0]);
if (!sampleUrl.startsWith(`${REPO_URL}/releases/latest/download/`)) {
  fail(
    `buildDownloadUrl no longer produces a /releases/latest/download/ URL (got ${sampleUrl}).`,
    "This guard verifies that `latest` resolves to the built version; a different URL shape needs a\n" +
      "different check.",
  );
}

const slug = REPO_URL.replace(/^https:\/\/github\.com\//, "");

function githubToken() {
  const fromEnv = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (fromEnv) return fromEnv;
  // Local runs: reuse whatever `gh` is already authenticated with, so the
  // 60-requests-per-hour unauthenticated limit isn't hit from a shared IP.
  try {
    return execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

async function api(pathname) {
  const token = githubToken();
  const res = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "recrest-check-download-links",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) return { status: res.status };
  return { status: res.status, body: await res.json() };
}

const target = releaseRef
  ? `/repos/${slug}/releases/tags/${releaseRef}`
  : `/repos/${slug}/releases/latest`;
const { status, body: release } = await api(target);

if (status === 404) {
  fail(
    releaseRef
      ? `${slug} has no release tagged ${releaseRef}.`
      : `${slug} has no published release at all — every download button would 404.`,
  );
}
if (!release) {
  fail(`GitHub returned HTTP ${status} for ${target} — cannot verify the download links.`);
}

// 2 — `latest` must be the version this page was built from. Skipped when an
// explicit release was named: then the caller already decided what to check.
if (!releaseRef && release.tag_name !== `v${version}`) {
  fail(
    `the page would link recrest-v${version}-… but the latest published release of ${slug} is ` +
      `${release.tag_name}. All ${expected.length} download buttons would 404.`,
    "This is the release-please window: the version was bumped, but the draft release for it has not\n" +
      "been published yet. Publish the draft, then re-run this workflow (Actions → Deploy landingpage →\n" +
      "Run workflow). Until then the currently deployed page keeps linking the release that IS latest,\n" +
      "which is why this build must not replace it.",
  );
}

// 3 — and the files themselves have to be there. `windows-arm64` is optional
// for the RELEASE (the windows-11-arm runner's availability varies), but not
// here: the page renders a button for it either way, and a button that 404s is
// a broken page regardless of why the asset is missing.
const present = new Set((release.assets ?? []).map((a) => a.name));
const missing = expected.filter((name) => !present.has(name));
if (missing.length > 0) {
  fail(
    `${release.tag_name} is missing ${missing.length} of the ${expected.length} assets the download ` +
      `page links:\n  - ${missing.join("\n  - ")}`,
    "The download page renders a button per asset, so each missing file is a dead button. Re-run\n" +
      "`release-tauri.yml` for this tag (or attach the assets with `gh release upload`) before deploying.",
  );
}

for (const name of expected) console.log(`${TAG} ✓ ${name}`);
console.log(
  `${TAG} OK — ${release.tag_name}${releaseRef ? "" : " (latest)"} carries all ${expected.length} download-page assets.`,
);
