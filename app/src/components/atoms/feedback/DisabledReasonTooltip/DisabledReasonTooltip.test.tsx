import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import DisabledReasonTooltip from "@/components/atoms/feedback/DisabledReasonTooltip";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

const ID = COMPONENT_TEST_IDS.atoms.disabledReasonTooltip.child;

/** Resolves the text an `aria-describedby` chain points at. */
function describedText(el: HTMLElement): string {
  const ids = (el.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
  return ids
    .map((id) => el.ownerDocument.getElementById(id)?.textContent ?? "")
    .join(" ")
    .trim();
}

/**
 * The reason used to be hover-only. A disabled `<button>` is not focusable and
 * MUI's tooltip needs pointer events, so keyboard and screen-reader users got no
 * explanation at all — the control simply read as unavailable.
 */
describe("DisabledReasonTooltip", () => {
  it("describes the disabled control with the reason", () => {
    const { getByTestId } = renderWithTheme(
      <DisabledReasonTooltip reason="Nothing to pull">
        <button data-testid={ID} disabled aria-label="Pull" />
      </DisabledReasonTooltip>,
    );

    expect(describedText(getByTestId(ID))).toBe("Nothing to pull");
  });

  it("keeps the control's own accessible name intact", () => {
    // A label describes *what* the control does; the reason must not replace it.
    const { getByTestId } = renderWithTheme(
      <DisabledReasonTooltip reason="Nothing to pull">
        <button data-testid={ID} disabled aria-label="Pull" />
      </DisabledReasonTooltip>,
    );

    expect(getByTestId(ID).getAttribute("aria-label")).toBe("Pull");
  });

  it("appends to a description the child already had", () => {
    const { getByTestId } = renderWithTheme(
      <>
        <Box component="span" id="own-hint">
          Fast-forward only
        </Box>
        <DisabledReasonTooltip reason="Nothing to pull">
          <button data-testid={ID} disabled aria-describedby="own-hint" />
        </DisabledReasonTooltip>
      </>,
    );

    expect(describedText(getByTestId(ID))).toBe("Fast-forward only Nothing to pull");
  });

  it("adds no description while the control is usable", () => {
    const { getByTestId } = renderWithTheme(
      <DisabledReasonTooltip reason={null} title="Pull">
        <button data-testid={ID} aria-label="Pull" />
      </DisabledReasonTooltip>,
    );

    expect(getByTestId(ID).getAttribute("aria-describedby")).toBeNull();
  });
});
