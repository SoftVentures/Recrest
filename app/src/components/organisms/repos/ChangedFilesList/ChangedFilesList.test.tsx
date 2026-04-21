import type { ReactElement } from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ChangedFile } from "@recrest/shared";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { ChangedFilesList } from "@/components/organisms/repos/ChangedFilesList";
import "@/i18n";

function file(path: string, status: ChangedFile["status"]): ChangedFile {
  return { path, status, kind: "modified", hasUnstagedChanges: false };
}

function renderWithTooltip(ui: ReactElement) {
  return render(<TooltipProvider delayDuration={0}>{ui}</TooltipProvider>);
}

describe("ChangedFilesList", () => {
  it("shows the clean-state message when no files are passed", () => {
    renderWithTooltip(<ChangedFilesList files={[]} truncated={false} />);
    expect(screen.getByText(/clean/i)).toBeInTheDocument();
  });

  it("renders one row per file with its status marker", () => {
    renderWithTooltip(
      <ChangedFilesList
        files={[file("src/a.ts", "staged"), file("src/b.ts", "unstaged")]}
        truncated={false}
      />,
    );
    expect(screen.getByText("src/a.ts")).toBeInTheDocument();
    expect(screen.getByText("src/b.ts")).toBeInTheDocument();
  });

  it("shows a truncation banner when the list was capped", () => {
    renderWithTooltip(<ChangedFilesList files={[file("x", "staged")]} truncated />);
    // "More files changed — showing the first entries."
    expect(screen.getByText(/more files changed/i)).toBeInTheDocument();
  });
});
