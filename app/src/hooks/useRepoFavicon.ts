import { useEffect, useState } from "react";

import { useAppSelector } from "@/store/hooks";

/** L.1: best-effort favicon discovery for a repo's remote host so a
 *  brandless self-hosted GitLab / Bitbucket Server still gets a recognisable
 *  avatar. We only fetch when the user has opted in via
 *  `settings.privacy.fetchFavicons`; otherwise the network is never touched.
 *
 *  Strategy: try `/favicon.ico`, `/apple-touch-icon.png`, `/favicon.png` in
 *  order. First non-empty image-typed response wins. SVG bodies that contain
 *  a `<script` tag are rejected outright (PNG/SVG-bomb / XSS-via-img defence
 *  in case the data URL is later piped into innerHTML). Responses larger
 *  than 2 MB are also rejected. */
const MAX_BYTES = 2 * 1024 * 1024;
const PATHS = ["/favicon.ico", "/apple-touch-icon.png", "/favicon.png"];

const ALLOWED_PREFIXES = ["image/"];

interface CacheEntry {
  status: "pending" | "ok" | "fail";
  url: string | null;
  promise?: Promise<string | null>;
}

/** Module-level cache keyed by origin. Survives component unmounts so
 *  scrolling a long list back and forth doesn't refire fetches.
 *
 *  M2: capped at `CACHE_MAX` entries with insertion-order LRU eviction.
 *  `Map` preserves insertion order, so the oldest entry is always the
 *  first key from `cache.keys()`. We re-set on access to mark an entry
 *  as recently used, then drop the head when we overflow. */
const CACHE_MAX = 200;
const CACHE = new Map<string, CacheEntry>();

function cacheGet(origin: string): CacheEntry | undefined {
  const entry = CACHE.get(origin);
  if (entry) {
    // Mark as most-recently-used by reinserting (delete + set bumps to tail).
    CACHE.delete(origin);
    CACHE.set(origin, entry);
  }
  return entry;
}

function cacheSet(origin: string, entry: CacheEntry): void {
  if (CACHE.has(origin)) CACHE.delete(origin);
  CACHE.set(origin, entry);
  while (CACHE.size > CACHE_MAX) {
    const oldest = CACHE.keys().next().value;
    if (oldest === undefined) break;
    CACHE.delete(oldest);
  }
}

function originOf(remoteUrl: string | null | undefined): string | null {
  if (!remoteUrl) return null;
  try {
    // Normalise SCP-style git URLs (`git@github.com:org/repo.git`) into
    // something `URL` can parse. We only need scheme://host for the origin.
    const normalised = remoteUrl.startsWith("git@")
      ? `https://${remoteUrl.slice(4).replace(":", "/")}`
      : remoteUrl;
    const u = new URL(normalised);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

async function tryFetch(origin: string, path: string): Promise<string | null> {
  // `cache: "force-cache"` keeps repeated lookups for the same favicon out
  // of the network entirely after the first hit; `credentials: "omit"` so
  // we don't accidentally send cookies to a self-hosted git host.
  const res = await fetch(origin + path, {
    credentials: "omit",
    cache: "force-cache",
    redirect: "follow",
    referrerPolicy: "no-referrer",
  });
  if (!res.ok) return null;
  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  if (!ALLOWED_PREFIXES.some((p) => contentType.startsWith(p))) return null;
  const blob = await res.blob();
  if (blob.size === 0 || blob.size > MAX_BYTES) return null;
  if (contentType.startsWith("image/svg")) {
    // SVG can carry <script>; the data URL is fine inside <img> in most
    // browsers but we filter conservatively to avoid surprises if the URL
    // ever travels into innerHTML.
    const text = await blob.text();
    if (/<\s*script/i.test(text)) return null;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
  }
  return await blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const result = reader.result;
      resolve(typeof result === "string" ? result : null);
    };
    reader.readAsDataURL(blob);
  });
}

async function discover(origin: string): Promise<string | null> {
  for (const path of PATHS) {
    try {
      const url = await tryFetch(origin, path);
      if (url) return url;
    } catch {
      // network/CORS failure — try next path
    }
  }
  return null;
}

/** Returns the cached favicon data URL for the given remote URL or null
 *  while the lookup is pending / failed. Stable across renders thanks to
 *  the module-level cache. */
export function useRepoFavicon(remoteUrl: string | null | undefined): string | null {
  const enabled = useAppSelector((s) => s.settings.privacy.fetchFavicons);
  const origin = enabled ? originOf(remoteUrl) : null;
  const initial = origin ? (cacheGet(origin)?.url ?? null) : null;
  const [dataUrl, setDataUrl] = useState<string | null>(initial);

  useEffect(() => {
    if (!origin) {
      setDataUrl(null);
      return;
    }
    const existing = cacheGet(origin);
    if (existing?.status === "ok" || existing?.status === "fail") {
      setDataUrl(existing.url);
      return;
    }
    let cancelled = false;
    const promise =
      existing?.promise ??
      discover(origin).then((url) => {
        cacheSet(origin, { status: url ? "ok" : "fail", url });
        return url;
      });
    cacheSet(origin, { status: "pending", url: null, promise });
    void promise.then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [origin]);

  return dataUrl;
}
