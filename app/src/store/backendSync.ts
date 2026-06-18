import type { Middleware } from "@reduxjs/toolkit";

import { type AppSettings, TauriCommand, type ThemeMode } from "@recrest/shared";

import type { ThemeId } from "@/lib/constants/theme.constants";
import { invoke, isTauri } from "@/lib/tauri";
import {
  saveSettings,
  setCodeFont,
  setCodeLigatures,
  setCrashReporting,
  setDesktopAutoStart,
  setDesktopCloseToTray,
  setDesktopStartMinimized,
  setDyslexiaFont,
  setFollowsSystem,
  setFont,
  setFontSize,
  setHighContrast,
  setLocale,
  setNotificationsCiFailed,
  setNotificationsEnabled,
  setNotificationsMergeReady,
  setNotificationsNewPr,
  setPollingIntervalMinutes,
  setPrimaryColor,
  setReducedMotion,
  setThemeId,
  setUnderlineLinks,
  setUpdateMode,
} from "@/store/actions/settings.actions";
import {
  setPinnedRepos,
  setSidebarCollapsed,
  togglePinnedRepo,
  toggleSidebar,
} from "@/store/actions/ui.actions";

/**
 * Mirrors specific renderer-side settings actions back to the Rust backend
 * via `update_settings`. Keeping this in one place means each reducer stays
 * pure and the IPC contract is a single map: action → patch field.
 *
 * Why a middleware (not a thunk per action):
 *   - The reducers double as fast-path optimistic updates; the backend is the
 *     source of truth, but the UI shouldn't wait a round-trip to feel snappy.
 *   - Some actions (autostart) need to additionally call OS-level plugins
 *     beyond settings.json. The middleware can fork those side effects from
 *     one place without scattering plugin imports across every section.
 *   - Outside Tauri (`yarn dev:web`) the dev stub already swallows `invoke`
 *     calls — `isTauri()` is just a fast pre-check so we don't pay the
 *     dynamic-import cost on every keystroke.
 */
// `oled` and `glassy` are renderer-only theme variants — the Rust side only
// knows light / dark / system. Collapsing dark-like variants to "dark" keeps
// the on-disk theme value sane (used for window icon swap, native menubar)
// without losing the renderer-side flavour, which still lives in the
// persisted `themeId` slot under `localStorage`.
function themeIdToBackend(id: ThemeId): ThemeMode {
  if (id === "light") return "light";
  return "dark";
}

