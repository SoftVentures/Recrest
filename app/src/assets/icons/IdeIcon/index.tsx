import { type CSSProperties, type FC, type SVGProps } from "react";

import { siCursor } from "simple-icons";

import IntellijIdeaLogo from "@/assets/icons/ides/intellij-idea.svg?react";
import JetbrainsLogo from "@/assets/icons/ides/jetbrains.svg?react";
import VSCodeLogo from "@/assets/icons/ides/visual-studio-code.svg?react";
import WebstormLogo from "@/assets/icons/ides/webstorm.svg?react";
import { IDE_UI, type IdeId, type IdeLogoSlug } from "@/lib/constants/ides.constants";
import { pxToRem } from "@/theme/scale";

/**
 * Official IDE logos inlined as React SVG components (via vite-plugin-svgr).
 * No runtime CDN fetch — required for Tauri's strict CSP. Cursor stays inline
 * from `simple-icons`. VS Code Insiders reuses the VS Code mark with a
 * hue-rotate filter (their visual differentiation in marketing material) —
 * the filter degree comes from `IDE_UI`.
 */
const LOGO_COMPONENTS: Partial<Record<IdeLogoSlug, FC<SVGProps<SVGSVGElement>>>> = {
  vscode: VSCodeLogo,
  webstorm: WebstormLogo,
  intellij: IntellijIdeaLogo,
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

function IdeIcon({ id, size = 16, color = "brand", title, style }: IdeIconProps) {
  const mono = color === "currentColor";
  const ui = IDE_UI[id];

  if (ui.logo === "cursor") {
    const fill = mono ? "currentColor" : `#${siCursor.hex}`;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={pxToRem(size)}
        height={pxToRem(size)}
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

  const LogoComponent = LOGO_COMPONENTS[ui.logo];
  if (!LogoComponent) return null;

  const filterParts: string[] = [];
  if (mono) filterParts.push("grayscale(1)");
  if (ui.filterHue !== null) filterParts.push(`hue-rotate(${ui.filterHue}deg)`, "saturate(0.9)");

  const iconStyle: CSSProperties = {
    flexShrink: 0,
    ...(filterParts.length > 0 ? { filter: filterParts.join(" ") } : null),
    ...(mono ? { opacity: 0.55 } : null),
    ...style,
  };

  return (
    <LogoComponent
      width={pxToRem(size)}
      height={pxToRem(size)}
      role="img"
      aria-label={title ?? id}
      style={iconStyle}
    />
  );
}

export default IdeIcon;
