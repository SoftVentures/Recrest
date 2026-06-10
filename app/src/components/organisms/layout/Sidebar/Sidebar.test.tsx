import { describe, expect, it } from "vitest";

import Sidebar from "@/components/organisms/layout/Sidebar";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("Sidebar", () => {
  it("renders the sidebar root", () => {
    const { getByTestId } = renderWithProviders(<Sidebar />);
    expect(getByTestId(TEST_IDS.sidebar.root)).toBeInTheDocument();
  });
});
