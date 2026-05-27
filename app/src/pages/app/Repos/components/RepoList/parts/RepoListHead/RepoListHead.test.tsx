import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { RepoListHead } from "@/pages/app/Repos/components/RepoList/parts/RepoListHead";
import { renderWithProviders } from "@/test/utils";

describe("RepoListHead", () => {
  it("clicking the Name header toggles name:asc → name:desc", () => {
    const onSort = vi.fn();
    renderWithProviders(<RepoListHead sort="name:asc" onSort={onSort} />);

    fireEvent.click(screen.getByTestId(TEST_IDS.repos.sortHeader("name")));

    expect(onSort).toHaveBeenCalledWith("name:desc");
  });

  it("clicking the Activity header sorts by lastModified:desc", () => {
    const onSort = vi.fn();
    renderWithProviders(<RepoListHead sort="default" onSort={onSort} />);

    fireEvent.click(screen.getByTestId(TEST_IDS.repos.sortHeader("lastModified")));

    expect(onSort).toHaveBeenCalledWith("lastModified:desc");
  });

  it("renders static headers (no sort affordance) when onSort is absent", () => {
    renderWithProviders(<RepoListHead />);

    expect(screen.queryByTestId(TEST_IDS.repos.sortHeader("name"))).toBeNull();
  });
});
