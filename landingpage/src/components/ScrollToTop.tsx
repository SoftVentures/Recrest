import { useTranslation } from "react-i18next";

import { useScrolledNav } from "../hooks/useScrolledNav";
import { BrandMark } from "./icons";

// Floating brand-mark button that appears once the visitor scrolls past the
// fold and smooth-scrolls back to the top. Hidden (and non-interactive) near
// the top so it never overlaps the hero.
export function ScrollToTop() {
  const { t } = useTranslation();
  const visible = useScrolledNav(600);

  const toTop = () => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      className={`scroll-top${visible ? " visible" : ""}`}
      aria-label={t("a11y.scrollToTop")}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={toTop}
    >
      <BrandMark />
    </button>
  );
}
