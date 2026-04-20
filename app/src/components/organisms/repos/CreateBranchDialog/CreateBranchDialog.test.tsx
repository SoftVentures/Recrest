import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { CreateBranchDialog } from "@/components/organisms/repos/CreateBranchDialog";
import "@/i18n";
import { store } from "@/store";

describe("CreateBranchDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <Provider store={store}>
        <CreateBranchDialog open={false} repoId="repo-1" onClose={() => {}} />
      </Provider>,
    );
    expect(document.querySelector("[role='dialog']")).toBeNull();
  });

  it("mounts the dialog when open", () => {
    render(
      <Provider store={store}>
        <CreateBranchDialog open repoId="repo-1" onClose={() => {}} />
      </Provider>,
    );
    expect(document.querySelector("[role='dialog']")).not.toBeNull();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
  });
});
