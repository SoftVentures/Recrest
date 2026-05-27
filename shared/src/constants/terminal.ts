import type { Platform } from "../types/ide.js";

/* ─────────────────────────────────────────────────────────────────────────
   Terminals — every well-known cross-platform terminal emulator Recrest
   knows how to `open_terminal` against. Stable ids are used as the
   serialised choice in `settings.json` (`TerminalSettings.id`).
   Detection on the Rust side: each definition lists a `probeCommand`
   that's looked up via `which` (POSIX) or `where.exe` (Windows), plus a
   bundle-id check on macOS so .app-style installs (Terminal.app, iTerm2)
   are detected even when the CLI isn't on $PATH.
   ───────────────────────────────────────────────────────────────────────── */
export const TERMINAL_IDS = [
  // macOS
  "apple-terminal",
  "iterm2",
  "warp",
  "wezterm",
  "alacritty",
  "kitty",
  "hyper",
  "ghostty",
  // Windows
  "windows-terminal",
  "powershell",
  "cmd",
  // Linux / cross-platform
  "gnome-terminal",
  "konsole",
  "xterm",
  "tilix",
] as const;
export type TerminalId = (typeof TERMINAL_IDS)[number];

export interface TerminalDefinition {
  id: TerminalId;
  name: string;
  /** Comma-separated platforms this terminal runs on. */
  platforms: readonly Platform[];
  /** CLI command Rust uses to probe / spawn this terminal. */
  command: string;
  /** macOS bundle id — lets us detect .app-style installs even when the CLI
   *  is not on $PATH. `null` for non-mac terminals. */
  macBundleId: string | null;
}

export const TERMINAL_DEFINITIONS: Record<TerminalId, TerminalDefinition> = {
  "apple-terminal": {
    id: "apple-terminal",
    name: "Terminal",
    platforms: ["macos"],
    command: "open",
    macBundleId: "com.apple.Terminal",
  },
  iterm2: {
    id: "iterm2",
    name: "iTerm",
    platforms: ["macos"],
    command: "open",
    macBundleId: "com.googlecode.iterm2",
  },
  warp: {
    id: "warp",
    name: "Warp",
    platforms: ["macos", "linux", "windows"],
    command: "warp",
    macBundleId: "dev.warp.Warp-Stable",
  },
  wezterm: {
    id: "wezterm",
    name: "WezTerm",
    platforms: ["macos", "linux", "windows"],
    command: "wezterm",
    macBundleId: "com.github.wez.wezterm",
  },
  alacritty: {
    id: "alacritty",
    name: "Alacritty",
    platforms: ["macos", "linux", "windows"],
    command: "alacritty",
    macBundleId: "org.alacritty",
  },
  kitty: {
    id: "kitty",
    name: "kitty",
    platforms: ["macos", "linux"],
    command: "kitty",
    macBundleId: "net.kovidgoyal.kitty",
  },
  hyper: {
    id: "hyper",
    name: "Hyper",
    platforms: ["macos", "linux", "windows"],
    command: "hyper",
    macBundleId: "co.zeit.hyper",
  },
  ghostty: {
    id: "ghostty",
    name: "Ghostty",
    platforms: ["macos", "linux"],
    command: "ghostty",
    macBundleId: "com.mitchellh.ghostty",
  },
  "windows-terminal": {
    id: "windows-terminal",
    name: "Windows Terminal",
    platforms: ["windows"],
    command: "wt.exe",
    macBundleId: null,
  },
  powershell: {
    id: "powershell",
    name: "PowerShell",
    platforms: ["windows"],
    command: "pwsh",
    macBundleId: null,
  },
  cmd: {
    id: "cmd",
    name: "Command Prompt",
    platforms: ["windows"],
    command: "cmd.exe",
    macBundleId: null,
  },
  "gnome-terminal": {
    id: "gnome-terminal",
    name: "GNOME Terminal",
    platforms: ["linux"],
    command: "gnome-terminal",
    macBundleId: null,
  },
  konsole: {
    id: "konsole",
    name: "Konsole",
    platforms: ["linux"],
    command: "konsole",
    macBundleId: null,
  },
  xterm: {
    id: "xterm",
    name: "XTerm",
    platforms: ["linux"],
    command: "xterm",
    macBundleId: null,
  },
  tilix: {
    id: "tilix",
    name: "Tilix",
    platforms: ["linux"],
    command: "tilix",
    macBundleId: null,
  },
};

/* ─────────────────────────────────────────────────────────────────────────
   Shells — the `--profile`-style choice that decides *what* runs inside
   the chosen terminal. Detection: `which` for POSIX shells, `where.exe`
   for Windows ones. The ids here align with `chsh` / `$SHELL` exit values
   so we can cross-check what the user actually has set as default.
   ───────────────────────────────────────────────────────────────────────── */
export const SHELL_IDS = [
  "zsh",
  "bash",
  "fish",
  "nu",
  "elvish",
  "tcsh",
  "ksh",
  // Windows
  "powershell-core",
  "windows-powershell",
  "cmd",
  "git-bash",
  // WSL
  "wsl",
] as const;
export type ShellId = (typeof SHELL_IDS)[number];

export interface ShellDefinition {
  id: ShellId;
  name: string;
  platforms: readonly Platform[];
  /** Executable name `which` should find. */
  command: string;
}

export const SHELL_DEFINITIONS: Record<ShellId, ShellDefinition> = {
  zsh: { id: "zsh", name: "Zsh", platforms: ["macos", "linux"], command: "zsh" },
  bash: {
    id: "bash",
    name: "Bash",
    platforms: ["macos", "linux", "windows"],
    command: "bash",
  },
  fish: { id: "fish", name: "fish", platforms: ["macos", "linux"], command: "fish" },
  nu: {
    id: "nu",
    name: "Nushell",
    platforms: ["macos", "linux", "windows"],
    command: "nu",
  },
  elvish: { id: "elvish", name: "Elvish", platforms: ["macos", "linux"], command: "elvish" },
  tcsh: { id: "tcsh", name: "tcsh", platforms: ["macos", "linux"], command: "tcsh" },
  ksh: { id: "ksh", name: "ksh", platforms: ["macos", "linux"], command: "ksh" },
  "powershell-core": {
    id: "powershell-core",
    name: "PowerShell",
    platforms: ["macos", "linux", "windows"],
    command: "pwsh",
  },
  "windows-powershell": {
    id: "windows-powershell",
    name: "Windows PowerShell",
    platforms: ["windows"],
    command: "powershell.exe",
  },
  cmd: { id: "cmd", name: "Command Prompt", platforms: ["windows"], command: "cmd.exe" },
  "git-bash": {
    id: "git-bash",
    name: "Git Bash",
    platforms: ["windows"],
    command: "bash.exe",
  },
  wsl: {
    id: "wsl",
    name: "WSL",
    platforms: ["windows"],
    command: "wsl.exe",
  },
};
