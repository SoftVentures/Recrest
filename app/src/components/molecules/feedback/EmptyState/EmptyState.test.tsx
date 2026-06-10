import { describe, expect, it } from "vitest";

import EmptyState from "@/components/molecules/feedback/EmptyState";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithTheme } from "@/test/utils";

describe("EmptyState", () => {
  it("renders title and description", () => {
    const { getByText, getByTestId } = renderWithTheme(
      <EmptyState title="Nothing here" description="Try adding a repo" />,
    );
    expect(getByTestId(TEST_IDS.emptyState)).toBeInTheDocument();
    expect(getByText("Nothing here")).toBeInTheDocument();
    expect(getByText("Try adding a repo")).toBeInTheDocument();
  });
});
