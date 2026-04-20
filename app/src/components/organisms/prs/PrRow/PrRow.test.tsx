import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PrRow } from "@/components/organisms/prs/PrRow";
import "@/i18n";
import { makePullRequest } from "@/test-utils/fixtures";

describe("PrRow", () => {
  it("renders title, repo + author metadata", () => {
    render(
      <PrRow
        pr={makePullRequest({ title: "hello", number: 42, author: "alice" })}
        repoName="app"
      />,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText(/app · #42 · alice/)).toBeInTheDocument();
  });

  it("marks drafts with a draft badge", () => {
    render(<PrRow pr={makePullRequest({ draft: true })} repoName="app" />);
    expect(screen.getByText(/draft/i)).toBeInTheDocument();
  });
});
