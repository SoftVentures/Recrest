import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BranchFilterChip } from "@/components/molecules/BranchFilterChip";

describe("BranchFilterChip", () => {
  it("rendert Label und Counter", () => {
    render(
      <BranchFilterChip active={false} onClick={() => {}} count={7}>
        Open
      </BranchFilterChip>,
    );
    expect(screen.getByRole("button", { name: /Open/ })).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("setzt die active-Klasse, wenn active=true", () => {
    render(
      <BranchFilterChip active onClick={() => {}}>
        x
      </BranchFilterChip>,
    );
    expect(screen.getByRole("button").className).toContain("active");
  });

  it("ruft onClick beim Klick auf", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <BranchFilterChip active={false} onClick={onClick}>
        x
      </BranchFilterChip>,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
