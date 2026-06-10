import type { ProviderConnection } from "@recrest/shared";

import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PROVIDER_CREATE_TOKEN_URLS, type ProviderId } from "@/lib/constants/providers.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import * as tauri from "@/lib/tauri";
import ProviderRow from "@/pages/app/Settings/components/AccountsTab/parts/ProviderRow";
import { makeTestStore, renderWithProviders } from "@/test/utils";

const connection = (providerId: ProviderId, baseUrl: string | null): ProviderConnection => ({
  providerId,
  displayName: providerId,
  connected: false,
  username: null,
  supportsOauth: false,
  baseUrl,
});

function renderProviderRow(providerId: ProviderId, baseUrl: string | null = null) {
  const store = makeTestStore({
    providers: { connections: { [providerId]: connection(providerId, baseUrl) } },
  });
  const utils = renderWithProviders(<ProviderRow providerId={providerId} />, { store });
  // The token-creation link only mounts inside the expanded token form.
  fireEvent.click(utils.getByTestId(TEST_IDS.settings.accounts.connectButton));
  return utils;
}

describe("ProviderRow token deep link", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["github", "gitlab", "bitbucket"] as const)(
    "opens the cloud token-creation url for %s",
    (providerId) => {
      const open = vi.spyOn(tauri, "openExternal").mockResolvedValue(undefined);
      const { getByTestId } = renderProviderRow(providerId);
      fireEvent.click(getByTestId(TEST_IDS.settings.accounts.tokenCreateLink));
      expect(open).toHaveBeenCalledWith(PROVIDER_CREATE_TOKEN_URLS[providerId]);
    },
  );

  it("derives the self-hosted gitlab token url from the connection base url", () => {
    const open = vi.spyOn(tauri, "openExternal").mockResolvedValue(undefined);
    const { getByTestId } = renderProviderRow("gitlab", "https://git.example.com/api/v4");
    fireEvent.click(getByTestId(TEST_IDS.settings.accounts.tokenCreateLink));
    expect(open).toHaveBeenCalledWith(expect.stringContaining("https://git.example.com"));
    expect(open).not.toHaveBeenCalledWith(PROVIDER_CREATE_TOKEN_URLS.gitlab);
  });
});
