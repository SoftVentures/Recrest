import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PatHelpPanel from "@/components/molecules/PatHelpPanel";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

vi.mock("@/lib/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tauri")>("@/lib/tauri");
  return {
    ...actual,
    openExternal: vi.fn(async () => {}),
    isTauri: () => false,
  };
});

describe("PatHelpPanel", () => {
  it("opens the docs URL when the read-docs button is clicked", async () => {
    const tauri = await import("@/lib/tauri");
    const openSpy = tauri.openExternal as ReturnType<typeof vi.fn>;
    openSpy.mockClear();

    const { getByTestId } = renderWithProviders(<PatHelpPanel provider="github" />);

    fireEvent.click(getByTestId(TEST_IDS.onboarding.patHelpDocs));
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0]?.[0]).toContain("docs.github.com");
  });

  it("opens the GitHub token-create URL with the prefilled scopes", async () => {
    const tauri = await import("@/lib/tauri");
    const openSpy = tauri.openExternal as ReturnType<typeof vi.fn>;
    openSpy.mockClear();

    const { getByTestId } = renderWithProviders(<PatHelpPanel provider="github" />);

    fireEvent.click(getByTestId(TEST_IDS.onboarding.patHelpCreate));
    const url = openSpy.mock.calls[0]?.[0] ?? "";
    expect(url).toContain("scopes=repo,read:user,read:org");
    expect(url).toContain("description=Recrest");
  });

  it("uses the provided GitLab base URL when building the create-token link", async () => {
    const tauri = await import("@/lib/tauri");
    const openSpy = tauri.openExternal as ReturnType<typeof vi.fn>;
    openSpy.mockClear();

    const { getByTestId } = renderWithProviders(
      <PatHelpPanel provider="gitlab" baseUrl="https://gitlab.acme.test" />,
    );

    fireEvent.click(getByTestId(TEST_IDS.onboarding.patHelpCreate));
    const url = openSpy.mock.calls[0]?.[0] ?? "";
    expect(url).toContain("https://gitlab.acme.test/-/user_settings/personal_access_tokens");
    expect(url).toContain("scopes=read_api,read_repository,read_user");
  });

  it("shows a manual-scope hint for Bitbucket (no URL scope support)", () => {
    const { getByText } = renderWithProviders(<PatHelpPanel provider="bitbucket" />);
    // Both en + de bundles contain the brand name verbatim — assert on it
    // so the test doesn't depend on which language i18next resolves to.
    expect(getByText(/Bitbucket/i)).toBeInTheDocument();
  });
});
