import { useEffect } from "react";

const SCROLLBAR_WIDTH_VAR = "--recrest-scrollbar-width";

/**
 * Measures the platform scrollbar width once at mount and exposes it as a
 * CSS custom property on `<html>`. Header chrome uses it to add matching
 * right-padding so the header's right edge lines up with the page content's
 * right edge — pages reserve a `scrollbar-gutter: stable` slot, the header
 * doesn't scroll, so without this compensation the header would visually
 * extend 17 px past the page content on platforms with classic scrollbars
 * (Windows, macOS with "Show scrollbars: Always").
 *
 * On platforms with overlay scrollbars (macOS default) the measurement
 * returns 0 and the variable simply contributes nothing.
 */
export function useScrollbarWidth(): void {
  useEffect(() => {
    const probe = document.createElement("div");
    probe.style.cssText =
      "overflow:scroll;visibility:hidden;position:absolute;width:50px;height:50px;top:-9999px";
    document.body.appendChild(probe);
    const width = probe.offsetWidth - probe.clientWidth;
    document.body.removeChild(probe);
    document.documentElement.style.setProperty(SCROLLBAR_WIDTH_VAR, `${width}px`);
  }, []);
}