export const settingsBackendSync: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  if (!isTauri()) return result;

  // Drop anything that isn't a settings or persisted-ui change. Cheap
  // action-type filter avoids running the dispatch chain for every store
  // update (every hover / mouseMove eventually touches the store).
  if (
    typeof action !== "object" ||
    action === null ||
    !("type" in action) ||
    typeof (action as { type?: unknown }).type !== "string"
  ) {
    return result;
  }
  const actionType = (action as { type: string }).type;
  const isPersistedUiAction =
    actionType === "ui/setSidebarCollapsed" ||
    actionType === "ui/toggleSidebar" ||
    actionType === "ui/togglePinnedRepo" ||
    actionType === "ui/setPinnedRepos";
  if (!actionType.startsWith("settings/") && !isPersistedUiAction) {
    return result;
  }

  const type = actionType;
  // Don't recursively re-fire on the thunk's own lifecycle actions
  // (`settings/save/pending`, `.../fulfilled`, `.../rejected`, the load
  // counterpart, the `syncSystemTheme` no-network-needed action).
  if (
    type === "settings/save/pending" ||
    type === "settings/save/fulfilled" ||
    type === "settings/save/rejected" ||
    type === "settings/load/pending" ||
    type === "settings/load/fulfilled" ||
    type === "settings/load/rejected" ||
    type === "settings/syncSystemTheme"
  ) {
    return result;
  }

  const a = action as { type: string; payload: unknown };

  // Map the action onto an `update_settings` patch fragment. Each case sends
  // the *minimal* patch — the backend's `update_settings` merges into the
  // current settings, so an unset field stays untouched.
  // `store.dispatch` is typed `Dispatch<UnknownAction>` on the Middleware
  // generic — thunks are valid at runtime but the type rejects them. Cast
  // once here instead of sprinkling `as never` per call site.
  const dispatch = store.dispatch as unknown as (action: unknown) => unknown;

  const state = store.getState() as StoreState;

  if (setPollingIntervalMinutes.match(a)) {
    dispatch(saveSettings({ pollingIntervalMs: a.payload * 60_000 }));
  } else if (setThemeId.match(a)) {
    // Two-field write: the legacy top-level `theme` slot stays in sync so
    // older builds + native menu-bar hooks keep reading the correct value,
    // and the renderer-rich `appearance.themeId` records the actual choice
    // (light/dark/oled/glassy). `setThemeId` also flips followsSystem off
    // in the reducer, so we mirror that to the backend.
    dispatch(
      saveSettings({
        theme: themeIdToBackend(a.payload),
        appearance: appearancePatch(state, { themeId: a.payload, followsSystem: false }),
      }),
    );
    void applyThemeEffect(a.payload);
  } else if (setFollowsSystem.match(a)) {
    dispatch(
      saveSettings({
        theme: a.payload ? "system" : themeIdToBackend(state.settings.themeId),
        appearance: appearancePatch(state, { followsSystem: a.payload }),
      }),
    );
    // Re-assert window vibrancy for whatever themeId the renderer resolves to
    // once follow-system reconciles — the effective theme may be `dark`/`light`
    // now, so the OS-level effect needs to clear or re-apply accordingly.
    void applyThemeEffect((store.getState() as StoreState).settings.themeId);
  } else if (setPrimaryColor.match(a)) {
    dispatch(saveSettings({ appearance: appearancePatch(state, { primaryColor: a.payload }) }));
  } else if (setFont.match(a)) {
    dispatch(
      saveSettings({
        appearance: appearancePatch(state, { font: a.payload }),
        accessibility: accessibilityPatch(state, {
          dyslexiaFont: a.payload === "opendyslexic",
        }),
      }),
    );
  } else if (setCodeFont.match(a)) {
    dispatch(saveSettings({ appearance: appearancePatch(state, { codeFont: a.payload }) }));
  } else if (setCodeLigatures.match(a)) {
    dispatch(saveSettings({ appearance: appearancePatch(state, { codeLigatures: a.payload }) }));
  } else if (setFontSize.match(a)) {
    dispatch(saveSettings({ appearance: appearancePatch(state, { fontSize: a.payload }) }));
  } else if (setDyslexiaFont.match(a)) {
    dispatch(
      saveSettings({
        appearance: appearancePatch(state, {
          font: a.payload ? "opendyslexic" : "inter",
        }),
        accessibility: accessibilityPatch(state, { dyslexiaFont: a.payload }),
      }),
    );
  } else if (setHighContrast.match(a)) {
    dispatch(
      saveSettings({ accessibility: accessibilityPatch(state, { highContrast: a.payload }) }),
    );
  } else if (setReducedMotion.match(a)) {
    dispatch(
      saveSettings({ accessibility: accessibilityPatch(state, { reducedMotion: a.payload }) }),
    );
  } else if (setUnderlineLinks.match(a)) {
    dispatch(
      saveSettings({ accessibility: accessibilityPatch(state, { underlineLinks: a.payload }) }),
    );
  } else if (setSidebarCollapsed.match(a)) {
    dispatch(saveSettings({ windowState: { sidebarCollapsed: a.payload } }));
  } else if (toggleSidebar.match(a)) {
    // The reducer already flipped the bit; read the freshly-written value
    // off state so we send the *new* value, not the previous one.
    dispatch(
      saveSettings({
        windowState: { sidebarCollapsed: (store.getState() as StoreState).ui.sidebarCollapsed },
      }),
    );
  } else if (togglePinnedRepo.match(a) || setPinnedRepos.match(a)) {
    dispatch(
      saveSettings({
        pinnedRepoIds: (store.getState() as StoreState).ui.pinnedRepoIds,
      }),
    );
  } else if (setLocale.match(a)) {
    dispatch(saveSettings({ locale: a.payload }));
  } else if (setDesktopAutoStart.match(a)) {
    dispatch(saveSettings({ autoStart: a.payload }));
    // Toggle the OS-level autostart registration too — settings.json on its
    // own doesn't make the LaunchAgent / registry key. Fire-and-forget; the
    // plugin already handles "already enabled / disabled".
    void applyAutostart(a.payload);
  } else if (setDesktopStartMinimized.match(a)) {
    dispatch(saveSettings({ startMinimized: a.payload }));
  } else if (setDesktopCloseToTray.match(a)) {
    dispatch(saveSettings({ closeToTray: a.payload }));
  } else if (setCrashReporting.match(a)) {
    dispatch(saveSettings({ crashReporting: a.payload }));
  } else if (setNotificationsEnabled.match(a)) {
    dispatch(
      saveSettings({
        notifications: notificationsPatchFromState(store, "enabled", a.payload),
      }),
    );
  } else if (setNotificationsNewPr.match(a)) {
    dispatch(
      saveSettings({
        notifications: notificationsPatchFromState(store, "newPr", a.payload),
      }),
    );
  } else if (setNotificationsCiFailed.match(a)) {
    dispatch(
      saveSettings({
        notifications: notificationsPatchFromState(store, "ciFailed", a.payload),
      }),
    );
  } else if (setNotificationsMergeReady.match(a)) {
    dispatch(
      saveSettings({
        notifications: notificationsPatchFromState(store, "mergeReady", a.payload),
      }),
    );
  } else if (setUpdateMode.match(a)) {
    dispatch(saveSettings({ autoUpdate: a.payload }));
  }

  return result;
};

