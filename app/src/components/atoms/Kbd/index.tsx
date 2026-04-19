import type { ReactNode } from "react";

interface KbdProps {
  children: ReactNode;
}

/** Inline keyboard-key rendering (`<kbd>`-like visual). */
export function Kbd({ children }: KbdProps) {
  return <span className="kbd">{children}</span>;
}
