import { useState } from "react";

import GeneralAvatar from "@/components/atoms/avatars/GeneralAvatar";
import { repoGradientStops } from "@/components/atoms/avatars/RepoAvatar/repoGradient";
import { useRepoLogo } from "@/hooks/useRepoLogo";

interface RepoLike {
  id: string;
  name: string;
  /** Auto-detected logo paths from the repo scanner — when present the avatar
   *  renders the actual image and falls back to the gradient on load error. */
  logoPath?: string | null;
  logoDarkPath?: string | null;
}

interface Props {
  repo: RepoLike;
  size?: number;
  radius?: number;
}

function RepoAvatar({ repo, size = 24, radius = 6 }: Props) {
  const [c1, c2] = repoGradientStops(repo.id || repo.name);
  const gradient = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
  const cleaned = repo.name.replace(/^[\W_]+/, "") || repo.name;
  const letter = cleaned.charAt(0).toUpperCase();
  const logoUri = useRepoLogo(repo.logoPath, repo.logoDarkPath);
  const [failed, setFailed] = useState(false);
  return (
    <GeneralAvatar
      size={size}
      radius={radius}
      gradient={gradient}
      letter={letter}
      label={repo.name}
      imageUrl={failed ? null : logoUri}
      onImageError={() => setFailed(true)}
    />
  );
}

export default RepoAvatar;
