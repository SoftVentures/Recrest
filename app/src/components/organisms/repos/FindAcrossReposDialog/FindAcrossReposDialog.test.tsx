import { act, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it } from "vitest";

import { FindAcrossReposDialog } from "@/components/organisms/repos/FindAcrossReposDialog";
import "@/i18n";
import { store } from "@/store";
import { setFindDialogOpen } from "@/store/slices/uiSlice";

afterEach(() => {
  act(() => {
    store.dispatch(setFindDialogOpen(false));
  });
});

describe("FindAcrossReposDialog", () => {
  it("renders nothing while closed", () => {
    render(
      <Provider store={store}>
        <FindAcrossReposDialog />
      </Provider>,
    );
    expect(document.querySelector("[role='dialog']")).toBeNull();
  });

  it("opens when the UI slice flips `findDialogOpen`", () => {
    render(
      <Provider store={store}>
        <FindAcrossReposDialog />
      </Provider>,
    );
    act(() => {
      store.dispatch(setFindDialogOpen(true));
    });
    expect(document.querySelector("[role='dialog']")).not.toBeNull();
  });
});
