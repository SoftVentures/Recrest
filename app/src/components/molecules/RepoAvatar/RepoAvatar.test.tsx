import type { ReactElement } from "react";

import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { RepoAvatar } from "@/components/molecules/RepoAvatar";
import { settingsReducer } from "@/store/slices/settingsSlice";

function renderWithStore(ui: ReactElement) {
  const store = configureStore({ reducer: { settings: settingsReducer } });
  return render(<Provider store={store}>{ui}</Provider>);
}

describe("RepoAvatar", () => {
  it("rendert einen Buchstaben-Kachel für einen Repo ohne Logo", () => {
    renderWithStore(<RepoAvatar repo={{ id: "r1", name: "Recrest" }} />);
    expect(screen.getByText("R")).toBeInTheDocument();
  });

  it("nutzt den Namen als title-Attribut", () => {
    const { container } = renderWithStore(<RepoAvatar repo={{ id: "r2", name: "MyRepo" }} />);
    expect(container.querySelector('[title="MyRepo"]')).not.toBeNull();
  });

  it("respektiert die size-Prop", () => {
    const { container } = renderWithStore(
      <RepoAvatar repo={{ id: "r3", name: "Big" }} size={64} />,
    );
    const el = container.querySelector(".repo-avatar") as HTMLElement;
    expect(el.style.width).toBe("64px");
    expect(el.style.height).toBe("64px");
  });
});
