import { type CSSProperties, useEffect, useState } from "react";

import { gravatarUrl } from "@/lib/gravatar";
import { initialsFromName } from "@/lib/initials";

interface AuthorAvatarProps {
  name: string | null | undefined;
  size?: number;
  /** Explicit image URL. Wins over the `email` fallback below. */
  src?: string | null;
  /** Commit / PR author email. When provided (and `src` isn't), we derive a
   *  Gravatar URL from its md5 so the avatar matches what VSCode / GitLens
   *  renders for the same commit. A 404 from Gravatar falls back to the
   *  coloured-initials chip — no broken-image placeholder ever ships. */
  email?: string | null;
  className?: string;
}

/** Small round avatar — explicit src → Gravatar-from-email → coloured
 *  initials chip. The image is always rendered **inside a fixed-size circular
 *  mask** with `object-fit: cover`, so a 2x Gravatar (which comes back as a
 *  larger-than-container bitmap to stay crisp on HiDPI displays) is cleanly
 *  cropped to the circle instead of stretching the layout or bleeding past
 *  the chip edge. The initials chip sits underneath so a slow image never
 *  leaves a blank hole and a 404 falls back cleanly via `onError`. */
export function AuthorAvatar({ name, size = 24, src, email, className }: AuthorAvatarProps) {
  const label = initialsFromName(name) || "?";
  // Bot accounts (Dependabot, Renovate, GitHub Actions, etc.) rarely have a
  // real Gravatar; their commits and MRs all share one canonical GitHub
  // avatar. Match by substring on the author name or email so a commit
  // signed as "dependabot[bot]" or a PR fetched before `authorAvatarUrl`
  // existed still picks up the right face.
  const botSrc = src ?? resolveBotAvatar(name, email, size);
  // Skip the Gravatar round-trip for the well-known dev-seed domains —
  // they always 404 (because `?d=404` is the explicit fallback signal),
  // which fills the console with noise during `yarn dev:web` and Playwright
  // smoke runs. Falling straight through to the coloured initials chip
  // matches what the user sees once the request has failed anyway.
  const skipGravatar = !!email && isDevSeedEmail(email);
  const resolvedSrc = botSrc ?? (email && !skipGravatar ? gravatarUrl(email, size) : null);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    // Reset the failure flag whenever the underlying URL changes — otherwise
    // a failed Gravatar for author A would permanently suppress a successful
    // one for author B reusing the same component slot.
    setImgFailed(false);
  }, [resolvedSrc]);

  const chipStyle: CSSProperties = {
    // Explicit min/max so a flex parent (e.g. the MR drawer) can't squish or
    // stretch the chip off its square footprint — which is what made the
    // Gravatar "slightly scaled" look bad.
    width: size,
    minWidth: size,
    maxWidth: size,
    height: size,
    minHeight: size,
    maxHeight: size,
    borderRadius: "50%",
    background: gradientFor(name ?? ""),
    color: "#fff",
    fontSize: Math.max(9, Math.round(size * 0.4)),
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
    letterSpacing: 0,
    position: "relative",
    // Keep images from inheriting global Tailwind preflight img styles like
    // `max-width: 100%` that could leak into the absolutely-positioned img
    // inside.
    boxSizing: "content-box",
  };

  if (!resolvedSrc || imgFailed) {
    return (
      <span className={className} style={chipStyle} aria-label={name ?? "unknown"}>
        {label}
      </span>
    );
  }

  return (
    <span className={className} style={chipStyle} aria-label={name ?? "unknown"}>
      {label}
      <img
        src={resolvedSrc}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        style={{
          // Filling the circular mask — width/height 100% to the chip, plus
          // `object-fit: cover` so Gravatar's 2x bitmap is cropped not
          // squeezed. `display: block` avoids the tiny inline-descent gap
          // that Tailwind's preflight otherwise leaves under <img>.
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "cover",
          borderRadius: "50%",
          background: "transparent",
          maxWidth: "none",
          margin: 0,
          padding: 0,
        }}
      />
    </span>
  );
}

/** Email domains used by the dev-mode seed (and the Playwright fixture seed).
 *  These addresses don't map to real Gravatars, so issuing the request just
 *  produces `404` log noise — the cheap avoid-it-up-front check below saves
 *  a few network round-trips per page load. */
const DEV_SEED_EMAIL_DOMAINS = ["@example.com", "@renovateapp.com"] as const;

function isDevSeedEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return DEV_SEED_EMAIL_DOMAINS.some((d) => lower.endsWith(d));
}

/** Map a display name or commit-email to the canonical GitHub avatar URL
 *  for well-known bots. Returns null for anything we don't recognise so the
 *  caller can fall back to Gravatar-by-email. We query GitHub's
 *  `/u/:login.png?size=N` endpoint because it handles both App accounts
 *  (dependabot, renovate) and regular bot users uniformly, and it serves an
 *  appropriately-sized asset without needing the GitHub API. */
function resolveBotAvatar(
  name: string | null | undefined,
  email: string | null | undefined,
  size: number,
): string | null {
  const sniff = ((name ?? "") + " " + (email ?? "")).toLowerCase();
  // Retina boost: pull a 2x bitmap so the circular mask (object-fit: cover)
  // stays crisp on HiDPI displays, mirroring what AuthorAvatar does for
  // Gravatar URLs.
  const px = Math.max(32, size * 2);
  if (sniff.includes("dependabot")) {
    return `https://github.com/dependabot.png?size=${px}`;
  }
  if (sniff.includes("renovate")) {
    return `https://github.com/renovate-bot.png?size=${px}`;
  }
  if (sniff.includes("github-actions") || sniff.includes("github actions")) {
    return `https://github.com/github-actions.png?size=${px}`;
  }
  return null;
}

/** Color stops for the default avatars. Direction is applied separately so
 *  it can be rotated deterministically from the hash — two avatars with
 *  different keys but the same color slot still feel distinct. */
const GRADIENT_STOPS = [
  "#ff7a59,#d6336c",
  "#4f8cff,#7b2ff7",
  "#10b981,#0ea5a3",
  "#f59e0b,#ef4444",
  "#06b6d4,#3b82f6",
  "#a855f7,#ec4899",
  "#84cc16,#10b981",
  "#f97316,#eab308",
];

/** Plan 1 §B.2: cycle four gradient directions so the corner-bright pattern
 *  isn't always top-left. Using the cardinal diagonals only (no top/bottom
 *  axis) keeps the visual weight balanced regardless of which slot is
 *  picked. */
const GRADIENT_DIRECTIONS = ["135deg", "45deg", "225deg", "315deg"];

function gradientFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  const abs = Math.abs(hash);
  const stops = GRADIENT_STOPS[abs % GRADIENT_STOPS.length] ?? GRADIENT_STOPS[0]!;
  // Bit-shift so direction and color don't share the same low bits, keeping
  // their distributions independent.
  const dir =
    GRADIENT_DIRECTIONS[(abs >>> 3) % GRADIENT_DIRECTIONS.length] ?? GRADIENT_DIRECTIONS[0]!;
  return `linear-gradient(${dir},${stops})`;
}