interface StoreLike {
  getState: () => {
    settings: {
      notifications: {
        enabled: boolean;
        newPr: boolean;
        ciFailed: boolean;
        mergeReady: boolean;
      };
    };
  };
}

type StoreState = {
  settings: {
    themeId: ThemeId;
    followsSystem: boolean;
    primaryColor: string;
    font: string;
    codeFont: string;
    codeLigatures: AppSettings["appearance"]["codeLigatures"];
    fontSize: string;
    dyslexiaFont: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
    underlineLinks: boolean;
  };
  ui: {
    sidebarCollapsed: boolean;
    pinnedRepoIds: string[];
  };
};

/**
 * Backend `AppearanceSettings` is one struct — the Rust side replaces it
 * atomically on every `update_settings` call. To avoid clobbering unrelated
 * fields when only one slot changes, we merge the requested patch onto the
 * current Redux snapshot of the same slots. The middleware runs AFTER the
 * reducer (we `next(action)` first), so the freshly written value is already
 * in state and we read the whole bag.
 */
function appearancePatch(
  state: StoreState,
  patch: Partial<AppSettings["appearance"]>,
): AppSettings["appearance"] {
  const s = state.settings;
  return {
    themeId: s.themeId,
    followsSystem: s.followsSystem,
    primaryColor: s.primaryColor as AppSettings["appearance"]["primaryColor"],
    font: s.font as AppSettings["appearance"]["font"],
    codeFont: s.codeFont as AppSettings["appearance"]["codeFont"],
    codeLigatures: s.codeLigatures,
    fontSize: s.fontSize as AppSettings["appearance"]["fontSize"],
    ...patch,
  };
}

function accessibilityPatch(
  state: StoreState,
  patch: Partial<AppSettings["accessibility"]>,
): AppSettings["accessibility"] {
  const s = state.settings;
  return {
    dyslexiaFont: s.dyslexiaFont,
    highContrast: s.highContrast,
    reducedMotion: s.reducedMotion,
    underlineLinks: s.underlineLinks,
    ...patch,
  };
}

/**
 * Backend `NotificationSettings` is one struct — we need to send the full
 * object on every change to avoid clobbering siblings. The middleware runs
 * AFTER the reducer (we `next(action)` first), so the freshly written value
 * is already in state and we just read the whole bag.
 */
function notificationsPatchFromState(
  store: StoreLike,
  field: "enabled" | "newPr" | "ciFailed" | "mergeReady",
  value: boolean,
) {
  const current = store.getState().settings.notifications;
  return { ...current, [field]: value };
}

/**
 * Tell the Rust side to apply/clear the OS-level window vibrancy effect for
 * the new theme. Fire-and-forget — the backend collapses unsupported themes
 * to no-op, and a transient failure shouldn't block the settings save path.
 */
async function applyThemeEffect(theme: ThemeId): Promise<void> {
  try {
    await invoke<void>(TauriCommand.SET_THEME_EFFECT, { theme });
  } catch (err) {
    console.warn("[settings] set_theme_effect failed", err);
  }
}

async function applyAutostart(enable: boolean): Promise<void> {
  try {
    const mod = await import("@tauri-apps/plugin-autostart");
    if (enable) {
      const already = await mod.isEnabled();
      if (!already) await mod.enable();
    } else {
      const already = await mod.isEnabled();
      if (already) await mod.disable();
    }
  } catch (err) {
    // Best-effort: a missing plugin / Linux session without a launcher
    // shouldn't block the settings toggle from at least persisting.
    console.warn("[settings] autostart plugin error", err);
  }
}
