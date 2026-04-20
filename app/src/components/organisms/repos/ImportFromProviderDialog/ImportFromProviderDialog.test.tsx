import { act, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it } from "vitest";

import { ImportFromProviderDialog } from "@/components/organisms/repos/ImportFromProviderDialog";
import "@/i18n";
import { store } from "@/store";
import { setImportDialogOpen } from "@/store/slices/uiSlice";

afterEach(() => {
  act(() => {
    store.dispatch(setImportDialogOpen(false));
  });
});

describe("ImportFromProviderDialog", () => {
  it("renders nothing while closed", () => {
    render(
      <Provider store={store}>
        <ImportFromProviderDialog />
      </Provider>,
    );
    expect(document.querySelector("[role='dialog']")).toBeNull();
  });

  it("mounts the dialog when the UI slice flips `importDialogOpen`", () => {
    render(
      <Provider store={store}>
        <ImportFromProviderDialog />
      </Provider>,
    );
    act(() => {
      store.dispatch(setImportDialogOpen(true));
    });
    expect(document.querySelector("[role='dialog']")).not.toBeNull();
  });
});
