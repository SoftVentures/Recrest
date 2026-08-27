import type { Os } from "../hooks/useOsDetect";

export type DownloadArch = "arm64" | "x64";

/**
 * A downloadable file published on the GitHub release. `filename` must match
 * the contract in `.github/workflows/release-tauri.yml` exactly.
 */
export type FileChannel = {
  kind: "file";
  label: string;
  arch: DownloadArch;
  filename: string;
};

/**
 * A channel the user installs through a package manager rather than by
 * downloading anything — the page shows the command, not a button.
 */
export type CommandChannel = {
  kind: "command";
  label: string;
  command: string;
};

/**
 * Not every install channel is a file on our release page. Linux ships through
 * distro package managers too, and those need a command rather than a download
 * button, so the list the download card renders is a union rather than a flat
 * asset list.
 *
 * A third `"external"` variant (a link to Flathub) joins this union once the
 * Flathub submission is live — see plan 11, work item F². Linking a Flathub
 * page that does not exist yet would be worse than not linking one at all.
 */
export type DownloadChannel = FileChannel | CommandChannel;

/**
 * Build the GitHub Releases download URL for a given filename.
 * `repoUrl` is the __REPO_URL__ define; `version` is __APP_VERSION__ (no leading "v").
 */
export function buildDownloadUrl(repoUrl: string, filename: string): string {
  return `${repoUrl}/releases/latest/download/${filename}`;
}

/**
 * Returns the install channels for a given OS, in display order.
 * The filename schema must match the release workflow exactly.
 */
export function getChannelsForOs(os: Exclude<Os, "unknown">, version: string): DownloadChannel[] {
  switch (os) {
    case "macos":
      return [
        {
          kind: "file",
          label: "Apple Silicon",
          arch: "arm64",
          filename: `recrest-v${version}-mac-arm64.dmg`,
        },
        {
          kind: "file",
          label: "Intel",
          arch: "x64",
          filename: `recrest-v${version}-mac-x64.dmg`,
        },
      ];
    case "windows":
      return [
        {
          kind: "file",
          label: "x64",
          arch: "x64",
          filename: `recrest-v${version}-windows-x64.exe`,
        },
        {
          kind: "file",
          label: "ARM64",
          arch: "arm64",
          filename: `recrest-v${version}-windows-arm64.exe`,
        },
      ];
    // Labels carry no arch suffix: `download.downloadLabel` already wraps them
    // in parentheses, so ".deb (x64)" rendered as "Download (.deb (x64))". The
    // arch is stated once, in `download.osSub.linux`.
    case "linux":
      return [
        {
          kind: "file",
          label: ".deb",
          arch: "x64",
          filename: `recrest-v${version}-linux-x64.deb`,
        },
        {
          kind: "file",
          label: ".rpm",
          arch: "x64",
          filename: `recrest-v${version}-linux-x64.rpm`,
        },
        {
          kind: "command",
          label: "Arch (AUR)",
          command: "paru -S recrest-bin",
        },
      ];
  }
}
