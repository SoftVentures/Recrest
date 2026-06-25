import { useTheme } from "@mui/material/styles";

/**
 * Recrest's empty-state mascot. A rounded-square character echoing the app
 * icon, with the double-chevron logo as a head-crest and a handful of poses
 * that match the semantic of each empty state (snoozing = nothing to do,
 * celebrating = success, searching = filter has no hits, waving = onboarding,
 * shrugging = generic empty).
 *
 * Stroke inherits `currentColor` so callers control the ink via CSS `color`.
 * Accent colours are pulled from the MUI theme so dark/light tint the
 * crest + cheeks consistently with the rest of the UI.
 */
export type MascotVariant = "snoozing" | "celebrating" | "searching" | "waving" | "shrugging";

interface MascotProps {
  variant?: MascotVariant;
  size?: number;
  className?: string;
  title?: string;
}

interface MascotPalette {
  accent: string;
  accentWeak: string;
  accentInk: string;
  surface: string;
}

function Mascot({ variant = "shrugging", size = 112, className, title }: MascotProps) {
  const theme = useTheme();
  const palette: MascotPalette = {
    accent: theme.palette.primary.main,
    accentWeak: `color-mix(in srgb, ${theme.palette.primary.main} 16%, transparent)`,
    accentInk: theme.palette.primary.dark,
    surface: theme.palette.surface.interface.base,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <MascotBody palette={palette} />
      <MascotCrest palette={palette} />
      <MascotFace variant={variant} palette={palette} />
      <MascotArms variant={variant} palette={palette} />
      <MascotDecor variant={variant} palette={palette} />
    </svg>
  );
}

function MascotBody({ palette }: { palette: MascotPalette }) {
  return (
    <>
      <ellipse cx="64" cy="114" rx="30" ry="4" fill="currentColor" opacity="0.08" stroke="none" />
      <rect
        x="28"
        y="30"
        width="72"
        height="78"
        rx="24"
        fill={palette.accentWeak}
        strokeWidth="3"
      />
      <path
        d="M 36 82 Q 64 88 92 82"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1.5"
        fill="none"
      />
    </>
  );
}

function MascotCrest({ palette }: { palette: MascotPalette }) {
  return (
    <g
      stroke={palette.accentInk}
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <path d="M 48 22 L 64 10 L 80 22" />
      <path d="M 48 30 L 64 18 L 80 30" opacity="0.55" />
    </g>
  );
}

function MascotFace({ variant, palette }: { variant: MascotVariant; palette: MascotPalette }) {
  switch (variant) {
    case "snoozing":
      return (
        <g stroke="currentColor" strokeWidth="3">
          <path d="M 44 54 Q 50 60 56 54" fill="none" />
          <path d="M 72 54 Q 78 60 84 54" fill="none" />
          <path d="M 58 74 Q 64 77 70 74" fill="none" strokeLinecap="round" />
        </g>
      );
    case "celebrating":
      return (
        <g stroke="currentColor" strokeWidth="3" fill="none">
          <path d="M 44 56 L 56 50" />
          <path d="M 72 50 L 84 56" />
          <path d="M 52 68 Q 64 82 76 68" fill={palette.accent} strokeLinejoin="round" />
        </g>
      );
    case "searching":
      return (
        <g>
          <circle cx="50" cy="54" r="3.5" fill="currentColor" stroke="none" />
          <circle cx="78" cy="54" r="3.5" fill="currentColor" stroke="none" />
          <path d="M 54 72 Q 64 78 74 72" stroke="currentColor" strokeWidth="3" fill="none" />
        </g>
      );
    case "waving":
      return (
        <g>
          <circle cx="50" cy="54" r="3.5" fill="currentColor" stroke="none" />
          <circle cx="78" cy="54" r="3.5" fill="currentColor" stroke="none" />
          <path d="M 54 70 Q 64 80 74 70 Q 64 76 54 70 Z" fill="currentColor" stroke="none" />
          <circle cx="44" cy="66" r="3" fill={palette.accent} opacity="0.45" stroke="none" />
          <circle cx="84" cy="66" r="3" fill={palette.accent} opacity="0.45" stroke="none" />
        </g>
      );
    case "shrugging":
    default:
      return (
        <g>
          <circle cx="50" cy="54" r="3.5" fill="currentColor" stroke="none" />
          <circle cx="78" cy="54" r="3.5" fill="currentColor" stroke="none" />
          <path d="M 56 74 L 72 74" stroke="currentColor" strokeWidth="3" fill="none" />
        </g>
      );
  }
}

