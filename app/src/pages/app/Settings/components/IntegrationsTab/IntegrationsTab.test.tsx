import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { IntegrationsSection } from "@/pages/app/Settings/components/IntegrationsTab";
import { setScanPaths } from "@/store/actions/repos.actions";
import { makeTestStore, renderWithProviders } from "@/test/utils";

describe("IntegrationsSection scan paths", () => {
  it("lists the scan paths from the repos slice", () => {
    const store = makeTestStore();
    store.dispatch(setScanPaths(["~/Code", "~/Work"]));
    const { getByText } = renderWithProviders(<IntegrationsSection />, { store });

    expect(getByText("~/Code")).toBeInTheDocument();
    expect(getByText("~/Work")).toBeInTheDocument();
  });

  it("removing a scan path drops it from the rendered list", () => {
    const store = makeTestStore();
    store.dispatch(setScanPaths(["~/Code", "~/Work"]));
    const { queryByText, getByTestId } = renderWithProviders(<IntegrationsSection />, { store });

    fireEvent.click(getByTestId(TEST_IDS.settings.integrations.scanRemove("~/Work")));
    // The optimistic dispatch yanks the row from the list synchronously
    // (saveSettings is fire-and-forget for the UI's purposes).
    expect(queryByText("~/Work")).toBeNull();
  });
});
