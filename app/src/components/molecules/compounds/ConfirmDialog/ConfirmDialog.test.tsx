import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "@/components/molecules/compounds/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("rendert Titel und Description wenn offen", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Wirklich löschen?"
        description="Das kann nicht rückgängig gemacht werden."
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText("Wirklich löschen?")).toBeInTheDocument();
    expect(screen.getByText("Das kann nicht rückgängig gemacht werden.")).toBeInTheDocument();
  });

  it("rendert nichts wenn geschlossen", () => {
    render(
      <ConfirmDialog open={false} onOpenChange={() => {}} title="Hidden" onConfirm={() => {}} />,
    );
    expect(screen.queryByText("Hidden")).toBeNull();
  });

  it("ruft onConfirm beim Klick auf den Bestätigen-Button auf", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Bestätigen?"
        confirmLabel="Ja, löschen"
        onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Ja, löschen" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("zeigt die 'don't ask again'-Checkbox bei rememberKey", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Test"
        rememberKey="test.key"
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });
});
