import {
  PROVIDER_CREATE_TOKEN_URLS,
  Provider,
  type ProviderId,
} from "@/lib/constants/providers.constants";

/**
 * Returns the host token-creation URL for a provider. Self-hosted GitHub/GitLab
 * strip the API suffix from the stored base URL so users land on the web UI's
 * token page, not the REST root. Bitbucket Server is out of scope — the cloud
 * app-password URL is used for every Bitbucket host.
 */
export function tokenCreateUrlFor(
  providerId: ProviderId,
  baseUrl: string | null | undefined,
): string {
  const cloud = PROVIDER_CREATE_TOKEN_URLS[providerId];
  if (!baseUrl) return cloud;
  if (providerId === Provider.GITHUB) {
    const m = baseUrl.match(/^(https?:\/\/[^/]+)\/api\/v3\/?$/i);
    if (m?.[1]) return `${m[1]}/settings/tokens/new?scopes=repo,read:user&description=Recrest`;
  }
  if (providerId === Provider.GITLAB) {
    const m = baseUrl.match(/^(https?:\/\/[^/]+)\/api\/v4\/?$/i);
    if (m?.[1]) {
      return `${m[1]}/-/user_settings/personal_access_tokens?name=Recrest&scopes=read_api,read_user,read_repository`;
    }
  }
  return cloud;
}
