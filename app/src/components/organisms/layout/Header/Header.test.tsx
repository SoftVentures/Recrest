import { describe, expect, it } from "vitest";

import Header from "@/components/organisms/layout/Header";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("Header", () => {
  it("renders the app header root", () => {
    const { getByTestId } = renderWithProviders(<Header />);
    expect(getByTestId(TEST_IDS.header.root)).toBeInTheDocument();
  });
});
