import type { RemoteRepository } from "@recrest/shared";

import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RepoRowCard from "@/components/molecules/modals/AddRepoModal/panels/ProvidersPanel/parts/RepoRowCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

const sampleRepo: RemoteRepository = {
  id: "1",
  providerId: "github",
  fullName: "recrest/example",
  name: "example",
  ownerLogin: "recrest",
  description: "Example repository used in tests.",
  language: "TypeScript",
  isPrivate: false,
  isFork: false,
  isArchived: false,
  defaultBranch: "main",
  cloneUrlHttps: "https://github.com/recrest/example.git",
  cloneUrlSsh: "git@github.com:recrest/example.git",
  updatedAt: "2025-02-15T10:00:00Z",
  pushedAt: "2025-02-15T10:00:00Z",
  htmlUrl: "https://github.com/recrest/example",
  sizeKb: 1024,
  ownerAvatarUrl: null,
};

describe("RepoRowCard", () => {
  it("toggles selection when the checkbox is clicked", () => {
    const onToggle = vi.fn();
    const { getByTestId } = renderWithProviders(
      <RepoRowCard repo={sampleRepo} selected={false} alreadyLocal={false} onToggle={onToggle} />,
    );
    const checkbox = getByTestId(TEST_IDS.addRepoDialog.rowCheckbox);
    fireEvent.click(checkbox.querySelector("input") ?? checkbox);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
