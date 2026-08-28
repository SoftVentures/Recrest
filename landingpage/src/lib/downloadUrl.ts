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
 * A channel hosted somewhere else entirely — the page links out rather than
 * serving a file or printing a command.
 */
export type ExternalChannel = {
  kind: "external";
  label: string;
  url: string;
};

/**
 * Not every install channel is a file on our release page. Linux ships through
 * distro package managers and app stores too, so the list the download card
 * renders is a union rather than a flat asset list.
 */
export type DownloadChannel = FileChannel | CommandChannel | ExternalChannel;

/**
 * Flathub app page. Deliberately linked before the submission is accepted: the
 * channel is announced from the start, and the page starts working the moment
 * Flathub merges and builds the manifest. Until then this 404s — a known,
 * accepted state, not an oversight.
 */
export const FLATHUB_URL = "https://flathub.org/apps/com.soft_ventures.Recrest";

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
          kind: "external",
          label: "Flathub",
          url: FLATHUB_URL,
        },
        {
          kind: "command",
          label: "Arch (AUR)",
          command: "paru -S recrest-bin",
        },
      ];
  }
}
