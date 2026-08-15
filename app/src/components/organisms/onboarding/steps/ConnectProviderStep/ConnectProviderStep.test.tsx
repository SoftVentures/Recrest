import { invoke as mockedInvoke } from "@tauri-apps/api/core";

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import ConnectProviderStep from "@/components/organisms/onboarding/steps/ConnectProviderStep";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

const TAURI_MARKER = "__TAURI_INTERNALS__";

beforeAll(() => {
  (window as unknown as Record<string, unknown>)[TAURI_MARKER] = {};
});
afterAll(() => {
  delete (window as unknown as Record<string, unknown>)[TAURI_MARKER];
});
afterEach(() => {
  vi.mocked(mockedInvoke).mockReset();
});

function byTestId(id: string): HTMLElement {
  return screen.getByTestId(id);
}

describe("ConnectProviderStep", () => {
  it("keeps the credentials typed for a newly picked provider when the previous connect resolves", async () => {
    vi.mocked(mockedInvoke).mockImplementation((_cmd: string, args?: unknown) =>
      Promise.resolve({
        providerId: (args as { providerId: string }).providerId,
        displayName: (args as { providerId: string }).providerId,
        connected: true,
        username: "someone",
        supportsOauth: false,
        baseUrl: null,
      }),
    );

    renderWithProviders(<ConnectProviderStep onBack={() => {}} onNext={() => {}} />);

    fireEvent.click(byTestId(TEST_IDS.onboarding.providerPick("gitlab")));
    fireEvent.change(byTestId(TEST_IDS.onboarding.providerToken), {
      target: { value: "token-gitlab" },
    });
    fireEvent.click(byTestId(TEST_IDS.onboarding.providerConnect));

    // Switch providers and type new credentials while the GitLab connect is
    // still inside `useActionFeedback`'s minimum-loading window.
    await waitFor(() => expect(byTestId(TEST_IDS.onboarding.providerConnected)).toBeTruthy());
    fireEvent.click(byTestId(TEST_IDS.onboarding.providerPick("bitbucket")));
    fireEvent.change(byTestId(TEST_IDS.onboarding.providerUsername), {
      target: { value: "octo-user" },
    });
    fireEvent.change(byTestId(TEST_IDS.onboarding.providerToken), {
      target: { value: "token-bitbucket" },
    });

    await waitFor(() =>
      expect((byTestId(TEST_IDS.onboarding.providerConnect) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );
    expect((byTestId(TEST_IDS.onboarding.providerToken) as HTMLInputElement).value).toBe(
      "token-bitbucket",
    );
    expect((byTestId(TEST_IDS.onboarding.providerUsername) as HTMLInputElement).value).toBe(
      "octo-user",
    );
  });
});
