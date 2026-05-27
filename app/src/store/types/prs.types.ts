import type { PrFilters, PullRequest, PullRequestDetail, RepositoryId } from "@recrest/shared";

export interface PrsState {
  items: Record<RepositoryId, PullRequest[]>;
  detail: Record<string, PullRequestDetail>;
  detailLoading: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: PrFilters;
}
