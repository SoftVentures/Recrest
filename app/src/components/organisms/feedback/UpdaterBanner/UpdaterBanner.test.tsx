import type { ReactElement } from "react";

import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UpdaterBanner } from "@/components/organisms/feedback/UpdaterBanner";
import "@/i18n";
import { setUpdaterBanner, uiReducer } from "@/store/slices/uiSlice";

// Mock tauri bridge — all IPC and shell interactions should be mockable so
// the banner can be exercised in a jsdom environment without __TAURI__.
const openExternalMock = vi.fn<(url: string) => Promise<void>>(() => Promise.resolve());
const invokeMock = vi.fn<(command: string, args?: Record<string, unknown>) => Promise<unknown>>(
  () => Promise.resolve(),
);

vi.mock("@/lib/tauri", () => ({
  invoke: (command: string, args?: Record<string, unknown>) => invokeMock(command, args),
  openExternal: (url: string) => openExternalMock(url),
  isTauri: () => false,
}));

function makeStore() {
  return configureStore({ reducer: { ui: uiReducer } });
}

function renderWithStore(ui: ReactElement, store = makeStore()) {
  const utils = render(<Provider store={store}>{ui}</Provider>);
  return { ...utils, store };
}

beforeEach(() => {
  openExternalMock.mockClear();
  invokeMock.mockClear();
});

describe("UpdaterBanner", () => {
  it("renders nothing when there is no pending update", () => {
    const { container } = renderWithStore(<UpdaterBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the install button for auto-install-capable builds", () => {
    const { store } = renderWithStore(<UpdaterBanner />);
    act(() => {
      store.dispatch(
        setUpdaterBanner({
          version: "1.2.3",
          currentVersion: "1.2.2",
          body: "notes",
          canAutoInstall: true,
          downloadUrl: null,
        }),
      );
    });
    expect(screen.getByTestId("updater-banner-install")).toBeInTheDocument();
    expect(screen.queryByTestId("updater-banner-download")).not.toBeInTheDocument();
  });

  it("shows the download button for manual builds and opens the download URL", () => {
    const { store } = renderWithStore(<UpdaterBanner />);
    act(() => {
      store.dispatch(
        setUpdaterBanner({
          version: "1.2.3",
          body: null,
          canAutoInstall: false,
          downloadUrl: "https://x",
        }),
      );
    });
    const downloadBtn = screen.getByTestId("updater-banner-download");
    expect(downloadBtn).toBeInTheDocument();
    expect(screen.queryByTestId("updater-banner-install")).not.toBeInTheDocument();

    act(() => {
      fireEvent.click(downloadBtn);
    });
    expect(openExternalMock).toHaveBeenCalledWith("https://x");
  });

  it("clears the banner when the user clicks Later", () => {
    const { store } = renderWithStore(<UpdaterBanner />);
    act(() => {
      store.dispatch(
        setUpdaterBanner({
          version: "1.2.3",
          body: null,
          canAutoInstall: true,
          downloadUrl: null,
        }),
      );
    });
    expect(store.getState().ui.updaterBanner).not.toBeNull();

    act(() => {
      fireEvent.click(screen.getByTestId("updater-banner-later"));
    });
    expect(store.getState().ui.updaterBanner).toBeNull();
  });
});
