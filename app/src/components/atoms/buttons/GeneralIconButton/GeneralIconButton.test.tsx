import { fireEvent } from "@testing-library/react";
import { X } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import GeneralIconButton from "@/components/atoms/buttons/GeneralIconButton";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralIconButton", () => {
  it("fires onClick", () => {
    const onClick = vi.fn();
    const { getByTestId } = renderWithTheme(
      <GeneralIconButton
        data-testid={COMPONENT_TEST_IDS.atoms.iconButton.root}
        aria-label="Close"
        onClick={onClick}
        icon={<X size={14} />}
      />,
    );
    fireEvent.click(getByTestId(COMPONENT_TEST_IDS.atoms.iconButton.root));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
