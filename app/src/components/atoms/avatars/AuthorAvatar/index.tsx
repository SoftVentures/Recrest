import { useEffect, useState } from "react";

import { Bot } from "lucide-react";

import GeneralAvatar from "@/components/atoms/avatars/GeneralAvatar";
import { isBotAuthor } from "@/lib/utils/bot.utils";
import { gravatarHash, gravatarUrl } from "@/lib/utils/gravatar.utils";
import { hashCode } from "@/lib/utils/hash.utils";

const AUTHOR_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ["#4f8cff", "#7b2ff7"],
  ["#10b981", "#0ea5a3"],
  ["#ff7a59", "#d6336c"],
  ["#f59e0b", "#ef4444"],
  ["#06b6d4", "#3b82f6"],
  ["#ec4899", "#8b5cf6"],
  ["#22c55e", "#14b8a6"],
  ["#a855f7", "#ec4899"],
  ["#0ea5e9", "#14b8a6"],
  ["#7c3aed", "#2563eb"],
  ["#f97316", "#eab308"],
  ["#6366f1", "#06b6d4"],
];

// Distinct, deliberately desaturated tone so bots don't blend into the
// twelve coloured human gradients above. Same shape for every bot — the icon
// (not the colour) does the identification.
const BOT_GRADIENT: readonly [string, string] = ["#475569", "#64748b"];

function gradientForAuthor(id: string): readonly [string, string] {
  const idx = hashCode(id.toLowerCase()) % AUTHOR_GRADIENTS.length;
  return AUTHOR_GRADIENTS[idx] ?? AUTHOR_GRADIENTS[0]!;
}

interface Props {
  name: string;
  email?: string;
  /** Provider-supplied avatar URL (GitHub/GitLab/Bitbucket). When set this
   *  takes precedence over Gravatar — no API call needed. */
  avatarUrl?: string | null;
  size?: number;
}

function AuthorAvatar({ name, email, avatarUrl, size = 24 }: Props) {
  const id = (email || name).trim();
  const bot = isBotAuthor(name);
  const [c1, c2] = bot ? BOT_GRADIENT : gradientForAuthor(id);
  const gradient = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
  const letter = (name.trim().charAt(0) || "?").toUpperCase();

  // Provider-URL → state so an onError can null it out and fall through to
  // the Gravatar / gradient paths below without losing the original prop.
  const [providerUrl, setProviderUrl] = useState<string | null>(avatarUrl ?? null);
  useEffect(() => {
    setProviderUrl(avatarUrl ?? null);
  }, [avatarUrl]);

  const [gravatarSrc, setGravatarSrc] = useState<string | null>(null);
  const [gravatarFailed, setGravatarFailed] = useState(false);

  useEffect(() => {
    // Skip Gravatar entirely when the provider already gave us an avatar,
    // when the author is a bot, or when we have no email to hash.
    if (providerUrl || bot || !email || gravatarFailed) {
      setGravatarSrc(null);
      return;
    }
    let alive = true;
    void gravatarHash(email).then((h) => {
      if (alive) setGravatarSrc(gravatarUrl(h, size));
    });
    return () => {
      alive = false;
    };
  }, [providerUrl, bot, email, size, gravatarFailed]);

  const imageUrl = providerUrl ?? gravatarSrc;

  return (
    <GeneralAvatar
      size={size}
      radius={size / 2}
      gradient={gradient}
      letter={letter}
      label={name}
      imageUrl={imageUrl}
      glyph={bot ? <Bot size={Math.round(size * 0.6)} aria-hidden /> : undefined}
      onImageError={() => {
        if (providerUrl) setProviderUrl(null);
        else setGravatarFailed(true);
      }}
    />
  );
}

export default AuthorAvatar;
