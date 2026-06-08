import {
  Bot,
  Bug,
  CheckCheck,
  GitMerge,
  GitPullRequest,
  Image,
  Package,
  RefreshCw,
  ShieldCheck,
  Umbrella,
  Users,
  Workflow,
} from "lucide-react";

import type { BotId } from "@/lib/utils/bot.utils";

interface Props {
  /** Recognised bot id, or `null` for a generic `[bot]` account. */
  id: BotId | null;
  size?: number;
}

/** The canonical multi-colour Figma mark — Figma is named explicitly, so it
 *  gets its real logo rather than a stand-in icon. */
function FigmaGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 57" aria-hidden role="img">
      <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE" />
      <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" fill="#0ACF83" />
      <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" fill="#FF7262" />
      <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E" />
      <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF" />
    </svg>
  );
}

/** A distinct, semantically-fitting glyph per known bot so each reads as its
 *  own automation rather than one anonymous robot. Brand colour is applied to
 *  the avatar background by `AuthorAvatar`; these draw in the glyph's
 *  (white/contrast) ink via `currentColor`. */
const GLYPH_BY_BOT: Record<Exclude<BotId, "figma">, typeof Bot> = {
  dependabot: Package,
  renovate: RefreshCw,
  "github-actions": Workflow,
  mergify: GitMerge,
  snyk: ShieldCheck,
  codecov: Umbrella,
  imgbot: Image,
  "pre-commit-ci": CheckCheck,
  kodiak: GitPullRequest,
  allcontributors: Users,
  sentry: Bug,
};

function BotIcon({ id, size = 14 }: Props) {
  if (id === "figma") return <FigmaGlyph size={size} />;
  const Glyph = id ? GLYPH_BY_BOT[id] : Bot;
  return <Glyph size={size} aria-hidden />;
}

export default BotIcon;
