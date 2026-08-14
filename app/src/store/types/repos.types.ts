import type { Repository, RepositoryGroup, RepositoryId } from "@recrest/shared";

import type { SaveSeqTracked } from "@/store/reducers/saveSettingsSeq";

export interface ReposState extends SaveSeqTracked {
  items: Record<RepositoryId, Repository>;
  groups: Record<string, RepositoryGroup>;
  scanPaths: string[];
  loading: boolean;
  error: string | null;
}
