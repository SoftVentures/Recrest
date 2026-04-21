import { useEffect, useState } from "react";

import { WindowEvent, storageKeyForLogo } from "@recrest/shared";

import { BrandIcon, type BrandSlug } from "@/components/atoms/BrandIcon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";
import { useRepoLogo } from "@/hooks/useRepoLogo";

/** Curated, hand-picked two-stop gradients for repo avatars. Each pair is
 *  tuned for contrast with white text and reasonable harmony. Order matters:
 *  the first assignment comes first, so the prettiest ones go early. */
const AVATAR_GRADIENTS: Array<[string, string]> = [
  ["#ff7a59", "#d6336c"],
  ["#4f8cff", "#7b2ff7"],
  ["#10b981", "#0ea5a3"],
  ["#f59e0b", "#ef4444"],
  ["#ec4899", "#8b5cf6"],
  ["#06b6d4", "#3b82f6"],
  ["#22c55e", "#14b8a6"],
  ["#f97316", "#eab308"],
  ["#a855f7", "#ec4899"],
  ["#0ea5e9", "#14b8a6"],
  ["#e11d48", "#f97316"],
  ["#6366f1", "#06b6d4"],
  ["#84cc16", "#10b981"],
  ["#d946ef", "#6366f1"],
  ["#f43f5e", "#a855f7"],
  ["#059669", "#0284c7"],
  ["#fb7185", "#fbbf24"],
  ["#7c3aed", "#2563eb"],
  ["#16a34a", "#65a30d"],
  ["#be185d", "#4c1d95"],
  ["#0891b2", "#4338ca"],
  ["#ea580c", "#b91c1c"],
  ["#15803d", "#0d9488"],
  ["#9333ea", "#db2777"],
];

/** Assigns each repo id the next unused gradient slot, so no two repos share
 *  a gradient as long as we stay under AVATAR_GRADIENTS.length. Persists for
 *  the lifetime of the window; on reload the assignment order can differ but
 *  within one session every repo keeps its slot. */
const GRADIENT_ASSIGNMENTS = new Map<string, number>();
let nextGradientSlot = 0;

function gradientForRepo(id: string): [string, string] {
  let slot = GRADIENT_ASSIGNMENTS.get(id);
  if (slot == null) {
    slot = nextGradientSlot++;
    GRADIENT_ASSIGNMENTS.set(id, slot);
  }
  const idx = slot % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx] ?? AVATAR_GRADIENTS[0]!;
}

interface RepoLike {
  id: string;
  name: string;
  /** Auto-detected logo paths from Rust. Optional so the avatar still works
   *  for repo-like objects that don't carry the full Repository DTO. */
  logoPath?: string | null;
  logoDarkPath?: string | null;
}

interface RepoAvatarProps {
  repo: RepoLike;
  size?: number;
  radius?: number;
}

function readStored(id: string): string | null {
  try {
    return localStorage.getItem(storageKeyForLogo(id));
  } catch {
    return null;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function setRepoLogo(repoId: string, dataUrl: string | null): void {
  try {
    if (dataUrl) localStorage.setItem(storageKeyForLogo(repoId), dataUrl);
    else localStorage.removeItem(storageKeyForLogo(repoId));
  } catch {
    // Storage may be disabled — ignore; the in-memory value still works for
    // the current session once the event listeners fire.
  }
  window.dispatchEvent(
    new CustomEvent(WindowEvent.LOGO_UPDATED, { detail: { repoId, value: dataUrl } }),
  );
}

export function RepoAvatar({ repo, size = 24, radius = 6 }: RepoAvatarProps) {
  const [custom, setCustom] = useState<string | null>(() => readStored(repo.id));
  const autoLogo = useRepoLogo({
    logoPath: repo.logoPath ?? null,
    logoDarkPath: repo.logoDarkPath ?? null,
  });

  useEffect(() => {
    setCustom(readStored(repo.id));
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKeyForLogo(repo.id)) setCustom(e.newValue);
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ repoId: string; value: string | null }>).detail;
      if (detail.repoId === repo.id) setCustom(detail.value);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(WindowEvent.LOGO_UPDATED, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(WindowEvent.LOGO_UPDATED, onCustom);
    };
  }, [repo.id]);

  // Priority ladder: user-uploaded override > repo-detected logo > letter tile.
  const src = custom ?? autoLogo;
  if (src) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="repo-avatar"
            style={{
              width: size,
              height: size,
              borderRadius: radius,
              overflow: "hidden",
              flexShrink: 0,
              background: "var(--surface-2)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: custom ? 0 : Math.max(1, Math.round(size * 0.08)),
            }}
            aria-label={repo.name}
            data-testid="repo-avatar"
          >
            <img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                // `custom` uploads are cropped to fill (keeps the old behaviour).
                // Auto-detected logos use `contain` so wordmarks / tall icons stay
                // readable, with a small surface-2 tile as padding.
                objectFit: custom ? "cover" : "contain",
                display: "block",
              }}
              alt=""
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>{repo.name}</TooltipContent>
      </Tooltip>
    );
  }

  const [c1, c2] = gradientForRepo(repo.id || repo.name);
  const gradient = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;

  const specialIcon = detectSpecialIcon(repo.name);
  if (specialIcon) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="repo-avatar"
            style={{
              width: size,
              height: size,
              borderRadius: radius,
              background: gradient,
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
            aria-label={repo.name}
            data-testid="repo-avatar"
          >
            <BrandIcon slug={specialIcon} size={Math.round(size * 0.55)} color="#fff" />
          </div>
        </TooltipTrigger>
        <TooltipContent>{repo.name}</TooltipContent>
      </Tooltip>
    );
  }

  const cleaned = repo.name.replace(/^[\W_]+/, "") || repo.name;
  const letter = cleaned.charAt(0).toUpperCase();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="repo-avatar"
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            background: gradient,
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.round(size * 0.5),
            fontWeight: 700,
            letterSpacing: "-0.02em",
            flexShrink: 0,
            fontFamily: "Inter, -apple-system, sans-serif",
            textShadow: "0 1px 2px rgba(0,0,0,0.18)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
          aria-label={repo.name}
          data-testid="repo-avatar"
        >
          {letter}
        </div>
      </TooltipTrigger>
      <TooltipContent>{repo.name}</TooltipContent>
    </Tooltip>
  );
}

function detectSpecialIcon(name: string): BrandSlug | null {
  const normalized = name.toLowerCase().replace(/[.\s_-]/g, "");
  if (normalized === "github" || normalized === "githubprivate") return "github";
  if (normalized === "gitlab") return "gitlab";
  if (normalized === "bitbucket") return "bitbucket";
  return null;
}
