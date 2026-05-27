import type { Repository, RepositoryGroup, RepositoryId } from "@recrest/shared";

export interface ReposState {
  items: Record<RepositoryId, Repository>;
  groups: Record<string, RepositoryGroup>;
  scanPaths: string[];
  loading: boolean;
  error: string | null;
}
