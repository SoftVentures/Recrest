// Phase-3 unified the per-provider base URL normaliser into
// `normalizeProviderBaseUrl`. This module is kept only as a thin re-export
// to avoid churning the existing GitLab callsite import; new code should
// import from `./url.utils` directly.
export { normalizeProviderBaseUrl as normalizeGitlabBaseUrl } from "@/lib/utils/url.utils";
