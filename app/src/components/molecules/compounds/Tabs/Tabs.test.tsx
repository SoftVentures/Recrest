import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/molecules/compounds/Tabs";

describe("Tabs", () => {
  it("rendert den Default-Tab-Inhalt", () => {
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">Erster</TabsTrigger>
          <TabsTrigger value="two">Zweiter</TabsTrigger>
        </TabsList>
        <TabsContent value="one">Inhalt 1</TabsContent>
        <TabsContent value="two">Inhalt 2</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText("Inhalt 1")).toBeInTheDocument();
    expect(screen.queryByText("Inhalt 2")).toBeNull();
  });

  it("wechselt den Inhalt beim Klick auf einen anderen Tab", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">Erster</TabsTrigger>
          <TabsTrigger value="two">Zweiter</TabsTrigger>
        </TabsList>
        <TabsContent value="one">Inhalt 1</TabsContent>
        <TabsContent value="two">Inhalt 2</TabsContent>
      </Tabs>,
    );
    await user.click(screen.getByRole("tab", { name: "Zweiter" }));
    expect(screen.getByText("Inhalt 2")).toBeInTheDocument();
  });

  it("markiert den aktiven Tab mit data-state=active", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">x</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute("data-state", "active");
  });
});
