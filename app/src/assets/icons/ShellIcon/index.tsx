import { type CSSProperties, type FC, type SVGProps } from "react";

import type { ShellId } from "@recrest/shared";

import { Terminal as LucideTerminal } from "lucide-react";
import { siFishshell, siGitforwindows, siGnubash, siNushell, siZsh } from "simple-icons";

import CmdLogo from "@/assets/icons/shells/cmd.svg?react";
import PowershellCoreLogo from "@/assets/icons/shells/powershell-core.svg?react";
import WindowsPowershellLogo from "@/assets/icons/shells/windows-powershell.svg?react";
import WslLogo from "@/assets/icons/shells/wsl.svg?react";
import { pxToRem } from "@/theme/scale";

/**
 * Brand marks for every shell Recrest knows about. Same shape as
 * `TerminalIcon`: vendored `.svg?react` for Microsoft / WSL marks
 * (no simple-icons entry), `simple-icons` for everything else, Lucide
 * terminal glyph as last-resort fallback for obscure shells.
 */

type SimpleIcon = { hex: string; path: string; title: string };

const SI_MARK: Partial<Record<ShellId, SimpleIcon>> = {
  zsh: siZsh as SimpleIcon,
  bash: siGnubash as SimpleIcon,
  fish: siFishshell as SimpleIcon,
  nu: siNushell as SimpleIcon,
  "git-bash": siGitforwindows as SimpleIcon,
};

const VENDOR_LOGO: Partial<Record<ShellId, FC<SVGProps<SVGSVGElement>>>> = {
  "powershell-core": PowershellCoreLogo,
  "windows-powershell": WindowsPowershellLogo,
  cmd: CmdLogo,
  wsl: WslLogo,
};

interface ShellIconProps {
  id: ShellId;
  size?: number;
  color?: "brand" | "currentColor";
  title?: string;
  style?: CSSProperties;
}

function ShellIcon({ id, size = 16, color = "brand", title, style }: ShellIconProps) {
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
        width={pxToRem(size)}
        height={pxToRem(size)}
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
        width={pxToRem(size)}
        height={pxToRem(size)}
        viewBox="0 0 24 24"
        role="img"
        aria-label={title ?? si.title}
        style={baseStyle}
      >
        <path d={si.path} fill={fill} />
      </svg>
    );
  }

  return <LucideTerminal size={pxToRem(size)} aria-label={title ?? id} style={baseStyle} />;
}

export default ShellIcon;
