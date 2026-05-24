import { forwardRef } from "react";

import { Button, type ButtonProps as MuiButtonProps } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCircularLoader, {
  CircularLoaderSize,
} from "@/components/atoms/loaders/GeneralCircularLoader";

export type GeneralButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

export type GeneralButtonSize = "default" | "sm" | "lg";

export interface GeneralButtonProps extends Omit<MuiButtonProps, "variant" | "size" | "color"> {
  variant?: GeneralButtonVariant;
  size?: GeneralButtonSize;
  loading?: boolean;
}

interface StyledButtonProps {
  variantKind?: GeneralButtonVariant;
}

function mapVariant(variant: GeneralButtonVariant): {
  muiVariant: MuiButtonProps["variant"];
  muiColor: MuiButtonProps["color"];
} {
  switch (variant) {
    case "destructive":
      return { muiVariant: "contained", muiColor: "error" };
    case "outline":
      return { muiVariant: "outlined", muiColor: "primary" };
    case "secondary":
      return { muiVariant: "contained", muiColor: "secondary" };
    case "ghost":
      return { muiVariant: "text", muiColor: "inherit" };
    case "link":
      return { muiVariant: "text", muiColor: "primary" };
    case "default":
    default:
      return { muiVariant: "contained", muiColor: "primary" };
  }
}

function mapSize(size: GeneralButtonSize): MuiButtonProps["size"] {
  if (size === "sm") return "small";
  if (size === "lg") return "large";
  return "medium";
}

const StyledButton = styled(Button, {
  shouldForwardProp: (p) => p !== "variantKind",
})<StyledButtonProps>(({ variantKind }) => ({
  textTransform: "none",
  ...(variantKind === "link"
    ? {
        textDecoration: "underline",
        "&:hover": { textDecoration: "underline" },
      }
    : {}),
}));

const GeneralButton = forwardRef<HTMLButtonElement, GeneralButtonProps>(function GeneralButton(
  {
    variant = "default",
    size = "default",
    loading = false,
    disabled,
    children,
    startIcon,
    ...rest
  },
  ref,
) {
  const { muiVariant, muiColor } = mapVariant(variant);
  return (
    <StyledButton
      ref={ref}
      variantKind={variant}
      variant={muiVariant}
      color={muiColor}
      size={mapSize(size)}
      disabled={disabled || loading}
      startIcon={
        loading ? <GeneralCircularLoader size={CircularLoaderSize.SM} color="inherit" /> : startIcon
      }
      {...rest}
    >
      {children}
    </StyledButton>
  );
});

export default GeneralButton;
