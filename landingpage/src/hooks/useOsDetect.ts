import { useEffect, useState } from "react";

export type Os = "macos" | "windows" | "linux" | "unknown";

function detect(): Os {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "macos";
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux") || ua.includes("x11")) return "linux";
  return "unknown";
}

export function useOsDetect(): Os {
  const [os, setOs] = useState<Os>("unknown");
  useEffect(() => setOs(detect()), []);
  return os;
}

export function osLabel(os: Os): string {
  switch (os) {
    case "macos":
      return "macOS";
    case "windows":
      return "Windows";
    case "linux":
      return "Linux";
    default:
      return "your platform";
  }
}
