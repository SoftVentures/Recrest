import { type CSSProperties, type FC, type SVGProps } from "react";

import type { IdeId } from "@recrest/shared";

import { siCursor } from "simple-icons";

import IntellijIdeaLogo from "@/components/atoms/icons/IdeIcon/logos/intellij-idea.svg?react";
import JetbrainsLogo from "@/components/atoms/icons/IdeIcon/logos/jetbrains.svg?react";
import VSCodeLogo from "@/components/atoms/icons/IdeIcon/logos/visual-studio-code.svg?react";
import WebstormLogo from "@/components/atoms/icons/IdeIcon/logos/webstorm.svg?react";

/**
 * Official IDE logos inlined as React SVG components (via vite-plugin-svgr).
 * No runtime CDN fetch — required for Tauri's strict CSP. Cursor stays inline
 * from `simple-icons`. VS Code Insiders reuses the VS Code mark with a
 * hue-rotate filter (their visual differentiation in marketing material).
 */
const LOGO_COMPONENT: Partial<Record<IdeId, FC<SVGProps<SVGSVGElement>>>> = {
  vscode: VSCodeLogo,
  "vscode-insiders": VSCodeLogo,
  webstorm: WebstormLogo,
  idea: IntellijIdeaLogo,
  "jetbrains-toolbox": JetbrainsLogo,
};

interface IdeIconProps {
  id: IdeId;
  size?: number;
  /** `"brand"` keeps official colours, `"currentColor"` greys out for disabled rows. */
  color?: "brand" | "currentColor";
  title?: string;
  style?: CSSProperties;
}

function GeneralIdeIcon({ id, size = 16, color = "brand", title, style }: IdeIconProps) {
  const mono = color === "currentColor";

  if (id === "cursor") {
    const fill = mono ? "currentColor" : `#${siCursor.hex}`;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="img"
        aria-label={title ?? siCursor.title}
        style={{
          flexShrink: 0,
          opacity: mono ? 0.55 : 1,
          ...style,
        }}
      >
        <path d={siCursor.path} fill={fill} />
      </svg>
    );
  }

  const LogoComponent = LOGO_COMPONENT[id];
  if (!LogoComponent) return null;

  const filterParts: string[] = [];
  if (mono) filterParts.push("grayscale(1)");
  if (id === "vscode-insiders") filterParts.push("hue-rotate(140deg)", "saturate(0.9)");

  const iconStyle: CSSProperties = {
    flexShrink: 0,
    ...(filterParts.length > 0 ? { filter: filterParts.join(" ") } : null),
    ...(mono ? { opacity: 0.55 } : null),
    ...style,
  };

  return (
    <LogoComponent
      width={size}
      height={size}
      role="img"
      aria-label={title ?? id}
      style={iconStyle}
    />
  );
}

export default GeneralIdeIcon;
