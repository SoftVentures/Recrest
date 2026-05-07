import {
  PROVIDER_API_URLS,
  PROVIDER_NAMES,
  type ProviderConnection,
  type ProviderId,
} from "@recrest/shared";

/**
 * Dev-stub provider connections, mirrored from
 * `tests/src/helpers/seed/providers.ts`. GitHub is connected (most repos),
 * GitLab has a base URL but no token, Bitbucket is idle.
 */
export const SEED_PROVIDERS: Partial<Record<ProviderId, ProviderConnection>> = {
  github: {
    providerId: "github",
    displayName: PROVIDER_NAMES.github,
    connected: true,
    username: "valentin",
    supportsOauth: true,
    baseUrl: PROVIDER_API_URLS.github,
  },
  gitlab: {
    providerId: "gitlab",
    displayName: PROVIDER_NAMES.gitlab,
    connected: false,
    username: null,
    supportsOauth: true,
    baseUrl: "https://gitlab.acme-labs.internal/api/v4",
  },
  bitbucket: {
    providerId: "bitbucket",
    displayName: PROVIDER_NAMES.bitbucket,
    connected: false,
    username: null,
    supportsOauth: false,
    baseUrl: PROVIDER_API_URLS.bitbucket,
  },
};
