import { useEffect } from "react";

import { useParams } from "react-router-dom";

import { RepoListSkeleton } from "@/components/molecules/skeletons/RepoListSkeleton";
import { RepoList } from "@/components/organisms/repos/RepoList";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedRepo } from "@/store/slices/uiSlice";

interface ReposPageProps {
  dirtyOnly?: boolean;
}

export function ReposPage({ dirtyOnly = false }: ReposPageProps) {
  const dispatch = useAppDispatch();
  const repos = useEnrichedRepos();
  const loading = useAppSelector((s) => s.repos.loading);
  const error = useAppSelector((s) => s.repos.error);
  const { repoId } = useParams<{ repoId?: string }>();

  useEffect(() => {
    if (repoId) dispatch(setSelectedRepo(repoId));
  }, [dispatch, repoId]);

  const filtered = dirtyOnly ? repos.filter((r) => r.status.dirty) : repos;

  const pageTestId = dirtyOnly ? "changes-page" : "repos-page";

  if (loading && repos.length === 0) {
    return (
      <div data-testid={pageTestId}>
        <RepoListSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div data-testid={pageTestId}>
      {error && (
        <div
          role="alert"
          data-testid="repos-page-error"
          className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </div>
      )}
      <RepoList repos={filtered} grouped />
    </div>
  );
}
