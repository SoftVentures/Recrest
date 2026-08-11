import type { SaveSettingsMeta } from "@/store/actions/settings.actions";

/**
 * Mixed into every slice that applies the whole `AppSettings` snapshot returned
 * by `saveSettings`. Concurrent `update_settings` round-trips complete out of
 * order, so each slice records the newest generation it applied and drops
 * anything older — without it a straggling response rewrites the store back
 * past a value the user already sees.
 */
export interface SaveSeqTracked {
  lastAppliedSaveSeq: number;
}

/** Nothing applied yet. Every real `seq` starts at 1. */
export const INITIAL_SAVE_SEQ = 0;

/**
 * `true` when this `saveSettings.fulfilled` is newer than everything the slice
 * has applied — and records it as the new high-water mark. `false` means a
 * superseded response landed late and must be ignored.
 */
export function acceptSaveSnapshot(state: SaveSeqTracked, meta: SaveSettingsMeta): boolean {
  if (meta.seq <= state.lastAppliedSaveSeq) return false;
  state.lastAppliedSaveSeq = meta.seq;
  return true;
}
