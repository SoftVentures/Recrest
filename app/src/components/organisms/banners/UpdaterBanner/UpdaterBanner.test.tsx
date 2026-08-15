import { TauriCommand } from "@recrest/shared";

import { act, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import UpdaterBanner from "@/components/organisms/banners/UpdaterBanner";
import { UPDATER_PROGRESS_EVENT } from "@/lib/constants/events.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { INSTALL_CHANNEL } from "@/lib/constants/updater.constants";
import type { UpdaterBannerState } from "@/store/types/ui.types";
import { makeTestStore, renderWithProviders } from "@/test/utils";

const invoke = vi.fn();
const openExternal = vi.fn();
const unlisten = vi.fn();
const progressListeners: Array<(event: { payload: unknown }) => void> = [];

vi.mock("@/lib/tauri", () => ({
  isTauri: () => true,
  invoke: (command: string, args?: Record<string, unknown>) => invoke(command, args),
  openExternal: (url: string) => openExternal(url),
  listen: (event: string, handler: (e: { payload: unknown }) => void) => {
    if (event === UPDATER_PROGRESS_EVENT) progressListeners.push(handler);
    return Promise.resolve(unlisten);
  },
}));

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (msg: string) => toastError(msg) } }));

const AUTO_INSTALL_BANNER: UpdaterBannerState = {
  version: "1.4.0",
  currentVersion: "1.3.2",
  body: null,
  canAutoInstall: true,
  downloadUrl: null,
};

const MANUAL_BANNER: UpdaterBannerState = {
  version: "1.4.0",
  currentVersion: "1.3.2",
  body: null,
  canAutoInstall: false,
  downloadUrl: "https://example.test/recrest-v1.4.0-windows-x64.exe",
};

/** What a Flatpak/Snap/distro install reports: the version notice is welcome,
 *  the in-app install is not ours to run. */
const PACKAGE_MANAGED_BANNER: UpdaterBannerState = {
  version: "1.4.0",
  currentVersion: "1.3.2",
  body: null,
  canAutoInstall: false,
  installChannel: INSTALL_CHANNEL.SYSTEM_PACKAGE,
  downloadUrl: "https://example.test/recrest-v1.4.0-linux-x64.deb",
};

function renderBanner(banner: UpdaterBannerState) {
  const store = makeTestStore({ ui: { updaterBanner: banner } });
  return renderWithProviders(<UpdaterBanner />, { store });
}

