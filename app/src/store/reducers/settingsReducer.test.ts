import type { AppSettings, CustomFont, ShellDetection, TerminalDetection } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import {
  deleteCustomFont,
  loadCustomFonts,
  loadDetectedIdes,
  loadDetectedShells,
  loadDetectedTerminals,
  loadSettings,
  saveSettings,
  setCodeFont,
  setCodeLigatures,
  setCrashReporting,
  setDateFormat,
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
  setRegion,
  setThemeId,
  setTimeFormat,
  setTranslucencyEnabled,
  setTranslucencyIntensity,
  setUnderlineLinks,
  setUpdateMode,
  setWeekStart,
  syncSystemTheme,
  uploadCustomFont,
} from "@/store/actions/settings.actions";
import { settingsReducer } from "@/store/reducers/settingsReducer";
import type { SettingsState } from "@/store/types/settings.types";

const initial = (): SettingsState => settingsReducer(undefined, { type: "@@INIT" });

function font(id: string): CustomFont {
  return {
    id,
    family: id,
    fileName: `${id}.woff2`,
    format: "woff2",
    data: "AAAA",
  };
}

function appSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    pollingIntervalMs: 5 * 60_000,
    defaultIde: null,
    theme: "light",
    locale: "de",
    scanPaths: [],
    autoStart: true,
    autoUpdate: "auto",
    startMinimized: true,
    closeToTray: false,
    notifications: { enabled: true, newPr: false, ciFailed: false, mergeReady: false },
    crashReporting: true,
    pinnedRepoIds: [],
    authorAliases: {},
    uiScale: 1,
    repoListViewMode: "grouped",
    repoListSort: { field: "name", direction: "asc" },
    repoImportDefaults: { groupId: null, providerId: null },
    defaultScanPath: null,
    terminal: { id: null, profile: null, customCommand: null },
    shell: null,
    commitMessageTemplate: "",
    privacy: { fetchFavicons: true },
    defaultSshKeyPath: null,
    gitConfigOverride: { userName: null, userEmail: null },
    appearance: {
      themeId: "dark",
      followsSystem: false,
      primaryColor: "blue",
      font: "jetbrains-mono",
      codeFont: "fira-code",
      codeLigatures: "stylistic",
      fontSize: "md",
      translucency: { enabled: false, intensity: 30, blurIntensity: 30 },
      localePrefs: {
        dateFormat: "relative",
        timeFormat: "24h",
        weekStart: "monday",
        region: null,
      },
    },
    accessibility: {
      dyslexiaFont: false,
      highContrast: true,
      reducedMotion: true,
      underlineLinks: true,
    },
    windowState: { sidebarCollapsed: false },
    ...overrides,
  };
}

