import type { GitInfo, PlatformInfo } from "@recrest/shared";

import { safeInvoke } from "@/lib/tauri";

export const systemService = {
  async getPlatformInfo(): Promise<PlatformInfo | null> {
    return safeInvoke<PlatformInfo>("get_platform_info");
  },

  async getGitInfo(): Promise<GitInfo | null> {
    return safeInvoke<GitInfo>("check_git");
  },
};
