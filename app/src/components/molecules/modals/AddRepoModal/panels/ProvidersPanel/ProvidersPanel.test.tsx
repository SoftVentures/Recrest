import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import ProvidersPanel from "@/components/molecules/modals/AddRepoModal/panels/ProvidersPanel";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { SEED_SETTINGS } from "@/lib/dev/seed/settings";
import { makeTestStore, renderWithProviders } from "@/test/utils";

describe("ProvidersPanel", () => {
  it("renders inside its wrapper when no providers are connected", () => {
    const { getByTestId } = renderWithProviders(
      <Box data-testid={COMPONENT_TEST_IDS.molecules.providersPanel.wrap}>
        <ProvidersPanel connectedProviders={[]} onClose={() => {}} />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.molecules.providersPanel.wrap).firstChild).not.toBeNull();
  });

  it("preselects the default provider from settings", () => {
    const store = makeTestStore({
      settings: {
        backend: { ...SEED_SETTINGS, repoImportDefaults: { providerId: "gitlab", groupId: null } },
      },
    });
    const { getByTestId } = renderWithProviders(
      <ProvidersPanel connectedProviders={["github", "gitlab"]} onClose={() => {}} />,
      { store },
    );
    expect(getByTestId(TEST_IDS.addRepoDialog.providerItem("gitlab"))).toHaveAttribute(
      "data-active",
      "true",
    );
  });

  it("falls back to the first connected provider when the default is not connected", () => {
    const store = makeTestStore({
      settings: {
        backend: {
          ...SEED_SETTINGS,
          repoImportDefaults: { providerId: "bitbucket", groupId: null },
        },
      },
    });
    const { getByTestId } = renderWithProviders(
      <ProvidersPanel connectedProviders={["github", "gitlab"]} onClose={() => {}} />,
      { store },
    );
    expect(getByTestId(TEST_IDS.addRepoDialog.providerItem("github"))).toHaveAttribute(
      "data-active",
      "true",
    );
  });
});