describe("settingsReducer — synchronous actions", () => {
  it("sets a specific theme and leaves follow-system mode", () => {
    const start = settingsReducer(initial(), setFollowsSystem(true));
    const next = settingsReducer(start, setThemeId("dark"));
    expect(next.themeId).toBe("dark");
    expect(next.followsSystem).toBe(false);
  });

  it("syncSystemTheme updates themeId without touching followsSystem", () => {
    const start = settingsReducer(initial(), setFollowsSystem(true));
    const next = settingsReducer(start, syncSystemTheme("dark"));
    expect(next.themeId).toBe("dark");
    expect(next.followsSystem).toBe(true);
  });

  it("setFollowsSystem(true) resolves themeId from matchMedia immediately", () => {
    const next = settingsReducer(initial(), setFollowsSystem(true));
    // jsdom matchMedia defaults to no-match → light.
    expect(next.themeId).toBe("light");
    expect(next.followsSystem).toBe(true);
  });

  it("sets the primary color", () => {
    const next = settingsReducer(initial(), setPrimaryColor("purple"));
    expect(next.primaryColor).toBe("purple");
  });

  it("setDyslexiaFont keeps the font slot in sync", () => {
    const on = settingsReducer(initial(), setDyslexiaFont(true));
    expect(on.dyslexiaFont).toBe(true);
    expect(on.font).toBe("opendyslexic");
    const off = settingsReducer(on, setDyslexiaFont(false));
    expect(off.dyslexiaFont).toBe(false);
    expect(off.font).toBe("inter");
  });

  it("setFont derives the dyslexiaFont boolean", () => {
    const next = settingsReducer(initial(), setFont("opendyslexic"));
    expect(next.font).toBe("opendyslexic");
    expect(next.dyslexiaFont).toBe(true);
  });

  it("sets the code font and ligature mode", () => {
    const next = settingsReducer(initial(), setCodeFont("fira-code"));
    expect(next.codeFont).toBe("fira-code");
    const ligs = settingsReducer(next, setCodeLigatures("stylistic"));
    expect(ligs.codeLigatures).toBe("stylistic");
  });

  it("sets the font size", () => {
    const next = settingsReducer(initial(), setFontSize("lg"));
    expect(next.fontSize).toBe("lg");
  });

  it("sets the accessibility flags", () => {
    let s = settingsReducer(initial(), setHighContrast(true));
    s = settingsReducer(s, setReducedMotion(true));
    s = settingsReducer(s, setUnderlineLinks(true));
    expect(s.highContrast).toBe(true);
    expect(s.reducedMotion).toBe(true);
    expect(s.underlineLinks).toBe(true);
  });

  it("sets the locale", () => {
    const next = settingsReducer(initial(), setLocale("de"));
    expect(next.locale).toBe("de");
  });

  it("clamps the polling interval to the allowed range", () => {
    const tooBig = settingsReducer(initial(), setPollingIntervalMinutes(99_999));
    expect(tooBig.pollingIntervalMinutes).toBeLessThan(99_999);
    const tooSmall = settingsReducer(initial(), setPollingIntervalMinutes(-5));
    expect(tooSmall.pollingIntervalMinutes).toBeGreaterThan(0);
    const ok = settingsReducer(initial(), setPollingIntervalMinutes(10));
    expect(ok.pollingIntervalMinutes).toBe(10);
  });

  it("sets the desktop preferences", () => {
    let s = settingsReducer(initial(), setDesktopAutoStart(true));
    s = settingsReducer(s, setDesktopStartMinimized(true));
    s = settingsReducer(s, setDesktopCloseToTray(false));
    expect(s.desktop.autoStart).toBe(true);
    expect(s.desktop.startMinimized).toBe(true);
    expect(s.desktop.closeToTray).toBe(false);
  });

  it("setCrashReporting only mutates when a backend snapshot exists", () => {
    const noBackend = settingsReducer(initial(), setCrashReporting(true));
    expect(noBackend.backend).toBeNull();
    const withBackend = settingsReducer(
      initial(),
      loadSettings.fulfilled(appSettings({ crashReporting: false }), "internal-id", undefined),
    );
    const toggled = settingsReducer(withBackend, setCrashReporting(true));
    expect(toggled.backend?.crashReporting).toBe(true);
  });

  it("sets the notification preferences", () => {
    let s = settingsReducer(initial(), setNotificationsEnabled(true));
    s = settingsReducer(s, setNotificationsNewPr(false));
    s = settingsReducer(s, setNotificationsCiFailed(false));
    s = settingsReducer(s, setNotificationsMergeReady(false));
    expect(s.notifications.enabled).toBe(true);
    expect(s.notifications.newPr).toBe(false);
    expect(s.notifications.ciFailed).toBe(false);
    expect(s.notifications.mergeReady).toBe(false);
  });

  it("sets the update mode", () => {
    const next = settingsReducer(initial(), setUpdateMode("off"));
    expect(next.updates.mode).toBe("off");
  });
});

