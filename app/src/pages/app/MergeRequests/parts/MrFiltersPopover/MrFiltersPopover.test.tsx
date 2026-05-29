import { CiStatus } from "@recrest/shared";

import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import MrFiltersPopover, {
  type AuthorOption,
  type RepoOption,
} from "@/pages/app/MergeRequests/parts/MrFiltersPopover/index";
import { EMPTY_MR_FILTERS } from "@/pages/app/MergeRequests/utils/mrFilters";
import { renderWithProviders } from "@/test/utils";

const REPOS: RepoOption[] = [
  { id: "r1", name: "Recrest", count: 3 },
  { id: "r2", name: "Other", count: 1 },
];
const AUTHORS: AuthorOption[] = [
  { login: "alice", count: 2 },
  { login: "bob", count: 1 },
];

function setup(overrides: Partial<React.ComponentProps<typeof MrFiltersPopover>> = {}) {
  const anchor = document.createElement("button");
  document.body.appendChild(anchor);
  const onChange = vi.fn();
  const onClose = vi.fn();
  const utils = renderWithProviders(
    <MrFiltersPopover
      open
      anchorEl={anchor}
      filters={EMPTY_MR_FILTERS}
      onChange={onChange}
      onClose={onClose}
      repos={REPOS}
      authors={AUTHORS}
      hasDrafts
      {...overrides}
    />,
  );
  return { ...utils, onChange, onClose };
}

describe("MrFiltersPopover", () => {
  it("renders all four sections when there are drafts", () => {
    const { getByTestId, getByText } = setup();
    expect(getByTestId(TEST_IDS.mr.filterPopover)).toBeTruthy();
    expect(getByTestId(TEST_IDS.mr.filterRepoOption("r1"))).toBeTruthy();
    expect(getByTestId(TEST_IDS.mr.filterAuthorOption("alice"))).toBeTruthy();
    expect(getByTestId(TEST_IDS.mr.filterDraftToggle)).toBeTruthy();
    expect(getByTestId(TEST_IDS.mr.filterCiOption(CiStatus.SUCCESS))).toBeTruthy();
    expect(getByText("Recrest")).toBeTruthy();
  });

  it("hides the draft toggle section when no drafts exist", () => {
    const { queryByTestId } = setup({ hasDrafts: false });
    expect(queryByTestId(TEST_IDS.mr.filterDraftToggle)).toBeNull();
  });

  it("emits onChange with the toggled repo added to the set", () => {
    const { getByTestId, onChange } = setup();
    fireEvent.click(getByTestId(TEST_IDS.mr.filterRepoOption("r1")));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0]!;
    expect([...next.repoIds]).toEqual(["r1"]);
  });

  it("emits onChange with the toggled author added to the set", () => {
    const { getByTestId, onChange } = setup();
    fireEvent.click(getByTestId(TEST_IDS.mr.filterAuthorOption("bob")));
    const next = onChange.mock.calls[0]![0]!;
    expect([...next.authors]).toEqual(["bob"]);
  });

  it("emits onChange flipping includeDrafts", () => {
    const { getByTestId, onChange } = setup();
    fireEvent.click(getByTestId(TEST_IDS.mr.filterDraftToggle));
    expect(onChange.mock.calls[0]![0]!.includeDrafts).toBe(false);
  });

  it("emits onChange with the toggled CI status", () => {
    const { getByTestId, onChange } = setup();
    fireEvent.click(getByTestId(TEST_IDS.mr.filterCiOption(CiStatus.FAILURE)));
    expect([...onChange.mock.calls[0]![0]!.ciStatuses]).toEqual([CiStatus.FAILURE]);
  });

  it("reset button is disabled when filters are empty and resets when dirty", () => {
    const { getByTestId, onChange } = setup({
      filters: {
        repoIds: new Set(["r1"]),
        authors: new Set(["alice"]),
        ciStatuses: new Set([CiStatus.SUCCESS]),
        includeDrafts: false,
      },
    });
    const reset = getByTestId(TEST_IDS.mr.filterReset) as HTMLButtonElement;
    expect(reset.disabled).toBe(false);
    fireEvent.click(reset);
    const cleared = onChange.mock.calls.at(-1)![0]!;
    expect(cleared.repoIds.size).toBe(0);
    expect(cleared.authors.size).toBe(0);
    expect(cleared.ciStatuses.size).toBe(0);
    expect(cleared.includeDrafts).toBe(true);
  });

  it("reset is disabled when state is the empty default", () => {
    const { getByTestId } = setup();
    const reset = getByTestId(TEST_IDS.mr.filterReset) as HTMLButtonElement;
    expect(reset.disabled).toBe(true);
  });
});
