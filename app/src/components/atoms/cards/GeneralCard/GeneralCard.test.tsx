import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralCard", () => {
  it("renders the card surface", () => {
    const { getByTestId } = renderWithTheme(
      <GeneralCard testId={COMPONENT_TEST_IDS.atoms.card.root} title="Activity">
        <Box data-testid={COMPONENT_TEST_IDS.atoms.card.body}>body</Box>
      </GeneralCard>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.card.root)).toBeInTheDocument();
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.card.body)).toBeInTheDocument();
  });

  it("hides the body and renders a skeleton when loading", () => {
    const { getByTestId, queryByTestId } = renderWithTheme(
      <GeneralCard testId={COMPONENT_TEST_IDS.atoms.card.root} title="Activity" loading>
        <Box data-testid={COMPONENT_TEST_IDS.atoms.card.body}>body</Box>
      </GeneralCard>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.card.root)).toBeInTheDocument();
    expect(queryByTestId(COMPONENT_TEST_IDS.atoms.card.body)).toBeNull();
  });
});
