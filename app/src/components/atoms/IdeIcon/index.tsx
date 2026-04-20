import { type CSSProperties } from "react";

import { Icon } from "@iconify/react";
import { siCursor } from "simple-icons";

import type { IdeId } from "@recrest/shared";

/**
 * Official IDE logos pulled from `@iconify-json/logos` (Iconify's curated
 * brand collection). For VS Code Insiders there is no dedicated icon — we
 * re-use the VS Code logo with a hue-rotate filter to approximate the
 * characteristic Insiders teal. Cursor is rendered inline via
 * `simple-icons` because Iconify's logos set doesn't ship that entry yet.
 */
const ICONIFY: Partial<Record<IdeId, string>> = {
  vscode: "logos:visual-studio-code",
  "vscode-insiders": "logos:visual-studio-code",
  webstorm: "logos:webstorm",
  idea: "logos:intellij-idea",
  "jetbrains-toolbox": "logos:jetbrains",
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

  const iconName = ICONIFY[id];
  if (!iconName) return null;

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
    <Icon
      icon={iconName}
      width={size}
      height={size}
      aria-label={title ?? id}
      style={iconStyle}
      className={className}
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
      className={className}
      style={{ flexShrink: 0, opacity: mono ? 0.55 : 1, ...style }}
    >
      <path d={siCursor.path} fill={fill} />
    </svg>
  );
}
