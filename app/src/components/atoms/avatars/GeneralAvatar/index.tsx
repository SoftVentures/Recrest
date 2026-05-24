import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

export interface GeneralAvatarProps {
  size: number;
  radius: number;
  gradient: string;
  letter: string;
  label?: string;
}

interface TileProps {
  size: number;
  radius: number;
  gradient: string;
}

const Tile = styled(Box, {
  shouldForwardProp: (p) => p !== "size" && p !== "radius" && p !== "gradient",
})<TileProps>(({ size, radius, gradient }) => ({
  width: size,
  height: size,
  borderRadius: radius,
  background: gradient,
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: Math.round(size * 0.5),
  fontWeight: 700,
  letterSpacing: "-0.02em",
  flexShrink: 0,
  fontFamily: "Inter, -apple-system, sans-serif",
  textShadow: "0 1px 2px rgba(0,0,0,0.18)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
}));

function GeneralAvatar({ size, radius, gradient, letter, label }: GeneralAvatarProps) {
  return (
    <Tile size={size} radius={radius} gradient={gradient} aria-label={label}>
      {letter}
    </Tile>
  );
}

export default GeneralAvatar;
