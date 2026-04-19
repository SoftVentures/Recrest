import { useEffect, useState } from "react";

type Options = {
  ids: string[];
  intervalMs?: number;
  initial?: string;
  paused?: boolean;
};

export function useRotatingSelection({
  ids,
  intervalMs = 6000,
  initial,
  paused = false,
}: Options): [string, (id: string) => void] {
  const first = initial ?? ids[0] ?? "";
  const [selected, setSelected] = useState(first);

  useEffect(() => {
    if (paused || ids.length < 2) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setSelected((current) => {
        const idx = ids.indexOf(current);
        return ids[(idx + 1) % ids.length] ?? ids[0]!;
      });
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [ids, intervalMs, paused]);

  return [selected, setSelected];
}
