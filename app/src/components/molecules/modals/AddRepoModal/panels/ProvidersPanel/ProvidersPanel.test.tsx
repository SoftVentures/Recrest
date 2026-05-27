import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import ProvidersPanel from "@/components/molecules/modals/AddRepoModal/panels/ProvidersPanel";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithProviders } from "@/test/utils";

describe("ProvidersPanel", () => {
  it("renders inside its wrapper when no providers are connected", () => {
    const { getByTestId } = renderWithProviders(
      <Box data-testid={COMPONENT_TEST_IDS.molecules.providersPanel.wrap}>
        <ProvidersPanel connectedProviders={[]} onClose={() => {}} />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.molecules.providersPanel.wrap).firstChild).not.toBeNull();
  });
});
