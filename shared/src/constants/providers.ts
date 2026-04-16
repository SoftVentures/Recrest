export const PROVIDER_IDS = ["github", "gitlab", "bitbucket"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const PROVIDER_NAMES: Record<ProviderId, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket",
};

export const PROVIDER_API_URLS: Record<ProviderId, string> = {
  github: "https://api.github.com",
  gitlab: "https://gitlab.com/api/v4",
  bitbucket: "https://api.bitbucket.org/2.0",
};

export const PROVIDER_WEB_URLS: Record<ProviderId, string> = {
  github: "https://github.com",
  gitlab: "https://gitlab.com",
  bitbucket: "https://bitbucket.org",
};

/** OAuth scopes requested per provider. Kept in sync with backend auth flows. */
export const PROVIDER_OAUTH_SCOPES: Record<ProviderId, string[]> = {
  github: ["repo", "read:user"],
  gitlab: ["read_api", "read_user", "read_repository"],
  bitbucket: ["account", "repository", "pullrequest"],
};
