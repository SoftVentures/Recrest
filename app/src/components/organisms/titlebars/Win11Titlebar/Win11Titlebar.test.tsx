import { describe, expect, it } from "vitest";

import Win11Titlebar from "@/components/organisms/titlebars/Win11Titlebar";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("Win11Titlebar", () => {
  it("renders the win11 titlebar root", () => {
    const { getByTestId } = renderWithProviders(<Win11Titlebar isMaximized={false} />);
    expect(getByTestId(TEST_IDS.titlebar.win11)).toBeInTheDocument();
  });
});
