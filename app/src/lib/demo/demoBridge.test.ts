import { DemoBridgeMessageType } from "@recrest/shared";

import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeId } from "@/lib/constants/theme.constants";
import { installDemoBridge, readDemoParams } from "@/lib/demo/demoBridge";
import { setLocale, setThemeId } from "@/store/actions/settings.actions";

describe("readDemoParams", () => {
  it("parses supported theme and locale", () => {
    expect(readDemoParams("?theme=dark&lng=de")).toEqual({ themeId: "dark", locale: "de" });
  });

  it("rejects unknown values", () => {
    expect(readDemoParams("?theme=hotdog&lng=xx")).toEqual({ themeId: null, locale: null });
  });

  it("handles missing params", () => {
    expect(readDemoParams("")).toEqual({ themeId: null, locale: null });
  });
});

describe("installDemoBridge", () => {
  let uninstall: (() => void) | undefined;
  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
  });

  it("dispatches setThemeId and setLocale for valid messages", () => {
    const dispatch = vi.fn();
    const changeLanguage = vi.fn();
    uninstall = installDemoBridge({ dispatch }, changeLanguage);

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: DemoBridgeMessageType.SET_THEME, value: ThemeId.DARK },
      }),
    );
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(setThemeId(ThemeId.DARK));

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: DemoBridgeMessageType.SET_LOCALE, value: "de" },
      }),
    );
    expect(changeLanguage).toHaveBeenCalledWith("de");
    expect(dispatch).toHaveBeenCalledWith(setLocale("de"));
  });

  it("ignores malformed messages", () => {
    const dispatch = vi.fn();
    const changeLanguage = vi.fn();
    uninstall = installDemoBridge({ dispatch }, changeLanguage);

    window.dispatchEvent(new MessageEvent("message", { data: { type: "evil", value: "x" } }));
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: DemoBridgeMessageType.SET_THEME, value: "not-a-theme" },
      }),
    );
    expect(dispatch).not.toHaveBeenCalled();
    expect(changeLanguage).not.toHaveBeenCalled();
  });

  it("stops listening after the returned cleanup runs", () => {
    const dispatch = vi.fn();
    const changeLanguage = vi.fn();
    const stop = installDemoBridge({ dispatch }, changeLanguage);
    stop();

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: DemoBridgeMessageType.SET_THEME, value: ThemeId.DARK },
      }),
    );
    expect(dispatch).not.toHaveBeenCalled();
  });
});
