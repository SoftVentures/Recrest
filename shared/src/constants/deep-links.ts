export const DEEP_LINK_SCHEME = "recrest";

export const DEEP_LINK_ACTIONS = {
  openRepo: "open-repo",
  openPr: "open-pr",
  addRepo: "add-repo",
} as const;

export type DeepLinkAction = (typeof DEEP_LINK_ACTIONS)[keyof typeof DEEP_LINK_ACTIONS];

export function buildDeepLink(action: DeepLinkAction, path: string = ""): string {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${DEEP_LINK_SCHEME}://${action}${suffix}`;
}
