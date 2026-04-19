import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/molecules/compounds/Dialog";

describe("Dialog", () => {
  it("rendert den Trigger", () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Titel</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
  });

  it("öffnet den Dialog beim Klick auf den Trigger", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Mein Titel</DialogTitle>
          <DialogDescription>Beschreibung</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByText("Mein Titel")).toBeInTheDocument();
    expect(screen.getByText("Beschreibung")).toBeInTheDocument();
  });

  it("rendert im kontrollierten Modus geöffnet", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Open Dialog</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText("Open Dialog")).toBeInTheDocument();
  });
});
