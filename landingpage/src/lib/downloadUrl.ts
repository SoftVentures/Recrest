import type { Os } from "../hooks/useOsDetect";

export type DownloadArch = "arm64" | "x64";

export type DownloadAsset = {
  label: string;
  arch: DownloadArch;
  filename: string;
};

/**
 * Build the GitHub Releases download URL for a given filename.
 * `repoUrl` is the __REPO_URL__ define; `version` is __APP_VERSION__ (no leading "v").
 */
export function buildDownloadUrl(repoUrl: string, filename: string): string {
  return `${repoUrl}/releases/latest/download/${filename}`;
}

/**
 * Returns the list of download assets for a given OS, in display order.
 * The filename schema must match the release workflow exactly.
 */
export function getAssetsForOs(os: Exclude<Os, "unknown">, version: string): DownloadAsset[] {
  switch (os) {
    case "macos":
      return [
        {
          label: "Apple Silicon",
          arch: "arm64",
          filename: `recrest-v${version}-mac-arm64.dmg`,
        },
        {
          label: "Intel",
          arch: "x64",
          filename: `recrest-v${version}-mac-x64.dmg`,
        },
      ];
    case "windows":
      return [
        {
          label: "x64",
          arch: "x64",
          filename: `recrest-v${version}-windows-x64.exe`,
        },
        {
          label: "ARM64",
          arch: "arm64",
          filename: `recrest-v${version}-windows-arm64.exe`,
        },
      ];
    case "linux":
      return [
        {
          label: "AppImage (x64)",
          arch: "x64",
          filename: `recrest-v${version}-linux-x64.AppImage`,
        },
        {
          label: ".deb (x64)",
          arch: "x64",
          filename: `recrest-v${version}-linux-x64.deb`,
        },
        {
          label: ".rpm (x64)",
          arch: "x64",
          filename: `recrest-v${version}-linux-x64.rpm`,
        },
      ];
  }
}
