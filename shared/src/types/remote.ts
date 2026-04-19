import type { ProviderId } from "../constants/providers.js";

/** A remote repository listed via one of the provider APIs. Used by the
 *  "Import from providers" flow to pick what to clone locally. */
export interface RemoteRepository {
  providerId: ProviderId;
  id: string;
  fullName: string;
  name: string;
  description: string | null;
  defaultBranch: string;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  cloneUrlHttps: string;
  cloneUrlSsh: string | null;
  htmlUrl: string;
  updatedAt: string | null;
  pushedAt: string | null;
  sizeKb: number | null;
  language: string | null;
  ownerLogin: string;
  ownerAvatarUrl: string | null;
}

export interface Organization {
  providerId: ProviderId;
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Response of `list_remote_repositories` — the list plus a map from
 *  `remoteRepo.id` to the local `repoId` for clones already on disk. The
 *  UI uses the map to dim already-cloned entries. */
export interface RemoteRepositoryList {
  repositories: RemoteRepository[];
  localMatches: Record<string, string>;
}

export interface CloneRemoteRequest {
  providerId: ProviderId;
  remoteRepoId: string;
  cloneUrl: string;
  destination: string;
  subFolder: string | null;
  useSsh: boolean;
  sshUrl: string | null;
}

export interface CloneRemoteOutcome {
  remoteRepoId: string;
  ok: boolean;
  error: string | null;
}

export type CloneProgressStage = "cloning" | "done" | "error";

export interface CloneProgressEvent {
  index: number;
  total: number;
  remoteRepoId: string;
  stage: CloneProgressStage;
  error?: string;
}
