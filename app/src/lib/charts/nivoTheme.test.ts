import { type ReactNode, createElement } from "react";

import { ThemeProvider, createTheme } from "@mui/material/styles";

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildNivoTheme, useNivoTheme } from "@/lib/charts/nivoTheme";

describe("buildNivoTheme", () => {
  it("maps MUI palette into nivo axis/grid/tooltip slots", () => {
    const mui = createTheme({ palette: { mode: "dark" } });
    const nivo = buildNivoTheme(mui);
    expect(nivo.axis?.ticks?.text?.fill).toBe(mui.palette.text.secondary);
    expect(nivo.grid?.line?.stroke).toBe(mui.palette.divider);
    expect(nivo.tooltip?.container?.background).toBe(mui.palette.background.paper);
    expect(nivo.text?.fontFamily).toBe(mui.typography.fontFamily);
  });

  it("produces different tooltip backgrounds for light vs dark", () => {
    const light = buildNivoTheme(createTheme({ palette: { mode: "light" } }));
    const dark = buildNivoTheme(createTheme({ palette: { mode: "dark" } }));
    expect(light.tooltip?.container?.background).not.toBe(dark.tooltip?.container?.background);
  });

  it("emits usable font sizes for a theme built without uiScale", () => {
    // `ThemeOptions["uiScale"]` is optional, so this theme has no `uiScale` at
    // runtime. A missing fallback made every size `NaN`, which the canvas
    // renderer stringifies to `"NaNpx"` and drops all chart text.
    const nivo = buildNivoTheme(createTheme());
    expect(nivo.text?.fontSize).toBe(11);
    expect(nivo.axis?.ticks?.text?.fontSize).toBe(11);
  });

  it("scales font sizes with the active interface scale", () => {
    const nivo = buildNivoTheme(createTheme({ uiScale: 1.5 }));
    expect(nivo.text?.fontSize).toBe(16.5);
  });
});

describe("useNivoTheme", () => {
  it("derives the nivo theme from the surrounding MUI ThemeProvider", () => {
    const mui = createTheme({ palette: { mode: "dark" } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(ThemeProvider, { theme: mui }, children);
    const { result } = renderHook(() => useNivoTheme(), { wrapper });
    expect(result.current.grid?.line?.stroke).toBe(mui.palette.divider);
    expect(result.current.text?.fontFamily).toBe(mui.typography.fontFamily);
  });
});
