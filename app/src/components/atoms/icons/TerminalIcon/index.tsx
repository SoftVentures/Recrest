import { type CSSProperties, type FC, type SVGProps } from "react";

import type { TerminalId } from "@recrest/shared";

import { Terminal as LucideTerminal } from "lucide-react";
import {
  siAlacritty,
  siGhostty,
  siGnometerminal,
  siHyper,
  siIterm2,
  siWarp,
  siWezterm,
} from "simple-icons";

import AppleTerminalLogo from "@/components/atoms/icons/TerminalIcon/logos/apple-terminal.svg?react";
import CmdLogo from "@/components/atoms/icons/TerminalIcon/logos/cmd.svg?react";
import KittyLogo from "@/components/atoms/icons/TerminalIcon/logos/kitty.svg?react";
import KonsoleLogo from "@/components/atoms/icons/TerminalIcon/logos/konsole.svg?react";
import PowershellLogo from "@/components/atoms/icons/TerminalIcon/logos/powershell.svg?react";
import TilixLogo from "@/components/atoms/icons/TerminalIcon/logos/tilix.svg?react";
import WindowsTerminalLogo from "@/components/atoms/icons/TerminalIcon/logos/windows-terminal.svg?react";
import XtermLogo from "@/components/atoms/icons/TerminalIcon/logos/xterm.svg?react";

/**
 * Brand marks for every terminal emulator Recrest knows about. Mirrors the
 * `GeneralIdeIcon` pattern: vendored `.svg?react` assets for marks not in
 * simple-icons (Microsoft products, kitty, KDE, etc.), `simple-icons` for the
 * rest. Falls back to a generic Lucide terminal glyph for anything obscure
 * we haven't authored an asset for yet — this should never actually fire
 * given the current `TERMINAL_IDS` set, but it keeps the component honest.
 */

type SimpleIcon = { hex: string; path: string; title: string };

const SI_MARK: Partial<Record<TerminalId, SimpleIcon>> = {
  iterm2: siIterm2 as SimpleIcon,
  warp: siWarp as SimpleIcon,
  wezterm: siWezterm as SimpleIcon,
  alacritty: siAlacritty as SimpleIcon,
  hyper: siHyper as SimpleIcon,
  ghostty: siGhostty as SimpleIcon,
  "gnome-terminal": siGnometerminal as SimpleIcon,
};

const VENDOR_LOGO: Partial<Record<TerminalId, FC<SVGProps<SVGSVGElement>>>> = {
  "apple-terminal": AppleTerminalLogo,
  "windows-terminal": WindowsTerminalLogo,
  powershell: PowershellLogo,
  cmd: CmdLogo,
  kitty: KittyLogo,
  konsole: KonsoleLogo,
  xterm: XtermLogo,
  tilix: TilixLogo,
};

interface TerminalIconProps {
  id: TerminalId;
  size?: number;
  /** `"brand"` keeps official colours, `"currentColor"` greys for disabled rows. */
  color?: "brand" | "currentColor";
  title?: string;
  style?: CSSProperties;
}

function GeneralTerminalIcon({ id, size = 16, color = "brand", title, style }: TerminalIconProps) {
  const mono = color === "currentColor";
  const baseStyle: CSSProperties = {
    flexShrink: 0,
    ...(mono ? { opacity: 0.55 } : null),
    ...style,
  };

  const VendorLogo = VENDOR_LOGO[id];
  if (VendorLogo) {
    return (
      <VendorLogo
        width={size}
        height={size}
        role="img"
        aria-label={title ?? id}
        style={{
          ...baseStyle,
          ...(mono ? { filter: "grayscale(1)" } : null),
        }}
      />
    );
  }

  const si = SI_MARK[id];
  if (si) {
    const fill = mono ? "currentColor" : `#${si.hex}`;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="img"
        aria-label={title ?? si.title}
        style={baseStyle}
      >
        <path d={si.path} fill={fill} />
      </svg>
    );
  }

  return <LucideTerminal size={size} aria-label={title ?? id} style={baseStyle} />;
}

export default GeneralTerminalIcon;
