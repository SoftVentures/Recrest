import { type Ref, forwardRef } from "react";

import { styled } from "@mui/material/styles";

import { X as ClearIcon, Search as SearchIcon } from "lucide-react";

import GeneralIconButton, {
  IconButtonShape,
  IconButtonSize,
} from "@/components/atoms/buttons/GeneralIconButton";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

interface WrapperProps {
  width?: number | string;
  height?: number;
}

// eslint-disable-next-line no-restricted-syntax -- a <label> wraps icon + input so clicking the icon focuses the input
const Wrapper = styled("label", {
  shouldForwardProp: (p) => p !== "width" && p !== "height",
})<WrapperProps>(({ theme, width, height = 30 }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(7),
  height,
  width,
  padding: pxToRems(0, 10),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.information,
  fontSize: fontPxToRem(12),
  "&:focus-within": {
    borderColor: theme.palette.border.hover,
  },
}));

// eslint-disable-next-line no-restricted-syntax -- native form control required for accessibility / autofocus / IME
const NativeInput = styled("input")(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  background: "transparent",
  border: 0,
  outline: "none",
  fontSize: fontPxToRem(12),
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  "&::placeholder": { color: theme.palette.text.information },
}));

export interface GeneralSearchInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  width?: number | string;
  height?: number;
  hideIcon?: boolean;
  /** Accessible label for the clear (X) button. Required so screen readers
   *  announce the action — pull from the `aria` i18n namespace at the call site. */
  clearLabel: string;
  /** Accessible label for the input itself. Required because the icon-only
   *  visual gives no other affordance for assistive tech. */
  "aria-label": string;
  "data-testid"?: string;
  clearTestId?: string;
}

const GeneralSearchInput = forwardRef(function GeneralSearchInput(
  {
    value,
    onChange,
    placeholder,
    width = 240,
    height,
    hideIcon = false,
    clearLabel,
    "aria-label": ariaLabel,
    "data-testid": testId,
    clearTestId,
  }: GeneralSearchInputProps,
  ref: Ref<HTMLInputElement>,
) {
  return (
    <Wrapper width={width} height={height}>
      {!hideIcon && <SearchIcon size={pxToRem(13)} aria-hidden />}
      <NativeInput
        ref={ref}
        type="text"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
      />
      {value && (
        <GeneralIconButton
          size={IconButtonSize.XS}
          shape={IconButtonShape.CIRCLE}
          aria-label={clearLabel}
          onClick={() => onChange("")}
          data-testid={clearTestId}
          icon={<ClearIcon size={pxToRem(11)} aria-hidden />}
        />
      )}
    </Wrapper>
  );
});

export default GeneralSearchInput;
