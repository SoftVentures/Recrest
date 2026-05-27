import { describe, expect, it } from "vitest";

import GnomeTitlebar from "@/components/organisms/titlebars/GnomeTitlebar";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("GnomeTitlebar", () => {
  it("renders the gnome titlebar root", () => {
    const { getByTestId } = renderWithProviders(<GnomeTitlebar />);
    expect(getByTestId(TEST_IDS.titlebar.gnome)).toBeInTheDocument();
  });
});
