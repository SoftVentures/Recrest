import { type ReactNode } from "react";

import { Box } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";

import { pxToRem } from "@/theme/scale";

export interface GeneralAvatarProps {
  size: number;
  radius: number;
  gradient: string;
  letter: string;
  label?: string;
  imageUrl?: string | null;
  onImageError?: () => void;
  /** Optional icon shown instead of `letter` when no image is loaded.
   *  Used for bot/automation avatars. */
  glyph?: ReactNode;
}

interface TileProps {
  size: number;
  radius: number;
  gradient: string;
  hasImage: boolean;
  neutralBg: string;
}

const FORWARD = (p: PropertyKey) =>
  p !== "size" && p !== "radius" && p !== "gradient" && p !== "hasImage" && p !== "neutralBg";

// When an `imageUrl` is supplied the tile drops the gradient + letter
// completely — repo logos are often transparent SVGs and would otherwise sit
// on top of the coloured gradient. A neutral surface background covers the
// transparent regions without bleeding any of the gradient through.
const Tile = styled(Box, { shouldForwardProp: FORWARD })<TileProps>(
  ({ theme, size, radius, gradient, hasImage, neutralBg }) => ({
    position: "relative",
    width: pxToRem(size),
    height: pxToRem(size),
    // A radius derived from a scaled dimension is a layout dimension, not a
    // decorative constant: `AuthorAvatar` passes `size / 2` to get a circle,
    // so leaving this in px turns every avatar into a squircle above scale 1.
    borderRadius: pxToRem(radius),
    background: hasImage ? neutralBg : gradient,
    border: `1px solid ${theme.palette.divider}`,
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    // `pxToRem`, not `fontPxToRem`: the initial is derived from `size`, so it
    // has to ride the same scale as the square it sits in. `--text-scale`
    // would push it 31 % past a box that cannot grow with it.
    fontSize: pxToRem(Math.round(size * 0.5)),
    fontWeight: 700,
    letterSpacing: "-0.02em",
    flexShrink: 0,
    fontFamily: "Inter, -apple-system, sans-serif",
    textShadow: hasImage ? "none" : "0 1px 2px rgba(0,0,0,0.18)",
    boxShadow: hasImage ? "none" : "inset 0 1px 0 rgba(255,255,255,0.12)",
    overflow: "hidden",
  }),
);

const Image = styled(Box)({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
}) as typeof Box;

function GeneralAvatar({
  size,
  radius,
  gradient,
  letter,
  label,
  imageUrl,
  onImageError,
  glyph,
}: GeneralAvatarProps) {
  const theme = useTheme();
  const hasImage = Boolean(imageUrl);
  return (
    <Tile
      size={size}
      radius={radius}
      gradient={gradient}
      hasImage={hasImage}
      neutralBg={theme.palette.surface.interface.base}
      aria-label={label}
    >
      {!hasImage && (glyph ?? letter)}
      {imageUrl && (
        <Image
          component="img"
          src={imageUrl}
          alt=""
          aria-hidden
          loading="lazy"
          onError={onImageError}
        />
      )}
    </Tile>
  );
}

export default GeneralAvatar;