describe("settingsReducer — translucency (orthogonal to theme)", () => {
  it("toggles translucency without touching the theme id", () => {
    const start = settingsReducer(initial(), setThemeId("dark"));
    const on = settingsReducer(start, setTranslucencyEnabled(true));
    expect(on.translucency.enabled).toBe(true);
    expect(on.themeId).toBe("dark");
    const off = settingsReducer(on, setTranslucencyEnabled(false));
    expect(off.translucency.enabled).toBe(false);
    expect(off.themeId).toBe("dark");
  });

  it("clamps the intensity slider to the [0, 100] range", () => {
    const tooBig = settingsReducer(initial(), setTranslucencyIntensity(250));
    expect(tooBig.translucency.intensity).toBe(100);
    const tooSmall = settingsReducer(initial(), setTranslucencyIntensity(-5));
    expect(tooSmall.translucency.intensity).toBe(0);
    const ok = settingsReducer(initial(), setTranslucencyIntensity(42));
    expect(ok.translucency.intensity).toBe(42);
  });

  it("migrates a legacy glassy themeId payload to dark + translucency-on", () => {
    // Defensive renderer-side migration: even if a stale store ever
    // dispatches `setThemeId("glassy")`, we land on a valid state instead
    // of writing an invalid theme id.
    const next = settingsReducer(initial(), setThemeId("glassy" as never));
    expect(next.themeId).toBe("dark");
    expect(next.translucency.enabled).toBe(true);
  });

  it("migrates a legacy oled themeId payload to dark (without touching translucency)", () => {
    // OLED was retired as a functional duplicate of dark + high contrast;
    // a stale `setThemeId("oled")` lands on plain dark, and the user's
    // current translucency state is left alone.
    const before = initial();
    const next = settingsReducer(before, setThemeId("oled" as never));
    expect(next.themeId).toBe("dark");
    expect(next.translucency.enabled).toBe(before.translucency.enabled);
  });

  it("hydrates translucency from the backend appearance block", () => {
    const next = settingsReducer(
      initial(),
      loadSettings.fulfilled(
        appSettings({
          appearance: {
            themeId: "dark",
            followsSystem: false,
            primaryColor: "default",
            font: "inter",
            codeFont: "jetbrains-mono",
            codeLigatures: "standard",
            fontSize: "md",
            translucency: { enabled: true, intensity: 33, blurIntensity: 30 },
            localePrefs: {
              dateFormat: "relative",
              timeFormat: "24h",
              weekStart: "monday",
              region: null,
            },
          },
        }),
        "internal-id",
        undefined,
      ),
    );
    expect(next.translucency.enabled).toBe(true);
    expect(next.translucency.intensity).toBe(33);
  });

  it("migrates a backend payload that still carries themeId=oled to dark", () => {
    // The OLED-Black variant was retired as a functional duplicate of dark
    // + high-contrast. Any persisted `themeId === "oled"` from an older
    // build must land on a valid id rather than silently fall through.
    const next = settingsReducer(
      initial(),
      loadSettings.fulfilled(
        appSettings({
          theme: "dark",
          appearance: {
            themeId: "oled" as never,
            followsSystem: false,
            primaryColor: "default",
            font: "inter",
            codeFont: "jetbrains-mono",
            codeLigatures: "standard",
            fontSize: "md",
            translucency: { enabled: false, intensity: 30, blurIntensity: 30 },
            localePrefs: {
              dateFormat: "relative",
              timeFormat: "24h",
              weekStart: "monday",
              region: null,
            },
          },
        }),
        "internal-id",
        undefined,
      ),
    );
    expect(next.themeId).toBe("dark");
  });

  it("migrates a backend payload that still carries themeId=glassy", () => {
    // Belt-and-suspenders: the Rust side migrates `theme_id=glassy` on
    // load, but the renderer must also tolerate a stale payload (mid-
    // upgrade scenario) and produce a valid state.
    const next = settingsReducer(
      initial(),
      loadSettings.fulfilled(
        appSettings({
          appearance: {
            themeId: "glassy" as never,
            followsSystem: false,
            primaryColor: "default",
            font: "inter",
            codeFont: "jetbrains-mono",
            codeLigatures: "standard",
            fontSize: "md",
            translucency: { enabled: false, intensity: 30, blurIntensity: 30 },
            localePrefs: {
              dateFormat: "relative",
              timeFormat: "24h",
              weekStart: "monday",
              region: null,
            },
          },
        }),
        "internal-id",
        undefined,
      ),
    );
    expect(next.themeId).toBe("dark");
    expect(next.translucency.enabled).toBe(true);
  });
});

describe("settingsReducer — theme-flicker audit", () => {
  // Guard against regressions where an unrelated setting toggle accidentally
  // resets the user's picked theme (e.g. a reducer case writing the entire
  // appearance block instead of patching the single field). Every toggle
  // tested here must leave `themeId` and `followsSystem` exactly as set.
  function withDarkExplicit() {
    return {
      ...initial(),
      themeId: "dark" as const,
      followsSystem: false,
    };
  }

  function withDarkExplicitPlusTranslucency() {
    return {
      ...initial(),
      themeId: "dark" as const,
      followsSystem: false,
      translucency: { enabled: true, intensity: 55, blurIntensity: 30 },
    };
  }

  it("setNotificationsEnabled does not reset theme or translucency", () => {
    const next = settingsReducer(withDarkExplicitPlusTranslucency(), setNotificationsEnabled(true));
    expect(next.themeId).toBe("dark");
    expect(next.followsSystem).toBe(false);
    expect(next.translucency.enabled).toBe(true);
    expect(next.translucency.intensity).toBe(55);
  });

  it("setCrashReporting does not reset theme or translucency", () => {
    const next = settingsReducer(withDarkExplicitPlusTranslucency(), setCrashReporting(true));
    expect(next.themeId).toBe("dark");
    expect(next.followsSystem).toBe(false);
    expect(next.translucency.enabled).toBe(true);
    expect(next.translucency.intensity).toBe(55);
  });

  it("setDesktopAutoStart does not reset theme or translucency", () => {
    const next = settingsReducer(withDarkExplicitPlusTranslucency(), setDesktopAutoStart(true));
    expect(next.themeId).toBe("dark");
    expect(next.followsSystem).toBe(false);
    expect(next.translucency.enabled).toBe(true);
    expect(next.translucency.intensity).toBe(55);
  });

  it("setHighContrast does not reset theme", () => {
    const next = settingsReducer(withDarkExplicit(), setHighContrast(true));
    expect(next.themeId).toBe("dark");
    expect(next.followsSystem).toBe(false);
  });

  it("syncSystemTheme preserves followsSystem flag", () => {
    const start = settingsReducer(initial(), setFollowsSystem(true));
    expect(start.followsSystem).toBe(true);
    const next = settingsReducer(start, syncSystemTheme("dark"));
    expect(next.themeId).toBe("dark");
    expect(next.followsSystem).toBe(true);
  });
});

