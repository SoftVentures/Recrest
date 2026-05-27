import { describe, expect, it } from "vitest";

import UpdaterBanner from "@/components/organisms/banners/UpdaterBanner";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("UpdaterBanner", () => {
  it("renders nothing when no banner is set in store", () => {
    const { queryByTestId } = renderWithProviders(<UpdaterBanner />);
    expect(queryByTestId(TEST_IDS.updaterBanner.root)).toBeNull();
  });
});
