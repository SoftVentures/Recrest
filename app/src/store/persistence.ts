import type { Middleware } from "@reduxjs/toolkit";

import type { AccentId, FontId, FontSizeId, ThemeMode } from "@recrest/shared";

const STORAGE_KEY = "recrest:ui";

interface PersistedShape {
  sidebarCollapsed: boolean;
  theme: ThemeMode;
  accent: AccentId;
  font: FontId;
  fontSize: FontSizeId;
  highContrast: boolean;
  reducedMotion: boolean;
  underlineLinks: boolean;
}

// Minimal shape the persistence middleware needs to read — intentionally
// decoupled from the concrete RootState to avoid a circular import with the
// store module.
interface PersistableState {
  ui: { sidebarCollapsed: boolean };
  settings: {
    theme: ThemeMode;
    accent: AccentId;
    font: FontId;
    fontSize: FontSizeId;
    highContrast: boolean;
    reducedMotion: boolean;
    underlineLinks: boolean;
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadPersisted(): Partial<PersistedShape> | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PersistedShape>;
  } catch {
    return null;
  }
}

function serialize(state: PersistableState): string {
  const snapshot: PersistedShape = {
    sidebarCollapsed: state.ui.sidebarCollapsed,
    theme: state.settings.theme,
    accent: state.settings.accent,
    font: state.settings.font,
    fontSize: state.settings.fontSize,
    highContrast: state.settings.highContrast,
    reducedMotion: state.settings.reducedMotion,
    underlineLinks: state.settings.underlineLinks,
  };
  return JSON.stringify(snapshot);
}

/** Write-through middleware — persists a small slice of UI state on every dispatch.
 *  Locale is handled by i18next's own localStorage detector; keep this list tight. */
export const persistenceMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  if (!isBrowser()) return result;
  try {
    const state = store.getState() as PersistableState;
    window.localStorage.setItem(STORAGE_KEY, serialize(state));
  } catch {
    // Storage may be disabled (private mode, quota) — fail silently; in-memory
    // state still works for the current session.
  }
  return result;
};
