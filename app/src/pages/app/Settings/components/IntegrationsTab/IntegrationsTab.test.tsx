import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { IntegrationsSection } from "@/pages/app/Settings/components/IntegrationsTab";
import { setScanPaths } from "@/store/actions/repos.actions";
import * as settingsActions from "@/store/actions/settings.actions";
import { makeTestStore, renderWithProviders } from "@/test/utils";

describe("IntegrationsSection scan paths", () => {
  it("lists the scan paths from the repos slice", () => {
    const store = makeTestStore();
    store.dispatch(setScanPaths(["~/Code", "~/Work"]));
    const { getByTestId } = renderWithProviders(<IntegrationsSection />, { store });

    expect(
      getByTestId(TEST_IDS.settings.integrations.scanDefaultRadio("~/Work")),
    ).toBeInTheDocument();
  });

  it("marking a scan path as default persists it via saveSettings({ defaultScanPath })", () => {
    const store = makeTestStore();
    store.dispatch(setScanPaths(["~/Code", "~/Work"]));
    const saveSpy = vi.spyOn(settingsActions, "saveSettings");
    const { getByRole } = renderWithProviders(<IntegrationsSection />, { store });

    fireEvent.click(getByRole("radio", { name: /~\/Work/ }));

    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ defaultScanPath: "~/Work" }));
  });
});
