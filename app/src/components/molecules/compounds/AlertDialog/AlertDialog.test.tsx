import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/molecules/compounds/AlertDialog";

describe("AlertDialog", () => {
  it("rendert den Trigger und zeigt Titel nach dem Öffnen", async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Achtung</AlertDialogTitle>
            <AlertDialogDescription>Bist du sicher?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByText("Achtung")).toBeInTheDocument();
    expect(screen.getByText("Bist du sicher?")).toBeInTheDocument();
  });

  it("rendert kontrolliert als open", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Titel</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText("Titel")).toBeInTheDocument();
  });

  it("triggert Action-Button onClick", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>T</AlertDialogTitle>
          <AlertDialogAction onClick={onAction}>OK</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(onAction).toHaveBeenCalled();
  });
});