describe("settingsReducer — async thunks", () => {
  it("sets loading on loadSettings.pending", () => {
    const next = settingsReducer(initial(), loadSettings.pending("internal-id", undefined));
    expect(next.loading).toBe(true);
    expect(next.error).toBeNull();
  });

  it("hydrates from the backend appearance/accessibility blocks on loadSettings.fulfilled", () => {
    const next = settingsReducer(
      initial(),
      loadSettings.fulfilled(appSettings(), "internal-id", undefined),
    );
    expect(next.loading).toBe(false);
    expect(next.themeId).toBe("dark");
    expect(next.primaryColor).toBe("blue");
    expect(next.codeFont).toBe("fira-code");
    expect(next.highContrast).toBe(true);
    expect(next.underlineLinks).toBe(true);
    expect(next.locale).toBe("de");
    expect(next.pollingIntervalMinutes).toBe(5);
    expect(next.desktop.autoStart).toBe(true);
    expect(next.notifications.enabled).toBe(true);
    expect(next.updates.mode).toBe("auto");
    expect(next.backend).not.toBeNull();
  });

  it("forces the font slot to opendyslexic when the accessibility flag is set", () => {
    const payload = appSettings({
      accessibility: {
        dyslexiaFont: true,
        highContrast: false,
        reducedMotion: false,
        underlineLinks: false,
      },
    });
    const next = settingsReducer(
      initial(),
      loadSettings.fulfilled(payload, "internal-id", undefined),
    );
    expect(next.font).toBe("opendyslexic");
  });

  it("falls back to the legacy theme slot when appearance is absent", () => {
    const payload = appSettings();
    // Simulate an older settings.json with no appearance/accessibility blocks.
    delete (payload as Partial<AppSettings>).appearance;
    delete (payload as Partial<AppSettings>).accessibility;
    payload.theme = "system";
    const next = settingsReducer(
      initial(),
      loadSettings.fulfilled(payload, "internal-id", undefined),
    );
    expect(next.followsSystem).toBe(true);
  });

  it("records the error on loadSettings.rejected", () => {
    const next = settingsReducer(
      initial(),
      loadSettings.rejected(new Error("load boom"), "internal-id", undefined),
    );
    expect(next.loading).toBe(false);
    expect(next.error).toBe("load boom");
  });

  it("applies the backend snapshot on saveSettings.fulfilled", () => {
    const next = settingsReducer(
      initial(),
      saveSettings.fulfilled(appSettings({ locale: "en" }), "internal-id", {}),
    );
    expect(next.locale).toBe("en");
    expect(next.backend).not.toBeNull();
  });

  it("stores detection probe results", () => {
    const terminals: TerminalDetection[] = [{ id: "iterm2", available: true, version: null }];
    const shells: ShellDetection[] = [{ id: "zsh", available: true }];
    let s = settingsReducer(
      initial(),
      loadDetectedTerminals.fulfilled(terminals, "internal-id", undefined),
    );
    s = settingsReducer(s, loadDetectedShells.fulfilled(shells, "internal-id", undefined));
    s = settingsReducer(s, loadDetectedIdes.fulfilled(["vscode"], "internal-id", undefined));
    expect(s.detectedTerminals).toEqual(terminals);
    expect(s.detectedShells).toEqual(shells);
    expect(s.detectedIdes).toEqual(["vscode"]);
  });

  it("loads custom fonts", () => {
    const next = settingsReducer(
      initial(),
      loadCustomFonts.fulfilled([font("alpha")], "internal-id", undefined),
    );
    expect(next.customFonts.map((f) => f.id)).toEqual(["alpha"]);
  });

  it("uploads a font, replacing a same-id entry and keeping the list sorted", () => {
    const seeded = settingsReducer(
      initial(),
      loadCustomFonts.fulfilled([font("zeta"), font("beta")], "internal-id", undefined),
    );
    const next = settingsReducer(
      seeded,
      uploadCustomFont.fulfilled(font("alpha"), "internal-id", "/alpha.woff2"),
    );
    expect(next.customFonts.map((f) => f.family)).toEqual(["alpha", "beta", "zeta"]);
  });

  it("re-upload of an existing font id does not duplicate the entry", () => {
    const seeded = settingsReducer(
      initial(),
      loadCustomFonts.fulfilled([font("alpha")], "internal-id", undefined),
    );
    const next = settingsReducer(
      seeded,
      uploadCustomFont.fulfilled(font("alpha"), "internal-id", "/alpha.woff2"),
    );
    expect(next.customFonts.filter((f) => f.id === "alpha")).toHaveLength(1);
  });

  it("deletes a custom font by id", () => {
    const seeded = settingsReducer(
      initial(),
      loadCustomFonts.fulfilled([font("alpha"), font("beta")], "internal-id", undefined),
    );
    const next = settingsReducer(
      seeded,
      deleteCustomFont.fulfilled("alpha", "internal-id", "alpha"),
    );
    expect(next.customFonts.map((f) => f.id)).toEqual(["beta"]);
  });
});

