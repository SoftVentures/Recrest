import React from "react";

import { Box, styled } from "@mui/material";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import { useDevice } from "@/hooks/useDevice";

interface GeneralIconButtonProps {
  id?: string;
  icon: React.ReactNode;
  onAction?: (_e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => void;
  noMargin?: boolean;
  noPadding?: boolean;
  bigIcon?: boolean;
  hugeIcon?: boolean;
  customIconSize?: number;
  forChat?: boolean;
  title?: string;
  placement?: "top" | "bottom" | "left" | "right";
  noBackground?: boolean;
  fixedBackground?: boolean;
  customBackgroundColor?: string;
  customColor?: string;
  hoverAllowed?: boolean;
  toolTipMaxWidth?: string;
  tooltipArrow?: boolean;
  rounded?: boolean;
  disabled?: boolean;
  isActive?: boolean;
}

const IconButton = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== "noMargin" &&
    prop !== "noPadding" &&
    prop !== "bigIcon" &&
    prop !== "hugeIcon" &&
    prop !== "customIconSize" &&
    prop !== "forChat" &&
    prop !== "noBackground" &&
    prop !== "fixedBackground" &&
    prop !== "customBackgroundColor" &&
    prop !== "customColor" &&
    prop !== "hoverAllowed" &&
    prop !== "rounded" &&
    prop !== "disabled" &&
    prop !== "isActive",
})<Omit<GeneralIconButtonProps, "icon">>(
  ({
    theme,
    noMargin,
    noPadding,
    bigIcon,
    hugeIcon,
    customIconSize,
    forChat,
    noBackground,
    fixedBackground,
    customBackgroundColor,
    customColor,
    hoverAllowed,
    rounded,
    disabled,
    isActive,
  }) => ({
    display: "flex",
    alignItems: "center",
    borderRadius: rounded ? "50%" : theme.spacing(1),
    padding: noPadding ? 0 : "4px",
    marginRight: noMargin ? 0 : 8,
    backgroundColor: disabled
      ? "transparent"
      : fixedBackground
        ? theme.palette.surface.interface.background
        : forChat
          ? theme.palette.surface.interface.base
          : customBackgroundColor
            ? customBackgroundColor
            : `transparent`,
    backgroundImage: "unset",
    color: disabled
      ? theme.palette.icon.disabled
      : isActive
        ? theme.palette.primary.main
        : forChat
          ? theme.palette.icon.secondary
          : customColor
            ? customColor
            : theme.palette.text.default,
    border: forChat ? `1px solid ${theme.palette.border.separator}` : undefined,
    ...(hoverAllowed && {
      "&:hover": {
        backgroundColor:
          disabled || noBackground
            ? "transparent"
            : customBackgroundColor
              ? customBackgroundColor
              : theme.palette.surface.button.hoverLight,
        "& path": {
          fill: disabled
            ? theme.palette.icon.disabled
            : customColor
              ? customColor
              : theme.palette.icon.primary,
        },
        "& span": {
          color: disabled
            ? theme.palette.icon.disabled
            : customColor
              ? customColor
              : theme.palette.icon.primary,
        },
        "& svg": {
          color: disabled
            ? theme.palette.icon.disabled
            : customColor
              ? customColor
              : theme.palette.icon.primary,
        },
      },
      "&:active": {
        backgroundColor:
          disabled || noBackground ? "transparent" : theme.palette.surface.button.secondary,
        "& path": {
          fill: disabled
            ? theme.palette.icon.disabled
            : customColor
              ? customColor
              : theme.palette.icon.primary,
        },
        "& span": {
          color: disabled
            ? theme.palette.icon.disabled
            : customColor
              ? customColor
              : theme.palette.icon.primary,
        },
        "& svg": {
          color: disabled
            ? theme.palette.icon.disabled
            : customColor
              ? customColor
              : theme.palette.icon.primary,
        },
      },
    }),
    "& span": {
      width: customIconSize ? customIconSize : hugeIcon ? 24 : bigIcon ? 20 : 16,
      height: customIconSize ? customIconSize : hugeIcon ? 24 : bigIcon ? 20 : 16,
      fontSize: customIconSize ? customIconSize : hugeIcon ? "24px" : bigIcon ? "20px" : "16px",
      cursor: !disabled && "pointer",
      color: disabled
        ? theme.palette.icon.disabled
        : isActive
          ? theme.palette.primary.main
          : forChat
            ? theme.palette.icon.secondary
            : customColor
              ? customColor
              : theme.palette.text.default,
    },
    "& svg": {
      width: customIconSize ? customIconSize : hugeIcon ? 24 : bigIcon ? 20 : 16,
      height: customIconSize ? customIconSize : hugeIcon ? 24 : bigIcon ? 20 : 16,
      fontSize: customIconSize ? customIconSize : hugeIcon ? "24px" : bigIcon ? "20px" : "16px",
      cursor: !disabled && "pointer",
      color: disabled
        ? theme.palette.icon.disabled
        : isActive
          ? theme.palette.primary.main
          : forChat
            ? theme.palette.icon.secondary
            : customColor
              ? customColor
              : theme.palette.text.default,
    },
  }),
);

const GeneralIconButton: React.FC<GeneralIconButtonProps> = ({
  id,
  icon,
  onAction,
  noMargin = false,
  noPadding = false,
  bigIcon = false,
  hugeIcon = false,
  customIconSize,
  forChat = false,
  title,
  placement,
  tooltipArrow = true,
  noBackground = false,
  fixedBackground = false,
  customBackgroundColor,
  customColor,
  hoverAllowed = true,
  rounded = false,
  disabled = false,
  isActive = false,
}) => {
  const { isMobile, isTablet } = useDevice();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if ((e.key === "Enter" || e.key === " ") && !disabled) {
      e.preventDefault();
      onAction?.(e as unknown as React.MouseEvent<HTMLElement>);
    }
  };

  const eventProps =
    isMobile || isTablet
      ? {
          onTouchEnd: (e: React.TouchEvent<HTMLElement>) => onAction?.(e),
          onClick: (e: React.MouseEvent<HTMLElement>) => onAction?.(e),
          onKeyDown: handleKeyDown,
        }
      : {
          onClick: (e: React.MouseEvent<HTMLElement>) => onAction?.(e),
          onKeyDown: handleKeyDown,
        };

  const content = (
    <IconButton
      {...eventProps}
      id={id}
      role="button"
      tabIndex={disabled ? -1 : 0}
      noMargin={noMargin}
      noPadding={noPadding}
      bigIcon={bigIcon}
      hugeIcon={hugeIcon}
      customIconSize={customIconSize}
      forChat={forChat}
      noBackground={noBackground}
      fixedBackground={fixedBackground}
      customBackgroundColor={customBackgroundColor}
      customColor={customColor}
      hoverAllowed={hoverAllowed}
      rounded={rounded}
      disabled={disabled}
      isActive={isActive}
    >
      {icon}
    </IconButton>
  );

  if (!disabled && title && placement) {
    return (
      <GeneralTooltip title={title} placement={placement} arrow={tooltipArrow}>
        {content}
      </GeneralTooltip>
    );
  }

  return content;
};

export default GeneralIconButton;
