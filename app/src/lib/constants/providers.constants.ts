import {
  PROVIDER_API_URLS,
  PROVIDER_CREATE_TOKEN_URLS,
  PROVIDER_IDS,
  PROVIDER_NAMES,
  PROVIDER_OAUTH_SCOPES,
  PROVIDER_WEB_URLS,
  type ProviderId,
} from "@recrest/shared";

import { type SimpleIcon, siBitbucket, siGithub, siGitlab } from "simple-icons";

export {
  PROVIDER_API_URLS,
  PROVIDER_CREATE_TOKEN_URLS,
  PROVIDER_IDS,
  PROVIDER_NAMES,
  PROVIDER_OAUTH_SCOPES,
  PROVIDER_WEB_URLS,
  type ProviderId,
};

/** Named-constant accessors for the three supported providers. Use these
 *  instead of bare string literals when comparing or initialising a
 *  provider id — e.g. `if (id === Provider.BITBUCKET)`, not
 *  `if (id === "bitbucket")`. */
export const Provider = {
  GITHUB: "github",
  GITLAB: "gitlab",
  BITBUCKET: "bitbucket",
} as const satisfies Record<string, ProviderId>;

/** Brand glyphs for the three supported providers, sourced from
 *  `simple-icons` so they always match the official brand mark. Use via
 *  `<BrandIcon slug={provider} />`. */
export const PROVIDER_BRAND_ICONS = {
  github: siGithub,
  gitlab: siGitlab,
  bitbucket: siBitbucket,
} as const satisfies Record<ProviderId, SimpleIcon>;

/** Example URLs surfaced as `placeholder=` on the Accounts → base-URL
 *  input. Self-hosted hint for each provider so the user knows the field
 *  accepts an Enterprise / self-managed root (not just the cloud default).
 *  Not user-visible copy — the i18next gate skips `placeholder` attribs
 *  when the value comes from a constant. */
export const PROVIDER_BASE_URL_PLACEHOLDERS = {
  github: "https://github.acme.com",
  gitlab: "https://gitlab.example.com",
  bitbucket: "https://api.bitbucket.org/2.0",
} as const satisfies Record<ProviderId, string>;