describe("settingsReducer — locale preferences", () => {
  it("defaults to relative / 24h / monday / null region on a fresh init", () => {
    const s = initial();
    expect(s.localePrefs.dateFormat).toBe("relative");
    expect(s.localePrefs.timeFormat).toBe("24h");
    expect(s.localePrefs.weekStart).toBe("monday");
    expect(s.localePrefs.region).toBeNull();
  });

  it("setDateFormat updates the dateFormat slot", () => {
    const next = settingsReducer(initial(), setDateFormat("absolute"));
    expect(next.localePrefs.dateFormat).toBe("absolute");
  });

  it("setTimeFormat updates the timeFormat slot", () => {
    const next = settingsReducer(initial(), setTimeFormat("12h"));
    expect(next.localePrefs.timeFormat).toBe("12h");
  });

  it("setWeekStart updates the weekStart slot", () => {
    const next = settingsReducer(initial(), setWeekStart("sunday"));
    expect(next.localePrefs.weekStart).toBe("sunday");
  });

  it("setRegion accepts a code and clears with null", () => {
    const on = settingsReducer(initial(), setRegion("GB"));
    expect(on.localePrefs.region).toBe("GB");
    const off = settingsReducer(on, setRegion(null));
    expect(off.localePrefs.region).toBeNull();
  });

  it("falls back to defaults when the backend payload omits localePrefs", () => {
    // Simulate an old settings.json with no `localePrefs` block on appearance.
    const payload = appSettings();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (payload.appearance as any).localePrefs;
    const next = settingsReducer(initial(), loadSettings.fulfilled(payload, "id", undefined));
    expect(next.localePrefs.dateFormat).toBe("relative");
    expect(next.localePrefs.timeFormat).toBe("24h");
    expect(next.localePrefs.weekStart).toBe("monday");
    expect(next.localePrefs.region).toBeNull();
  });

  it("hydrates localePrefs from the backend appearance block", () => {
    const payload = appSettings({
      appearance: {
        themeId: "dark",
        followsSystem: false,
        primaryColor: "blue",
        font: "inter",
        codeFont: "jetbrains-mono",
        codeLigatures: "standard",
        fontSize: "md",
        translucency: { enabled: false, intensity: 30, blurIntensity: 30 },
        localePrefs: {
          dateFormat: "absolute",
          timeFormat: "12h",
          weekStart: "sunday",
          region: "GB",
        },
      },
    });
    const next = settingsReducer(initial(), loadSettings.fulfilled(payload, "id", undefined));
    expect(next.localePrefs.dateFormat).toBe("absolute");
    expect(next.localePrefs.timeFormat).toBe("12h");
    expect(next.localePrefs.weekStart).toBe("sunday");
    expect(next.localePrefs.region).toBe("GB");
  });
});
