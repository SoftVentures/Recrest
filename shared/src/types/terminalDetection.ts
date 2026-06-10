import type { ShellId, TerminalId } from "../constants/terminal.js";

/** Result of the OS probe for one terminal emulator (Plan 04/02 §D.1). */
export interface TerminalDetection {
  id: TerminalId;
  available: boolean;
  /** Reserved for a later `--version` probe; currently always null. */
  version: string | null;
}

/** Result of the OS probe for one shell. */
export interface ShellDetection {
  id: ShellId;
  available: boolean;
}
