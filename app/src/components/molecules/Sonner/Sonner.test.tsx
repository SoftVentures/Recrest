import type { ReactElement } from "react";

import { configureStore } from "@reduxjs/toolkit";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { Toaster } from "@/components/molecules/Sonner";
import { settingsReducer } from "@/store/slices/settingsSlice";

function renderWithStore(ui: ReactElement) {
  const store = configureStore({ reducer: { settings: settingsReducer } });
  return render(<Provider store={store}>{ui}</Provider>);
}

describe("Sonner Toaster", () => {
  it("rendert ohne Crash im Default-Theme", () => {
    expect(() => renderWithStore(<Toaster />)).not.toThrow();
  });

  it("akzeptiert eine Position-Override ohne Crash", () => {
    expect(() => renderWithStore(<Toaster position="top-right" />)).not.toThrow();
  });
});
