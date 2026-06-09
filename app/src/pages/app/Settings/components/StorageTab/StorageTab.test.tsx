import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { StorageSection } from "@/pages/app/Settings/components/StorageTab";
import * as settingsActions from "@/store/actions/settings.actions";
import { renderWithProviders } from "@/test/utils";

describe("StorageSection", () => {
  it("renders the diagnostics crash-reporting toggle", () => {
    const { getByTestId } = renderWithProviders(<StorageSection />);

    expect(getByTestId(TEST_IDS.settings.storage.crashReporting)).toBeInTheDocument();
  });

  it("dispatches setCrashReporting(true) when the toggle is switched on", () => {
    const spy = vi.spyOn(settingsActions, "setCrashReporting");
    const { getByTestId } = renderWithProviders(<StorageSection />);

    const input = getByTestId(TEST_IDS.settings.storage.crashReporting).querySelector("input");
    expect(input).not.toBeNull();
    if (input) fireEvent.click(input);

    expect(spy).toHaveBeenCalledWith(true);
  });
});
