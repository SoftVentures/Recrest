import { act, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it } from "vitest";

import { UpdaterBanner } from "@/components/organisms/feedback/UpdaterBanner";
import "@/i18n";
import { store } from "@/store";
import { setUpdaterBanner } from "@/store/slices/uiSlice";

afterEach(() => {
  store.dispatch(setUpdaterBanner(null));
});

describe("UpdaterBanner", () => {
  it("renders nothing when there is no pending update", () => {
    const { container } = render(
      <Provider store={store}>
        <UpdaterBanner />
      </Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders version + body when a banner is set", () => {
    render(
      <Provider store={store}>
        <UpdaterBanner />
      </Provider>,
    );
    act(() => {
      store.dispatch(setUpdaterBanner({ version: "1.2.3", body: "new goodies" }));
    });
    expect(screen.getByText(/1\.2\.3/)).toBeInTheDocument();
    expect(screen.getByText("new goodies")).toBeInTheDocument();
  });
});
