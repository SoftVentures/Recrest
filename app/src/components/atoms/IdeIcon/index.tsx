import { type CSSProperties, type FC, type SVGProps } from "react";

import { siCursor } from "simple-icons";

import type { IdeId } from "@recrest/shared";

import IntellijIdeaLogo from "@/components/atoms/IdeIcon/logos/intellij-idea.svg?react";
import JetbrainsLogo from "@/components/atoms/IdeIcon/logos/jetbrains.svg?react";
import VSCodeLogo from "@/components/atoms/IdeIcon/logos/visual-studio-code.svg?react";
import WebstormLogo from "@/components/atoms/IdeIcon/logos/webstorm.svg?react";
import { cn } from "@/lib/utils";

/**
 * Official IDE logos inlined from the Iconify `logos` set (committed as
 * static SVGs in `./logos/`). Imported via `vite-plugin-svgr`'s `?react`
 * suffix so they become real React components at build time — no runtime
 * fetch to any CDN, which is what Tauri's strict CSP requires.
 * Cursor stays inline from `simple-icons` (the `logos` set doesn't ship it).
 * VS Code Insiders reuses the VS Code mark with a hue-rotate filter.
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
  /** `"brand"` (default) = official colours; `"currentColor"` = greyed out
   *  (used for disabled items in the dropdown). */
  color?: "brand" | "currentColor";
  title?: string;
  style?: CSSProperties;
  className?: string;
}

export function IdeIcon({ id, size = 16, color = "brand", title, style, className }: IdeIconProps) {
  const mono = color === "currentColor";

  if (id === "cursor") {
    return (
      <CursorGlyph size={size} mono={mono} title={title} style={style} className={className} />
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
      className={className}
      style={iconStyle}
    />
  );
}

/** Cursor logo from simple-icons — Iconify's logos set doesn't cover the IDE yet. */
function CursorGlyph({
  size,
  mono,
  title,
  style,
  className,
}: {
  size: number;
  mono: boolean;
  title?: string;
  style?: CSSProperties;
  className?: string;
}) {
  const fill = mono ? "currentColor" : `#${siCursor.hex}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title ?? siCursor.title}
      className={cn("shrink-0", mono ? "opacity-[0.55]" : "opacity-100", className)}
      style={style}
    >
      <path d={siCursor.path} fill={fill} />
    </svg>
  );
}
