import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import GeneralModal from "@/components/molecules/modals/GeneralModal";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithProviders } from "@/test/utils";

describe("GeneralModal", () => {
  it("renders the dialog body when open", () => {
    const { getByTestId } = renderWithProviders(
      <GeneralModal
        open
        data-testid={COMPONENT_TEST_IDS.molecules.modal.root}
        customTitle="Hello"
        contentChildren={<Box data-testid={COMPONENT_TEST_IDS.molecules.modal.body}>body</Box>}
        onCloseModal={() => {}}
      />,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.molecules.modal.root)).toBeInTheDocument();
    expect(getByTestId(COMPONENT_TEST_IDS.molecules.modal.body)).toBeInTheDocument();
  });

  it("does not render the dialog when closed", () => {
    const { queryByTestId } = renderWithProviders(
      <GeneralModal
        open={false}
        data-testid={COMPONENT_TEST_IDS.molecules.modal.root}
        customTitle="Hello"
        contentChildren={<Box data-testid={COMPONENT_TEST_IDS.molecules.modal.body}>body</Box>}
        onCloseModal={() => {}}
      />,
    );
    expect(queryByTestId(COMPONENT_TEST_IDS.molecules.modal.body)).toBeNull();
  });
});
