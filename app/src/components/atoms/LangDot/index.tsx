import { langMeta } from "@/lib/languages";

interface LangDotProps {
  lang: string | null | undefined;
}

/** Colored 8px dot for a language identifier. Accepts either a file
 *  extension ("rs") or a canonical linguist name ("Rust"). */
export function LangDot({ lang }: LangDotProps) {
  const meta = langMeta(lang);
  return <span className="lang-dot" style={{ background: meta.color }} title={meta.label} />;
}
