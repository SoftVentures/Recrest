import { useEffect } from "react";

import { useParams } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { RepoList } from "@/components/repos/RepoList";
import { Spinner } from "@/components/ui/spinner";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedRepo } from "@/store/slices/uiSlice";

interface ReposPageProps {
  dirtyOnly?: boolean;
}

export function ReposPage({ dirtyOnly = false }: ReposPageProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const repos = useEnrichedRepos();
  const loading = useAppSelector((s) => s.repos.loading);
  const error = useAppSelector((s) => s.repos.error);
  const { repoId } = useParams<{ repoId?: string }>();

  useEffect(() => {
    if (repoId) dispatch(setSelectedRepo(repoId));
  }, [dispatch, repoId]);

  const filtered = dirtyOnly ? repos.filter((r) => r.status.dirty) : repos;

  if (loading && repos.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
        <Spinner size="sm" />
        {t("states.loading", { ns: "common" })}
      </div>
    );
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </div>
      )}
      <RepoList repos={filtered} grouped />
    </>
  );
}
