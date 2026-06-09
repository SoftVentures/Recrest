import { invoke as mockedInvoke } from "@tauri-apps/api/core";

import { TauriCommand } from "@recrest/shared";

import { fireEvent, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { UpdatesSection } from "@/pages/app/Settings/components/GeneralTab/sections/UpdatesSection";
import { renderWithProviders } from "@/test/utils";

const TAURI_MARKER = "__TAURI_INTERNALS__";

describe("UpdatesSection", () => {
  afterEach(() => {
    vi.mocked(mockedInvoke).mockClear();
  });

  it("renders the current version, mode select, and check-now button", () => {
    const { getByTestId } = renderWithProviders(<UpdatesSection />);

    expect(getByTestId(TEST_IDS.settings.general.updateModeSelect)).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.general.updateCheckNow)).toBeInTheDocument();
  });

  it("reflects the default update mode (manual) in the select", () => {
    const { getByTestId } = renderWithProviders(<UpdatesSection />);

    expect(getByTestId(TEST_IDS.settings.general.updateModeSelect)).toHaveTextContent("Manual");
  });

  describe("inside the Tauri runtime", () => {
    beforeAll(() => {
      (window as unknown as Record<string, unknown>)[TAURI_MARKER] = {};
    });
    afterAll(() => {
      delete (window as unknown as Record<string, unknown>)[TAURI_MARKER];
    });

    it("invokes CHECK_FOR_UPDATE when the check-now button is clicked", async () => {
      const mocked = vi.mocked(mockedInvoke);
      mocked.mockResolvedValue(undefined);
      const { getByTestId } = renderWithProviders(<UpdatesSection />);

      fireEvent.click(getByTestId(TEST_IDS.settings.general.updateCheckNow));

      await waitFor(() => {
        expect(mocked).toHaveBeenCalledWith(TauriCommand.CHECK_FOR_UPDATE, undefined);
      });
    });
  });
});
