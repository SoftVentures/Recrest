import type { ProviderConnection } from "@recrest/shared";

import { fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type ProviderId } from "@/lib/constants/providers.constants";
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
  // The PatHelpPanel only mounts after the user opens the connect form.
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
      fireEvent.click(getByTestId(TEST_IDS.onboarding.patHelpCreate));
      // The exact URL is composed inside PROVIDER_PAT_INFO; we don't assert
      // the full string here (that contract is tested by the molecule + shared
      // unit tests). We only confirm openExternal was invoked with a non-empty
      // URL — i.e. the panel mounted and the button is wired through.
      expect(open).toHaveBeenCalledTimes(1);
      const [arg] = open.mock.calls[0]!;
      expect(typeof arg).toBe("string");
      expect((arg as string).length).toBeGreaterThan(0);
    },
  );

  it("derives a self-hosted gitlab token url from the variant draft", () => {
    const open = vi.spyOn(tauri, "openExternal").mockResolvedValue(undefined);
    const { getByTestId } = renderProviderRow("gitlab", "https://git.example.com/api/v4");
    fireEvent.click(getByTestId(TEST_IDS.onboarding.patHelpCreate));
    const [arg] = open.mock.calls[0]!;
    expect(arg).toEqual(expect.stringContaining("git.example.com"));
  });
});

describe("ProviderRow base URL editing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["github", "gitlab", "bitbucket"] as const)(
    "renders an editable base URL input for %s",
    (providerId) => {
      const { getByTestId } = renderProviderRow(providerId);
      const input = getByTestId(TEST_IDS.settings.accounts.baseUrlInput);
      expect(input).toBeInTheDocument();
      expect((input as HTMLInputElement).readOnly).toBe(false);
    },
  );

  it.each(["github", "gitlab", "bitbucket"] as const)(
    "invokes ping_provider with the provider id when Test connection is clicked for %s",
    async (providerId) => {
      const invokeSpy = vi.spyOn(tauri, "invoke").mockResolvedValue({
        reachable: true,
        looksLikeProvider: true,
        version: null,
        error: null,
      });
      const { getByTestId } = renderProviderRow(providerId);
      fireEvent.click(getByTestId(TEST_IDS.settings.accounts.testConnection));
      await waitFor(() => expect(invokeSpy).toHaveBeenCalled());
      const [cmd, args] = invokeSpy.mock.calls[0]!;
      expect(cmd).toBe("ping_provider");
      expect((args as { provider: string }).provider).toBe(providerId);
      expect(typeof (args as { baseUrl: string }).baseUrl).toBe("string");
    },
  );
});

describe("ProviderRow connection status", () => {
  const renderWithState = (state: ProviderConnection["authState"], connected: boolean) => {
    const store = makeTestStore({
      providers: {
        connections: {
          github: { ...connection("github", null), connected, authState: state },
        },
      },
    });
    return renderWithProviders(<ProviderRow providerId="github" />, { store });
  };

  it("separates a rejected token from a provider that was never connected", () => {
    const { getByTestId } = renderWithState("invalid", false);
    const pill = getByTestId(TEST_IDS.settings.accounts.statusPill("github"));
    expect(pill.textContent).toBe("Token rejected");
  });

  it("shows the plain disconnected state when no credentials are stored", () => {
    const { getByTestId } = renderWithState("disconnected", false);
    const pill = getByTestId(TEST_IDS.settings.accounts.statusPill("github"));
    expect(pill.textContent).toBe("Not connected");
  });

  it("shows the connected state when the token is accepted", () => {
    const { getByTestId } = renderWithState("connected", true);
    const pill = getByTestId(TEST_IDS.settings.accounts.statusPill("github"));
    expect(pill.textContent).toBe("Connected");
  });
});
