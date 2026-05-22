import type {
  CloneProgressStage,
  Organization,
  ProviderId,
  RemoteRepository,
} from "@recrest/shared";

export interface CachedListing {
  repositories: RemoteRepository[];
  localMatches: Record<string, string>;
  loadedAt: number;
}

export interface RemoteImportState {
  /** Keyed by `${providerId}::${orgSlugOrUser}`. user = "__self__". */
  listings: Record<string, CachedListing>;
  organizations: Partial<Record<ProviderId, Organization[]>>;
  loading: Record<string, boolean>;
  error: string | null;
  /** Live progress per bulk-clone operation. Keyed by `remoteRepo.id`. */
  cloneProgress: Record<string, { stage: CloneProgressStage; error?: string }>;
}

export const SELF_KEY = "__self__";

export const keyFor = (providerId: ProviderId, orgSlug: string | null): string =>
  `${providerId}::${orgSlug ?? SELF_KEY}`;
