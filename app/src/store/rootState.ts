import type { ActivityState } from "@/store/types/activity.types";
import type { ProvidersState } from "@/store/types/providers.types";
import type { PrsState } from "@/store/types/prs.types";
import type { RemoteImportState } from "@/store/types/remoteImport.types";
import type { ReposState } from "@/store/types/repos.types";
import type { SettingsState } from "@/store/types/settings.types";
import type { UiState } from "@/store/types/ui.types";

/**
 * Structural app-state shape, assembled from the per-slice state types.
 *
 * It lives in its own module — separate from `store/index.ts` — so that
 * thunk/action files can type `getState()` via `RootState` without importing
 * the store instance. That import (`activity.actions.ts` → `store/index.ts`)
 * closed a dependency cycle (`store/index → reducers → actions → store/index`)
 * that madge flagged. None of the imported `*.types` modules reach back into
 * the store, so this module is cycle-free.
 *
 * The key/type set is kept in lockstep with `configureStore`'s reducer map via
 * a compile-time assertion in `store/index.ts`.
 */
export interface RootState {
  ui: UiState;
  settings: SettingsState;
  providers: ProvidersState;
  repos: ReposState;
  prs: PrsState;
  remoteImport: RemoteImportState;
  activity: ActivityState;
}
