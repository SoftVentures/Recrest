import { Chip, type ChipProps } from "@mui/material";
import { styled } from "@mui/material/styles";

export type GeneralBadgeTone = "default" | "green" | "amber" | "red" | "blue" | "purple";

export interface GeneralBadgeProps extends Omit<ChipProps, "color"> {
  tone?: GeneralBadgeTone;
}

interface ToneProp {
  tone?: GeneralBadgeTone;
}

const StyledChip = styled(Chip, { shouldForwardProp: (p) => p !== "tone" })<ToneProp>(({
  theme,
  tone = "default",
}) => {
  const palette = theme.palette;
  let bg: string;
  let color: string;
  switch (tone) {
    case "green":
      bg = palette.success.light;
      color = palette.success.dark;
      break;
    case "amber":
      bg = palette.warning.light;
      color = palette.warning.dark;
      break;
    case "red":
      bg = palette.error.light;
      color = palette.error.dark;
      break;
    case "blue":
      bg = palette.info.light;
      color = palette.info.dark;
      break;
    case "purple":
      bg = palette.secondary.light;
      color = palette.secondary.dark;
      break;
    case "default":
    default:
      bg = palette.surface.interface.backElevation;
      color = palette.text.primary;
  }
  return {
    fontWeight: 500,
    backgroundColor: bg,
    color,
  };
});

function GeneralBadge({ tone = "default", size = "small", ...rest }: GeneralBadgeProps) {
  return <StyledChip tone={tone} size={size} {...rest} />;
}

export default GeneralBadge;
