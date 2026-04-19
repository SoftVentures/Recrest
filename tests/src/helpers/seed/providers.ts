import {
  PROVIDER_API_URLS,
  PROVIDER_NAMES,
  type ProviderConnection,
  type ProviderId,
} from "@recrest/shared";

/**
 * Default seed: GitHub is connected (the majority of our repos), GitLab is
 * connected with a self-hosted base URL but no token yet, Bitbucket is idle.
 * Gives each UI branch something to render.
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
