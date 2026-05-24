import { Box } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";

export interface GeneralAvatarProps {
  size: number;
  radius: number;
  gradient: string;
  letter: string;
  label?: string;
  imageUrl?: string | null;
  onImageError?: () => void;
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
    width: size,
    height: size,
    borderRadius: radius,
    background: hasImage ? neutralBg : gradient,
    border: `1px solid ${theme.palette.divider}`,
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: Math.round(size * 0.5),
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
      {!hasImage && letter}
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
