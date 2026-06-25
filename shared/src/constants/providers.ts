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

/** Deep link to the token-creation page for each provider, pre-configured
 *  with Recrest's required scopes so the user only has to click "Generate"
 *  and copy the token back. Not OAuth, but close enough for a 1-click UX. */
export const PROVIDER_CREATE_TOKEN_URLS: Record<ProviderId, string> = {
  github: "https://github.com/settings/tokens/new?scopes=repo,read:user&description=Recrest",
  gitlab:
    "https://gitlab.com/-/user_settings/personal_access_tokens?name=Recrest&scopes=read_api,read_user,read_repository",
  bitbucket: "https://bitbucket.org/account/settings/app-passwords/new",
};

/**
 * Self-contained PAT bootstrapping info per provider — docs URL, a builder
 * for the create-token deep link with Recrest's required scopes prefilled,
 * the list of scopes, and a flag for whether the provider honours URL-level
 * scope hints (Bitbucket app passwords don't).
 *
 * Used by the shared `PatHelpPanel` molecule the onboarding wizard renders,
 * and by Settings → Accounts. Keeping this in `@recrest/shared` lets the
 * tests workspace inspect the same source of truth.
 */
export const PROVIDER_PAT_INFO = {
  github: {
    docsUrl:
      "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens",
    createUrl: (_baseUrl: string, scopes: readonly string[]) =>
      `https://github.com/settings/tokens/new?description=Recrest&scopes=${scopes.join(",")}`,
    requiredScopes: ["repo", "read:user", "read:org"] as const,
    supportsUrlScopes: true,
  },
  gitlab: {
    docsUrl: "https://docs.gitlab.com/user/profile/personal_access_tokens/",
    createUrl: (baseUrl: string, scopes: readonly string[]) => {
      // Callers pass the API URL (`https://gitlab.com/api/v4`) — the
      // token-creation page lives at the host root, so strip the API suffix
      // before assembling the deep link.
      const trimmed =
        baseUrl && baseUrl.trim().length > 0
          ? baseUrl.trim().replace(/\/$/, "")
          : "https://gitlab.com";
      const root = trimmed.endsWith("/api/v4") ? trimmed.slice(0, -"/api/v4".length) : trimmed;
      return `${root}/-/user_settings/personal_access_tokens?name=Recrest&scopes=${scopes.join(",")}`;
    },
    requiredScopes: ["read_api", "read_repository", "read_user"] as const,
    supportsUrlScopes: true,
  },
  bitbucket: {
    docsUrl: "https://support.atlassian.com/bitbucket-cloud/docs/create-an-app-password/",
    createUrl: (_baseUrl: string, _scopes: readonly string[]) =>
      "https://bitbucket.org/account/settings/app-passwords/new",
    requiredScopes: ["account:read", "repository:read", "pullrequest:read"] as const,
    supportsUrlScopes: false,
  },
} as const;

/** Narrowed alias matching the keys of `PROVIDER_PAT_INFO`. Always identical
 *  to `ProviderId`; declared separately so the molecule prop type can read
 *  "the providers PatHelpPanel can render" without leaking the broader id
 *  union. */
export type ProviderKey = keyof typeof PROVIDER_PAT_INFO;
