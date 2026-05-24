import type { SearchHit } from "@recrest/shared";

import { act, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FindAcrossReposDialog from "@/components/organisms/repos/FindAcrossReposDialog";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("FindAcrossReposDialog", () => {
  it("renders root + input when open", () => {
    const { getByTestId } = renderWithProviders(
      <FindAcrossReposDialog open onClose={() => {}} search={async () => []} />,
    );
    expect(getByTestId(TEST_IDS.findAcrossDialog.root)).toBeTruthy();
    expect(getByTestId(TEST_IDS.findAcrossDialog.input)).toBeTruthy();
  });

  it("does not render the result list below the min-query threshold", () => {
    const { queryByTestId } = renderWithProviders(
      <FindAcrossReposDialog open onClose={() => {}} search={async () => []} />,
    );
    expect(queryByTestId(TEST_IDS.findAcrossDialog.list)).toBeNull();
  });

  it("renders matching rows after typing a query", async () => {
    const hit: SearchHit = {
      repoId: "r1",
      repoName: "demo",
      path: "src/foo.ts",
      line: 7,
      column: 1,
      snippet: "hello world",
    };
    const search = vi.fn(async () => [hit]);
    const { getByTestId } = renderWithProviders(
      <FindAcrossReposDialog open onClose={() => {}} search={search} />,
    );
    const input = getByTestId(TEST_IDS.findAcrossDialog.input) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "hello" } });
    });
    await waitFor(() => expect(search).toHaveBeenCalledWith("hello"), { timeout: 1000 });
    await waitFor(() => expect(getByTestId(TEST_IDS.findAcrossDialog.row("0"))).toBeTruthy(), {
      timeout: 1000,
    });
  });
});