/** Let the `await listen(...)` inside the progress effect settle. */
async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("UpdaterBanner", () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue(undefined);
    openExternal.mockReset();
    openExternal.mockResolvedValue(undefined);
    unlisten.mockClear();
    toastError.mockReset();
    progressListeners.length = 0;
  });

  it("renders nothing when no banner is set in store", () => {
    const { queryByTestId } = renderWithProviders(<UpdaterBanner />);
    expect(queryByTestId(TEST_IDS.updaterBanner.root)).toBeNull();
  });

  it("shows only the install button on the auto-install path", () => {
    const { getByTestId, queryByTestId } = renderBanner(AUTO_INSTALL_BANNER);
    expect(getByTestId(TEST_IDS.updaterBanner.install)).toBeTruthy();
    expect(queryByTestId(TEST_IDS.updaterBanner.download)).toBeNull();
  });

  it("invokes INSTALL_UPDATE when install is clicked", async () => {
    const { getByTestId } = renderBanner(AUTO_INSTALL_BANNER);

    fireEvent.click(getByTestId(TEST_IDS.updaterBanner.install));
    await flush();

    expect(invoke).toHaveBeenCalledWith(TauriCommand.INSTALL_UPDATE, undefined);
  });

  it("surfaces a toast and re-enables the button when the install fails", async () => {
    invoke.mockRejectedValue(new Error("updater init"));
    const { getByTestId } = renderBanner(AUTO_INSTALL_BANNER);

    fireEvent.click(getByTestId(TEST_IDS.updaterBanner.install));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect((getByTestId(TEST_IDS.updaterBanner.install) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );
  });

  it("reports download progress while installing", async () => {
    const { getByTestId, queryByTestId } = renderBanner(AUTO_INSTALL_BANNER);
    expect(queryByTestId(TEST_IDS.updaterBanner.progress)).toBeNull();

    // Never resolves — mirrors the real command, which restarts the app instead
    // of returning.
    invoke.mockReturnValue(new Promise(() => {}));
    fireEvent.click(getByTestId(TEST_IDS.updaterBanner.install));
    await flush();

    expect(getByTestId(TEST_IDS.updaterBanner.progress)).toBeTruthy();

    await act(async () => {
      for (const handler of progressListeners) handler({ payload: { chunk: 25, total: 100 } });
      await Promise.resolve();
    });

    expect(getByTestId(TEST_IDS.updaterBanner.progress).textContent).toContain("25");
  });

  it("opens the download URL externally on the manual path", async () => {
    const { getByTestId, queryByTestId } = renderBanner(MANUAL_BANNER);
    expect(queryByTestId(TEST_IDS.updaterBanner.install)).toBeNull();

    fireEvent.click(getByTestId(TEST_IDS.updaterBanner.download));
    await flush();

    expect(openExternal).toHaveBeenCalledWith(MANUAL_BANNER.downloadUrl);
  });

  it("surfaces a toast when opening the download URL fails", async () => {
    openExternal.mockRejectedValue(new Error("no opener"));
    const { getByTestId } = renderBanner(MANUAL_BANNER);

    fireEvent.click(getByTestId(TEST_IDS.updaterBanner.download));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
  });

  it("drops the download button when the backend found no matching asset", () => {
    const { queryByTestId } = renderBanner({ ...MANUAL_BANNER, downloadUrl: null });
    expect(queryByTestId(TEST_IDS.updaterBanner.download)).toBeNull();
    expect(queryByTestId(TEST_IDS.updaterBanner.dismiss)).toBeTruthy();
  });

  it("replaces every install action with a channel hint on a package-managed install", () => {
    const { getByTestId, queryByTestId } = renderBanner(PACKAGE_MANAGED_BANNER);

    expect(getByTestId(TEST_IDS.updaterBanner.channelHint)).toBeTruthy();
    expect(queryByTestId(TEST_IDS.updaterBanner.install)).toBeNull();
    expect(queryByTestId(TEST_IDS.updaterBanner.download)).toBeNull();
    // The version notice and the dismiss affordance stay — knowing about the
    // update is the point.
    expect(getByTestId(TEST_IDS.updaterBanner.root).textContent).toContain("1.4.0");
    expect(getByTestId(TEST_IDS.updaterBanner.dismiss)).toBeTruthy();
  });

  it("never offers an install on a package-managed install, even if the backend said it could", () => {
    // Belt and braces: a stale `canAutoInstall: true` must not win over the
    // channel gate.
    const { queryByTestId } = renderBanner({ ...PACKAGE_MANAGED_BANNER, canAutoInstall: true });
    expect(queryByTestId(TEST_IDS.updaterBanner.install)).toBeNull();
    expect(queryByTestId(TEST_IDS.updaterBanner.channelHint)).toBeTruthy();
  });

  it("keeps the install button on a self-updating channel", () => {
    const { getByTestId, queryByTestId } = renderBanner({
      ...AUTO_INSTALL_BANNER,
      installChannel: INSTALL_CHANNEL.APP_IMAGE,
    });
    expect(getByTestId(TEST_IDS.updaterBanner.install)).toBeTruthy();
    expect(queryByTestId(TEST_IDS.updaterBanner.channelHint)).toBeNull();
  });

  it("clears the banner when dismiss is clicked", () => {
    const { getByTestId, queryByTestId, store } = renderBanner(MANUAL_BANNER);

    fireEvent.click(getByTestId(TEST_IDS.updaterBanner.dismiss));

    expect(store.getState().ui.updaterBanner).toBeNull();
    expect(queryByTestId(TEST_IDS.updaterBanner.root)).toBeNull();
  });

  it("unsubscribes from the progress channel on unmount", async () => {
    invoke.mockReturnValue(new Promise(() => {}));
    const { getByTestId, unmount } = renderBanner(AUTO_INSTALL_BANNER);

    fireEvent.click(getByTestId(TEST_IDS.updaterBanner.install));
    await flush();

    unmount();

    expect(unlisten).toHaveBeenCalledTimes(1);
  });
});
