import { useEffect } from "react";

import { DetailPane } from "@/components/layout/DetailPane";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useRepos } from "@/hooks/useRepos";
import { useThemeEffect } from "@/hooks/useTheme";

interface Props {
  repoId: string;
}

export function StandaloneDetailPage({ repoId }: Props) {
  useThemeEffect();
  useRepos();
  const enriched = useEnrichedRepos();
  const repo = enriched.find((r) => r.id === repoId);

  useEffect(() => {
    if (repo) document.title = `${repo.name} — Recrest`;
  }, [repo]);

  if (!repo) {
    return (
      <div className="a-standalone-detail">
        <div className="a-standalone-empty">Loading repository…</div>
      </div>
    );
  }

  return (
    <div className="a-standalone-detail">
      <DetailPane
        repo={repo}
        onClose={() => window.close()}
        onPopOut={() => {
          /* already popped out */
        }}
      />
    </div>
  );
}