function MascotArms({ variant, palette }: { variant: MascotVariant; palette: MascotPalette }) {
  const armFill = palette.accentWeak;

  switch (variant) {
    case "snoozing":
      return (
        <g>
          <path
            d="M 30 78 Q 40 86 62 84"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 98 78 Q 88 86 66 84"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );
    case "celebrating":
      return (
        <g>
          <path
            d="M 30 60 Q 18 38 20 22"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 98 60 Q 110 38 108 22"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="20" cy="20" r="5.5" stroke="currentColor" strokeWidth="4" fill={armFill} />
          <circle cx="108" cy="20" r="5.5" stroke="currentColor" strokeWidth="4" fill={armFill} />
        </g>
      );
    case "searching":
      return (
        <g>
          <path
            d="M 30 68 Q 24 80 32 92"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 98 66 L 112 58"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <circle
            cx="118"
            cy="50"
            r="8"
            fill={palette.surface}
            stroke="currentColor"
            strokeWidth="3"
          />
          <path d="M 113 56 L 107 62" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M 115 47 Q 117 45 120 47"
            stroke={palette.accent}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            opacity="0.8"
          />
        </g>
      );
    case "waving":
      return (
        <g>
          <path
            d="M 30 70 Q 22 82 28 94"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 98 58 Q 112 44 112 26"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="112" cy="24" r="5" stroke="currentColor" strokeWidth="4" fill={armFill} />
        </g>
      );
    case "shrugging":
    default:
      return (
        <g>
          <path
            d="M 30 64 Q 14 64 12 48"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 98 64 Q 114 64 116 48"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="12" cy="46" r="4.5" stroke="currentColor" strokeWidth="4" fill={armFill} />
          <circle cx="116" cy="46" r="4.5" stroke="currentColor" strokeWidth="4" fill={armFill} />
        </g>
      );
  }
}

function MascotDecor({ variant, palette }: { variant: MascotVariant; palette: MascotPalette }) {
  switch (variant) {
    case "snoozing":
      return (
        <g
          fill="none"
          stroke={palette.accentInk}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        >
          <path d="M 96 26 L 106 26 L 96 36 L 106 36" />
          <path d="M 110 14 L 118 14 L 110 22 L 118 22" opacity="0.7" />
        </g>
      );
    case "celebrating":
      return (
        <g stroke={palette.accent} strokeWidth="2.5" strokeLinecap="round">
          <path d="M 8 40 L 14 40 M 11 37 L 11 43" />
          <path d="M 116 70 L 122 70 M 119 67 L 119 73" />
          <circle cx="18" cy="70" r="2" fill={palette.accent} stroke="none" />
          <circle cx="110" cy="38" r="2" fill={palette.accent} stroke="none" />
        </g>
      );
    case "searching":
      return (
        <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" fill="none">
          <path d="M 18 26 Q 20 20 26 22 Q 30 24 26 28" />
          <circle cx="26" cy="34" r="1.5" fill="currentColor" stroke="none" />
        </g>
      );
    case "waving":
      return (
        <g
          stroke={palette.accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        >
          <path d="M 120 20 L 124 16" />
          <path d="M 118 32 L 122 32" />
        </g>
      );
    case "shrugging":
    default:
      return null;
  }
}

export default Mascot;
