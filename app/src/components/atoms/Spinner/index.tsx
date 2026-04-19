import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const SIZES = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-6 w-6",
} as const;

export function Spinner({ className, size = "md", label }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn("animate-spin text-muted-foreground", SIZES[size], className)}
    />
  );
}
