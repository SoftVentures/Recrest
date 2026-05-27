import { describe, expect, it } from "vitest";

import MacOverlayTitlebar from "@/components/organisms/titlebars/MacOverlayTitlebar";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("MacOverlayTitlebar", () => {
  it("renders the mac titlebar root", () => {
    const { getByTestId } = renderWithProviders(<MacOverlayTitlebar />);
    expect(getByTestId(TEST_IDS.titlebar.mac)).toBeInTheDocument();
  });
});
